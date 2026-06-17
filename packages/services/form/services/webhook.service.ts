// packages/services/form/services/webhook.service.ts
import { and, eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@repo/database";
import { logger } from "@repo/logger";
import {
  formsTable,
  formWebhooksTable,
  webhookLogsTable,
  type WebhookEvent,
} from "@repo/database/schema";
import { WEBHOOK_TIMEOUT_MS } from "../utils";
import type { CreateWebhookInput, UpdateWebhookInput } from "../model";

export class WebhookService {
  private validateFormAccess(
    form: { userId: string } | undefined,
    userId: string,
  ): asserts form is { userId: string } {
    if (!form) throw new TRPCError({ code: "NOT_FOUND" });
    if (form.userId !== userId)
      throw new TRPCError({ code: "FORBIDDEN" });
  }

  async createWebhook(userId: string, input: CreateWebhookInput) {
    const [form] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, input.formId))
      .limit(1);
    this.validateFormAccess(form, userId);

    const [webhook] = await db
      .insert(formWebhooksTable)
      .values({
        formId: input.formId,
        name: input.name,
        url: input.url,
        secret: input.secret || null,
        events: input.events || ["RESPONSE_SUBMITTED"],
        headers: input.headers || null,
      })
      .returning();

    return { webhook: webhook!, message: "Webhook created successfully." };
  }

  async testWebhook(userId: string, webhookId: string) {
    const [webhook] = await db
      .select({
        webhook: formWebhooksTable,
        formUserId: formsTable.userId,
      })
      .from(formWebhooksTable)
      .innerJoin(formsTable, eq(formWebhooksTable.formId, formsTable.id))
      .where(eq(formWebhooksTable.id, webhookId))
      .limit(1);

    if (!webhook)
      throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found." });
    this.validateFormAccess({ userId: webhook.formUserId }, userId);

    await this.dispatchWebhook(webhook.webhook, "test", {
      test: true,
      webhookId,
    });
    return { success: true };
  }

  async listWebhooks(userId: string, formId: string) {
    const [form] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, formId))
      .limit(1);
    this.validateFormAccess(form, userId);

    const webhooks = await db
      .select()
      .from(formWebhooksTable)
      .where(eq(formWebhooksTable.formId, formId));
    return { webhooks };
  }

  async updateWebhook(userId: string, input: UpdateWebhookInput) {
    const [webhook] = await db
      .select({
        webhook: formWebhooksTable,
        form: formsTable,
      })
      .from(formWebhooksTable)
      .innerJoin(formsTable, eq(formWebhooksTable.formId, formsTable.id))
      .where(eq(formWebhooksTable.id, input.webhookId))
      .limit(1);
    if (!webhook)
      throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found." });
    this.validateFormAccess(webhook.form, userId);

    const updateData: Partial<typeof formWebhooksTable.$inferInsert> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.url !== undefined) updateData.url = input.url;
    if (input.secret !== undefined) updateData.secret = input.secret || null;
    if (input.events !== undefined)
      updateData.events = input.events as WebhookEvent[];
    if (input.headers !== undefined) updateData.headers = input.headers;
    if (input.enabled !== undefined) updateData.enabled = input.enabled;

    if (Object.keys(updateData).length === 0) {
      return { webhook: webhook.webhook, message: "No changes to update." };
    }

    const [updated] = await db
      .update(formWebhooksTable)
      .set(updateData)
      .where(eq(formWebhooksTable.id, input.webhookId))
      .returning();

    return { webhook: updated!, message: "Webhook updated successfully." };
  }

  async deleteWebhook(userId: string, webhookId: string) {
    const [webhook] = await db
      .select({
        webhook: formWebhooksTable,
        form: formsTable,
      })
      .from(formWebhooksTable)
      .innerJoin(formsTable, eq(formWebhooksTable.formId, formsTable.id))
      .where(eq(formWebhooksTable.id, webhookId))
      .limit(1);
    if (!webhook)
      throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found." });
    this.validateFormAccess(webhook.form, userId);

    await db.delete(formWebhooksTable).where(eq(formWebhooksTable.id, webhookId));
    return { message: "Webhook deleted successfully." };
  }

  async getWebhookLogs(
    userId: string,
    options: { webhookId: string; limit?: number; offset?: number },
  ) {
    const [webhook] = await db
      .select({
        webhook: formWebhooksTable,
        form: formsTable,
      })
      .from(formWebhooksTable)
      .innerJoin(formsTable, eq(formWebhooksTable.formId, formsTable.id))
      .where(eq(formWebhooksTable.id, options.webhookId))
      .limit(1);
    if (!webhook)
      throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found." });
    this.validateFormAccess(webhook.form, userId);

    const logs = await db
      .select()
      .from(webhookLogsTable)
      .where(eq(webhookLogsTable.webhookId, options.webhookId))
      .orderBy(desc(webhookLogsTable.createdAt))
      .limit(options.limit ?? 20)
      .offset(options.offset ?? 0);

    return { logs };
  }

  async triggerWebhooks(
    formId: string,
    event: string,
    payload: Record<string, unknown>,
  ) {
    try {
      const webhooks = await db
        .select()
        .from(formWebhooksTable)
        .where(
          and(
            eq(formWebhooksTable.formId, formId),
            eq(formWebhooksTable.enabled, true),
          ),
        );

      const relevant = webhooks.filter((w) =>
        (w.events ?? []).includes(event as WebhookEvent),
      );

      await Promise.allSettled(
        relevant.map((webhook) =>
          this.dispatchWebhook(webhook, event, payload),
        ),
      );
    } catch (error) {
      logger.error("Webhook trigger failed", { error, formId, event });
    }
  }

  private async dispatchWebhook(
    webhook: typeof formWebhooksTable.$inferSelect,
    event: string,
    payload: Record<string, unknown>,
  ) {
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        WEBHOOK_TIMEOUT_MS,
      );

      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...((webhook.headers as Record<string, string>) || {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      await db.insert(webhookLogsTable).values({
        webhookId: webhook.id,
        responseId: (payload.responseId as string) || null,
        event,
        statusCode: response.status,
        requestBody: payload,
        responseBody: await response.text().catch(() => "Unable to read body"),
        durationMs: Date.now() - start,
      });
    } catch (error) {
      await db.insert(webhookLogsTable).values({
        webhookId: webhook.id,
        responseId: (payload.responseId as string) || null,
        event,
        statusCode: null,
        requestBody: payload,
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs: Date.now() - start,
      });
    }
  }
}