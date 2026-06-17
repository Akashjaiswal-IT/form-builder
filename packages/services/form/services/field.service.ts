// packages/services/form/services/field.service.ts
import { and, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@repo/database";
import { logger } from "@repo/logger";
import { formsTable, formPagesTable, formFieldsTable } from "@repo/database/schema";
import { MAX_FIELDS_PER_FORM, generateFieldName } from "../utils";
import type { CreateFieldInput, UpdateFieldInput, ReorderFieldsInput, FieldType } from "../model";

export class FieldService {
  async createField(userId: string, input: CreateFieldInput) {
    const [form] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, input.formId))
      .limit(1);
    if (!form || form.userId !== userId)
      throw new TRPCError({ code: "FORBIDDEN" });

    const [page] = await db
      .select()
      .from(formPagesTable)
      .where(
        and(
          eq(formPagesTable.id, input.pageId),
          eq(formPagesTable.formId, input.formId),
        ),
      )
      .limit(1);
    if (!page)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Page not found in this form.",
      });

    const [fieldCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(formFieldsTable)
      .where(eq(formFieldsTable.formId, input.formId));
    if (fieldCount && fieldCount.count >= MAX_FIELDS_PER_FORM)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `Maximum of ${MAX_FIELDS_PER_FORM} fields allowed per form.`,
      });

    const existing = await db
      .select({ name: formFieldsTable.name })
      .from(formFieldsTable)
      .where(eq(formFieldsTable.formId, input.formId));
    const existingNames = existing.map((f) => f.name);
    const fieldName = input.name || generateFieldName(input.label, existingNames);
    if (existingNames.includes(fieldName))
      throw new TRPCError({
        code: "CONFLICT",
        message: `A field with the name "${fieldName}" already exists in this form.`,
      });

    let position = input.position;
    if (position === undefined) {
      const [max] = await db
        .select({
          max: sql<number>`COALESCE(MAX(position), -1)::int`,
        })
        .from(formFieldsTable)
        .where(eq(formFieldsTable.pageId, input.pageId));
      position = (max?.max ?? -1) + 1;
    }

    const [field] = await db
      .insert(formFieldsTable)
      .values({
        formId: input.formId,
        pageId: input.pageId,
        type: input.type as FieldType,
        label: input.label.trim(),
        name: fieldName,
        placeholder: input.placeholder?.trim() || null,
        description: input.description?.trim() || null,
        required: input.required ?? false,
        validation: input.validation || null,
        options: input.options || null,
        conditionalLogic: input.conditionalLogic || null,
        position,
        settings: input.settings || {},
      })
      .returning();

    logger.info("Field created", {
      fieldId: field!.id,
      formId: input.formId,
      userId,
    });
    return { field: field!, message: "Field created successfully." };
  }

  async updateField(userId: string, input: UpdateFieldInput) {
    const [row] = await db
      .select({ field: formFieldsTable, form: formsTable })
      .from(formFieldsTable)
      .innerJoin(formsTable, eq(formFieldsTable.formId, formsTable.id))
      .where(eq(formFieldsTable.id, input.fieldId))
      .limit(1);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Field not found." });
    if (row.form.userId !== userId)
      throw new TRPCError({ code: "FORBIDDEN" });

    const updateData: Partial<typeof formFieldsTable.$inferInsert> = {};
    if (input.type !== undefined) updateData.type = input.type as FieldType;
    if (input.label !== undefined) updateData.label = input.label.trim();
    if (input.name !== undefined) updateData.name = input.name;
    if (input.placeholder !== undefined)
      updateData.placeholder = input.placeholder?.trim() || null;
    if (input.description !== undefined)
      updateData.description = input.description?.trim() || null;
    if (input.required !== undefined) updateData.required = input.required;
    if (input.validation !== undefined) updateData.validation = input.validation;
    if (input.options !== undefined) updateData.options = input.options;
    if (input.conditionalLogic !== undefined)
      updateData.conditionalLogic = input.conditionalLogic;
    if (input.position !== undefined) updateData.position = input.position;
    if (input.settings !== undefined) updateData.settings = input.settings;

    if (Object.keys(updateData).length === 0) {
      return { field: row.field, message: "No changes to update." };
    }

    const [updated] = await db
      .update(formFieldsTable)
      .set(updateData)
      .where(eq(formFieldsTable.id, input.fieldId))
      .returning();

    logger.info("Field updated", { fieldId: input.fieldId, userId });
    return { field: updated!, message: "Field updated successfully." };
  }

  async deleteField(userId: string, fieldId: string) {
    const [row] = await db
      .select({ field: formFieldsTable, form: formsTable })
      .from(formFieldsTable)
      .innerJoin(formsTable, eq(formFieldsTable.formId, formsTable.id))
      .where(eq(formFieldsTable.id, fieldId))
      .limit(1);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Field not found." });
    if (row.form.userId !== userId)
      throw new TRPCError({ code: "FORBIDDEN" });

    await db.delete(formFieldsTable).where(eq(formFieldsTable.id, fieldId));
    logger.info("Field deleted", { fieldId, formId: row.form.id, userId });
    return { message: "Field deleted successfully." };
  }

  async reorderFields(userId: string, input: ReorderFieldsInput) {
    const [page] = await db
      .select({ page: formPagesTable, form: formsTable })
      .from(formPagesTable)
      .innerJoin(formsTable, eq(formPagesTable.formId, formsTable.id))
      .where(eq(formPagesTable.id, input.pageId))
      .limit(1);
    if (!page) throw new TRPCError({ code: "NOT_FOUND", message: "Page not found." });
    if (page.form.userId !== userId)
      throw new TRPCError({ code: "FORBIDDEN" });

    await db.transaction(async (tx) => {
      for (let i = 0; i < input.fieldIds.length; i++) {
        await tx
          .update(formFieldsTable)
          .set({ position: i })
          .where(
            and(
              eq(formFieldsTable.id, input.fieldIds[i]!),
              eq(formFieldsTable.pageId, input.pageId),
            ),
          );
      }
    });

    logger.info("Fields reordered", { pageId: input.pageId, userId });
    return { message: "Fields reordered successfully." };
  }

  async moveField(
    userId: string,
    fieldId: string,
    targetPageId: string,
    targetIndex: number,
  ) {
    const [row] = await db
      .select({ field: formFieldsTable, form: formsTable })
      .from(formFieldsTable)
      .innerJoin(formsTable, eq(formFieldsTable.formId, formsTable.id))
      .where(eq(formFieldsTable.id, fieldId))
      .limit(1);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Field not found." });
    if (row.form.userId !== userId)
      throw new TRPCError({ code: "FORBIDDEN" });

    await db
      .update(formFieldsTable)
      .set({ pageId: targetPageId, position: targetIndex })
      .where(eq(formFieldsTable.id, fieldId));

    logger.info("Field moved", { fieldId, targetPageId, userId });
    return { message: "Field moved successfully." };
  }
}