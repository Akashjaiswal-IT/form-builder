// packages/services/form/services/template.service.ts
import { eq, desc, asc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@repo/database";
import { logger } from "@repo/logger";
import {
  formsTable,
  formPagesTable,
  formFieldsTable,
  formTemplatesTable,
  type FormTemplateSchema,
} from "@repo/database/schema";
import { generateSlug } from "../utils";
import { formSettingsSchema, formThemeSchema } from "../model";
import type { FieldType } from "../model";

export class TemplateService {
  private validateFormAccess(
    form: { userId: string } | undefined,
    userId: string,
  ): asserts form is { userId: string } {
    if (!form) throw new TRPCError({ code: "NOT_FOUND" });
    if (form.userId !== userId)
      throw new TRPCError({ code: "FORBIDDEN" });
  }

  async applyTemplate(
    userId: string,
    templateId: string,
  ): Promise<{
    form: typeof formsTable.$inferSelect;
    message: string;
  }> {
    const [template] = await db
      .select()
      .from(formTemplatesTable)
      .where(eq(formTemplatesTable.id, templateId))
      .limit(1);

    if (!template)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Template not found.",
      });

    const schema = template.formSchema as FormTemplateSchema;
    const slug = generateSlug();

    const newForm = await db.transaction(async (tx) => {
      const [form] = await tx
        .insert(formsTable)
        .values({
          userId,
          title: template.name,
          description: template.description ?? null,
          slug,
          status: "DRAFT",
          settings: {
            allowMultipleSubmissions:
              schema.settings?.allowMultipleSubmissions ?? false,
            showProgressBar: schema.settings?.showProgressBar ?? true,
            shuffleFields: schema.settings?.shuffleFields ?? false,
            submitButtonText: schema.settings?.submitButtonText ?? "Submit",
            successMessage:
              schema.settings?.successMessage ??
              "Thank you for your submission!",
            redirectUrl: schema.settings?.redirectUrl ?? null,
            closedMessage:
              schema.settings?.closedMessage ??
              "This form is no longer accepting responses.",
            requireLogin: schema.settings?.requireLogin ?? false,
            limitResponses: schema.settings?.limitResponses ?? null,
            startDate: schema.settings?.startDate ?? null,
            endDate: schema.settings?.endDate ?? null,
            notifyOnResponse: false,
          },
          theme: {
            primaryColor: schema.theme?.primaryColor ?? "#3b82f6",
            backgroundColor: schema.theme?.backgroundColor ?? "#ffffff",
            fontFamily: schema.theme?.fontFamily ?? "Inter",
            borderRadius: schema.theme?.borderRadius ?? "md",
          },
        })
        .returning();

      if (!form)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create form.",
        });

      for (let i = 0; i < (schema.pages ?? []).length; i++) {
        const page = schema.pages![i]!;
        const [newPage] = await tx
          .insert(formPagesTable)
          .values({
            formId: form.id,
            title: page.title ?? `Page ${i + 1}`,
            description: page.description ?? null,
            position: i,
          })
          .returning();

        if (newPage && page.fields) {
          for (let j = 0; j < page.fields.length; j++) {
            const f = page.fields[j]!;
            await tx.insert(formFieldsTable).values({
              formId: form.id,
              pageId: newPage.id,
              type: f.type as FieldType,
              label: f.label,
              name: f.name,
              placeholder: f.placeholder ?? null,
              description: f.description ?? null,
              required: f.required ?? false,
              validation: f.validation ?? null,
              options: f.options ?? null,
              conditionalLogic: f.conditionalLogic ?? null,
              position: j,
              settings: f.settings ?? {},
            });
          }
        }
      }

      return form;
    });

    await db
      .update(formTemplatesTable)
      .set({ usageCount: sql`usage_count + 1` })
      .where(eq(formTemplatesTable.id, templateId));

    logger.info("Template applied", {
      templateId,
      newFormId: newForm.id,
      userId,
    });
    return { form: newForm, message: "Form created from template." };
  }

  async saveAsTemplate(
    userId: string,
    formId: string,
    meta: { name: string; description?: string; category: string },
  ): Promise<{ id: string; message: string }> {
    const [form] = await db
      .select({
        id: formsTable.id,
        userId: formsTable.userId,
        title: formsTable.title,
        settings: formsTable.settings,
        theme: formsTable.theme,
      })
      .from(formsTable)
      .where(eq(formsTable.id, formId))
      .limit(1);
    this.validateFormAccess(form, userId);

    const pages = await db
      .select()
      .from(formPagesTable)
      .where(eq(formPagesTable.formId, formId))
      .orderBy(asc(formPagesTable.position));

    const fields = await db
      .select()
      .from(formFieldsTable)
      .where(eq(formFieldsTable.formId, formId))
      .orderBy(asc(formFieldsTable.position));

    const parsedSettings = formSettingsSchema.parse(form.settings ?? {});
    const parsedTheme = formThemeSchema.parse(form.theme ?? {});

    const schema: FormTemplateSchema = {
      pages: pages.map((page) => ({
        title: page.title ?? undefined,
        description: page.description ?? undefined,
        fields: fields
          .filter((f) => f.pageId === page.id)
          .map((f) => ({
            type: f.type,
            label: f.label,
            name: f.name,
            placeholder: f.placeholder ?? undefined,
            description: f.description ?? undefined,
            required: f.required,
            validation: f.validation ?? undefined,
            options: f.options ?? undefined,
            conditionalLogic: f.conditionalLogic ?? undefined,
            settings: f.settings ?? undefined,
          })),
      })),
      settings: parsedSettings,
      theme: parsedTheme,
    };

    const [template] = await db
      .insert(formTemplatesTable)
      .values({
        userId,
        name: meta.name,
        description: meta.description ?? null,
        category: meta.category,
        formSchema: schema as any,
        isPublic: false,
        usageCount: 0,
      })
      .returning({ id: formTemplatesTable.id });

    if (!template)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to save template.",
      });

    logger.info("Template saved", { templateId: template.id, formId, userId });
    return { id: template.id, message: "Template saved successfully." };
  }

  async listTemplates() {
    const templates = await db
      .select()
      .from(formTemplatesTable)
      .where(eq(formTemplatesTable.isPublic, true))
      .orderBy(desc(formTemplatesTable.usageCount));

    return { templates };
  }

  async listUserTemplates(userId: string) {
    const templates = await db
      .select()
      .from(formTemplatesTable)
      .where(eq(formTemplatesTable.userId, userId))
      .orderBy(desc(formTemplatesTable.createdAt));
    return { templates };
  }

  async deleteTemplate(userId: string, templateId: string) {
    const [template] = await db
      .select({ userId: formTemplatesTable.userId })
      .from(formTemplatesTable)
      .where(eq(formTemplatesTable.id, templateId))
      .limit(1);
    if (!template || template.userId !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You can only delete your own templates.",
      });
    }
    await db
      .delete(formTemplatesTable)
      .where(eq(formTemplatesTable.id, templateId));
    return { success: true };
  }
}