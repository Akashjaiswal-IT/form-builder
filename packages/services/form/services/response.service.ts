// packages/services/form/services/response.service.ts
import { and, eq, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { env } from "../../env";
import { mailService } from "../../mail";
import { usersTable } from "@repo/database/schema";
import { db } from "@repo/database";
import { logger } from "@repo/logger";
import {
  formsTable,
  formFieldsTable,
  formResponsesTable,
  responseDataTable,
} from "@repo/database/schema";
import { formSettingsSchema } from "../model";
import { isFormAcceptingResponses } from "../utils";
import type { SubmitResponseInput } from "../model";
import type { FormServiceDependencies } from "./types";

export class ResponseService {
  constructor(private deps: FormServiceDependencies) {}

  private validateFormAccess(
    form: { userId: string } | undefined,
    userId: string,
  ): asserts form is { userId: string } {
    if (!form)
      throw new TRPCError({ code: "NOT_FOUND", message: "Form not found." });
    if (form.userId !== userId)
      throw new TRPCError({ code: "FORBIDDEN" });
  }

  async submitResponse(
    input: SubmitResponseInput & { ipAddress?: string; userAgent?: string },
  ) {
    const [form] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, input.formId))
      .limit(1);
    if (!form)
      throw new TRPCError({ code: "NOT_FOUND", message: "Form not found." });

    const safeSettings = formSettingsSchema.parse(form.settings ?? {});

    if (!safeSettings.allowMultipleSubmissions) {
      const [existing] = await db
        .select({ id: formResponsesTable.id })
        .from(formResponsesTable)
        .where(
          and(
            eq(formResponsesTable.formId, input.formId),
            eq(formResponsesTable.status, "COMPLETED"),
            eq(formResponsesTable.ipAddress, input.ipAddress ?? ""),
          ),
        )
        .limit(1);
      if (existing)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Multiple submissions are not allowed.",
        });
    }

    const [responseCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(formResponsesTable)
      .where(
        and(
          eq(formResponsesTable.formId, input.formId),
          eq(formResponsesTable.status, "COMPLETED"),
        ),
      );

    const { accepting, reason } = isFormAcceptingResponses(
      { status: form.status, settings: safeSettings },
      responseCount?.count ?? 0,
    );
    if (!accepting)
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: reason });

    const fields = await db
      .select()
      .from(formFieldsTable)
      .where(eq(formFieldsTable.formId, input.formId));

    const response = await db.transaction(async (tx) => {
      const [res] = await tx
        .insert(formResponsesTable)
        .values({
          formId: input.formId,
          status: "COMPLETED",
          ipAddress: input.ipAddress || null,
          userAgent: input.userAgent || null,
          metadata: input.metadata || {},
        })
        .returning();

      const dataRows = Object.entries(input.data)
        .filter(([name]) => fields.some((f) => f.name === name))
        .map(([name, value]) => ({
          responseId: res!.id,
          fieldId: fields.find((f) => f.name === name)!.id,
          value,
        }));

      if (dataRows.length > 0) {
        await tx.insert(responseDataTable).values(dataRows);
      }

      return res!;
    });

    // ----- Send email notification if enabled -----
    if (safeSettings.notifyOnResponse) {
      const [formOwner] = await db
        .select({ email: usersTable.email, fullName: usersTable.fullName })
        .from(usersTable)
        .where(eq(usersTable.id, form.userId))
        .limit(1);

      if (formOwner?.email) {
        const fieldSummary = Object.entries(input.data)
          .map(([name, value]) => {
            const field = fields.find((f) => f.name === name);
            return `• ${field?.label ?? name}: ${value}`;
          })
          .join("\n");

        try {
          await mailService.sendMail({
            to: formOwner.email,
            subject: `New response for "${form.title}"`,
            text: `Hi ${formOwner.fullName},\n\nA new response was submitted for your form "${form.title}".\n\n${fieldSummary}\n\nView all responses: ${env.WEB_APP_URL}/forms/${form.id}/responses`,
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>New response for "${form.title}"</h2>
                <p>Hi ${formOwner.fullName},</p>
                <p>A new response was just submitted. Here are the details:</p>
                <ul>${Object.entries(input.data)
                  .map(([name, value]) => {
                    const field = fields.find((f) => f.name === name);
                    return `<li><strong>${field?.label ?? name}:</strong> ${value}</li>`;
                  })
                  .join("")}</ul>
                <p><a href="${env.WEB_APP_URL}/forms/${form.id}/responses">View all responses</a></p>
              </div>
            `,
          });
        } catch (error) {
          logger.error("Failed to send notification email", { error });
        }
      }
    }

    await this.deps.triggerWebhooks(form.id, "RESPONSE_SUBMITTED", {
      responseId: response.id,
      formId: form.id,
    });

    logger.info("Response submitted", {
      responseId: response.id,
      formId: form.id,
    });
    return {
      response,
      message: safeSettings.successMessage || "Thank you for your submission!",
    };
  }

  async listResponses(
    userId: string,
    options: {
      formId: string;
      status?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const [form] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, options.formId))
      .limit(1);
    this.validateFormAccess(form, userId);

    const conditions = [eq(formResponsesTable.formId, options.formId)];
    if (options.status) {
      conditions.push(
        eq(
          formResponsesTable.status,
          options.status as "IN_PROGRESS" | "COMPLETED" | "ABANDONED",
        ),
      );
    }

    const [total] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(formResponsesTable)
      .where(and(...conditions));

    const responses = await db
      .select()
      .from(formResponsesTable)
      .where(and(...conditions))
      .orderBy(desc(formResponsesTable.createdAt))
      .limit(options.limit ?? 20)
      .offset(options.offset ?? 0);

    return {
      responses,
      total: total?.count ?? 0,
    };
  }

  async getResponse(userId: string, responseId: string) {
    const [response] = await db
      .select({
        response: formResponsesTable,
        formUserId: formsTable.userId,
      })
      .from(formResponsesTable)
      .innerJoin(formsTable, eq(formResponsesTable.formId, formsTable.id))
      .where(eq(formResponsesTable.id, responseId))
      .limit(1);
    if (!response)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Response not found.",
      });
    this.validateFormAccess({ userId: response.formUserId }, userId);

    const data = await db
      .select()
      .from(responseDataTable)
      .where(eq(responseDataTable.responseId, responseId));

    return { ...response.response, data };
  }

  async deleteResponse(userId: string, responseId: string) {
    const [response] = await db
      .select({
        response: formResponsesTable,
        formUserId: formsTable.userId,
      })
      .from(formResponsesTable)
      .innerJoin(formsTable, eq(formResponsesTable.formId, formsTable.id))
      .where(eq(formResponsesTable.id, responseId))
      .limit(1);
    if (!response)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Response not found.",
      });
    this.validateFormAccess({ userId: response.formUserId }, userId);

    await db
      .delete(formResponsesTable)
      .where(eq(formResponsesTable.id, responseId));
    logger.info("Response deleted", { responseId, userId });
    return { message: "Response deleted successfully." };
  }
}