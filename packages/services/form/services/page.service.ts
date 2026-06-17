// packages/services/form/services/page.service.ts
import { and, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@repo/database";
import { logger } from "@repo/logger";
import { formsTable, formPagesTable } from "@repo/database/schema";
import { MAX_PAGES_PER_FORM } from "../utils";
import type { CreatePageInput, UpdatePageInput } from "../model";

export class PageService {
  async createPage(userId: string, input: CreatePageInput) {
    const [form] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, input.formId))
      .limit(1);
    if (!form || form.userId !== userId)
      throw new TRPCError({ code: "FORBIDDEN" });

    const [count] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(formPagesTable)
      .where(eq(formPagesTable.formId, input.formId));
    if (count && count.count >= MAX_PAGES_PER_FORM)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `Maximum of ${MAX_PAGES_PER_FORM} pages allowed per form.`,
      });

    let position = input.position;
    if (position === undefined) {
      const [max] = await db
        .select({
          max: sql<number>`COALESCE(MAX(position), -1)::int`,
        })
        .from(formPagesTable)
        .where(eq(formPagesTable.formId, input.formId));
      position = (max?.max ?? -1) + 1;
    }

    const [page] = await db
      .insert(formPagesTable)
      .values({
        formId: input.formId,
        title: input.title?.trim() || `Page ${position + 1}`,
        description: input.description?.trim() || null,
        position,
      })
      .returning();

    logger.info("Page created", {
      pageId: page!.id,
      formId: input.formId,
      userId,
    });
    return { page: page!, message: "Page created successfully." };
  }

  async updatePage(userId: string, input: UpdatePageInput) {
    const [row] = await db
      .select({ page: formPagesTable, form: formsTable })
      .from(formPagesTable)
      .innerJoin(formsTable, eq(formPagesTable.formId, formsTable.id))
      .where(eq(formPagesTable.id, input.pageId))
      .limit(1);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Page not found." });
    if (row.form.userId !== userId)
      throw new TRPCError({ code: "FORBIDDEN" });

    const updateData: Partial<typeof formPagesTable.$inferInsert> = {};
    if (input.title !== undefined) updateData.title = input.title?.trim() || null;
    if (input.description !== undefined) updateData.description = input.description?.trim() || null;
    if (input.position !== undefined) updateData.position = input.position;
    if (input.conditionalLogic !== undefined) updateData.conditionalLogic = input.conditionalLogic;

    if (Object.keys(updateData).length === 0) {
      return { page: row.page, message: "No changes to update." };
    }

    const [updated] = await db
      .update(formPagesTable)
      .set(updateData)
      .where(eq(formPagesTable.id, input.pageId))
      .returning();

    logger.info("Page updated", { pageId: input.pageId, userId });
    return { page: updated!, message: "Page updated successfully." };
  }

  async deletePage(userId: string, pageId: string) {
    const [row] = await db
      .select({ page: formPagesTable, form: formsTable })
      .from(formPagesTable)
      .innerJoin(formsTable, eq(formPagesTable.formId, formsTable.id))
      .where(eq(formPagesTable.id, pageId))
      .limit(1);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Page not found." });
    if (row.form.userId !== userId)
      throw new TRPCError({ code: "FORBIDDEN" });

    const [count] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(formPagesTable)
      .where(eq(formPagesTable.formId, row.form.id));
    if (count && count.count <= 1) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Cannot delete the only page in a form.",
      });
    }

    await db.delete(formPagesTable).where(eq(formPagesTable.id, pageId));
    logger.info("Page deleted", { pageId, formId: row.form.id, userId });
    return { message: "Page deleted successfully." };
  }

  async reorderPages(userId: string, formId: string, pageIds: string[]) {
    const [form] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, formId))
      .limit(1);
    if (!form || form.userId !== userId)
      throw new TRPCError({ code: "FORBIDDEN" });

    await db.transaction(async (tx) => {
      for (let i = 0; i < pageIds.length; i++) {
        await tx
          .update(formPagesTable)
          .set({ position: i })
          .where(
            and(
              eq(formPagesTable.id, pageIds[i]!),
              eq(formPagesTable.formId, formId),
            ),
          );
      }
    });

    logger.info("Pages reordered", { formId, userId });
    return { message: "Pages reordered successfully." };
  }
}