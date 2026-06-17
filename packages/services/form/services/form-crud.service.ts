// packages/services/form/services/form-crud.service.ts
import { and, eq, desc, asc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@repo/database";
import { logger } from "@repo/logger";
import {
  formsTable,
  formPagesTable,
  formFieldsTable,
  formResponsesTable,
  type FormSettings,
  type FormTheme,
  type ConditionalLogic,
} from "@repo/database/schema";
import {
  generateSlug,
  DEFAULT_PAGE_TITLE,
  MAX_FORMS_PER_USER,
} from "../utils";
import type { CreateFormInput, UpdateFormInput } from "../model";
import type { FormServiceDependencies } from "./types";

export class FormCrudService {
  constructor(private deps: FormServiceDependencies) {}

  private validateFormAccess(
    form: { userId: string } | undefined,
    userId: string,
  ): asserts form is { userId: string } {
    if (!form)
      throw new TRPCError({ code: "NOT_FOUND", message: "Form not found." });
    if (form.userId !== userId)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permission to access this form.",
      });
  }

  async createForm(userId: string, input: CreateFormInput) {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(formsTable)
      .where(eq(formsTable.userId, userId));

    if (countResult && countResult.count >= MAX_FORMS_PER_USER) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `You have reached the maximum limit of ${MAX_FORMS_PER_USER} forms.`,
      });
    }

    let slug = generateSlug();
    let slugExists = true;
    let attempts = 0;
    while (slugExists && attempts < 5) {
      const [existing] = await db
        .select({ id: formsTable.id })
        .from(formsTable)
        .where(eq(formsTable.slug, slug))
        .limit(1);
      slugExists = !!existing;
      if (slugExists) {
        slug = generateSlug();
        attempts++;
      }
    }

    if (slugExists) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to generate a unique form URL. Please try again.",
      });
    }

    const result = await db.transaction(async (tx) => {
      const [form] = await tx
        .insert(formsTable)
        .values({
          userId,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          slug,
          status: "DRAFT",
          settings: {
            allowMultipleSubmissions: false,
            showProgressBar: true,
            shuffleFields: false,
            submitButtonText: "Submit",
            successMessage: "Thank you for your submission!",
            redirectUrl: null,
            closedMessage: "This form is no longer accepting responses.",
            requireLogin: false,
            limitResponses: null,
            startDate: null,
            endDate: null,
            notifyOnResponse: false,
          },
          theme: {
            primaryColor: "#3b82f6",
            backgroundColor: "#ffffff",
            fontFamily: "Inter",
            borderRadius: "md",
          },
        })
        .returning();

      if (!form) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create form.",
        });
      }

      const [page] = await tx
        .insert(formPagesTable)
        .values({
          formId: form.id,
          title: DEFAULT_PAGE_TITLE,
          position: 0,
        })
        .returning();

      if (!page) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create initial form page.",
        });
      }

      return { form, page };
    });

    logger.info("Form created", { formId: result.form.id, userId });
    return {
      form: result.form,
      page: result.page,
      message: "Form created successfully.",
    };
  }

  async getFormById(formId: string, userId: string) {
    const [form] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, formId))
      .limit(1);
    this.validateFormAccess(form, userId);
    return form;
  }

  async getFormByIdNoAuth(formId: string) {
    const [form] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, formId))
      .limit(1);
    if (!form)
      throw new TRPCError({ code: "NOT_FOUND", message: "Form not found." });
    return form;
  }

  async getFullById(formId: string, userId: string) {
    const [form] = await db
      .select()
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

    return { form, pages, fields };
  }

  async getFormBySlug(slug: string) {
    const [form] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.slug, slug))
      .limit(1);
    if (!form) return null;

    const pages = await db
      .select()
      .from(formPagesTable)
      .where(eq(formPagesTable.formId, form.id))
      .orderBy(asc(formPagesTable.position));

    const fields = await db
      .select()
      .from(formFieldsTable)
      .where(eq(formFieldsTable.formId, form.id))
      .orderBy(asc(formFieldsTable.position));

    return { form, pages, fields };
  }

  async listUserForms(
    userId: string,
    options: {
      status?: string;
      limit?: number;
      offset?: number;
      sortBy?: "createdAt" | "updatedAt" | "title";
      sortOrder?: "asc" | "desc";
    } = {},
  ) {
    const { status, limit = 20, offset = 0, sortBy = "updatedAt", sortOrder = "desc" } = options;

    const conditions = [eq(formsTable.userId, userId)];
    if (status) {
      conditions.push(
        eq(formsTable.status, status as "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED"),
      );
    }

    const orderMap = {
      createdAt: formsTable.createdAt,
      updatedAt: formsTable.updatedAt,
      title: formsTable.title,
    } as const;
    const orderColumn = orderMap[sortBy];
    const orderFn = sortOrder === "asc" ? asc : desc;

    const [totalRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(formsTable)
      .where(and(...conditions));

    const rows = await db
      .select({
        id: formsTable.id,
        userId: formsTable.userId,
        title: formsTable.title,
        description: formsTable.description,
        slug: formsTable.slug,
        status: formsTable.status,
        settings: formsTable.settings,
        theme: formsTable.theme,
        publishedAt: formsTable.publishedAt,
        closedAt: formsTable.closedAt,
        createdAt: formsTable.createdAt,
        updatedAt: formsTable.updatedAt,
        responseCount: sql<number>`COALESCE(COUNT(${formResponsesTable.id}), 0)::int`,
      })
      .from(formsTable)
      .leftJoin(
        formResponsesTable,
        and(
          eq(formResponsesTable.formId, formsTable.id),
          eq(formResponsesTable.status, "COMPLETED"),
        ),
      )
      .where(and(...conditions))
      .groupBy(formsTable.id)
      .orderBy(orderFn(orderColumn))
      .limit(limit)
      .offset(offset);

    return {
      forms: rows.map((r) => ({
        ...r,
        responseCount: r.responseCount ?? 0,
      })),
      total: totalRow?.count ?? 0,
    };
  }

  async updateForm(userId: string, input: UpdateFormInput) {
    const [existingForm] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, input.formId))
      .limit(1);

    this.validateFormAccess(existingForm, userId);

    const updateData: Partial<typeof formsTable.$inferInsert> = {};
    if (input.title !== undefined) updateData.title = input.title.trim();
    if (input.description !== undefined)
      updateData.description = input.description?.trim() || null;
    if (input.settings)
      updateData.settings = {
        ...(existingForm.settings as FormSettings),
        ...input.settings,
      } as FormSettings;
    if (input.theme)
      updateData.theme = {
        ...(existingForm.theme as FormTheme),
        ...input.theme,
      } as FormTheme;

    if (Object.keys(updateData).length === 0) {
      return { form: existingForm, message: "No changes to update." };
    }

    const [updatedForm] = await db
      .update(formsTable)
      .set(updateData)
      .where(eq(formsTable.id, input.formId))
      .returning();

    logger.info("Form updated", { formId: input.formId, userId });
    return { form: updatedForm!, message: "Form updated successfully." };
  }

  async publishForm(userId: string, formId: string) {
    const [form] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, formId))
      .limit(1);
    this.validateFormAccess(form, userId);

    if (form.status === "PUBLISHED") {
      return { form, message: "Form is already published." };
    }

    const [fieldCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(formFieldsTable)
      .where(eq(formFieldsTable.formId, formId));

    if (!fieldCount || fieldCount.count === 0) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Cannot publish a form without any fields.",
      });
    }

    const [updatedForm] = await db
      .update(formsTable)
      .set({
        status: "PUBLISHED",
        publishedAt: new Date(),
        closedAt: null,
      })
      .where(eq(formsTable.id, formId))
      .returning();

    await this.deps.triggerWebhooks(formId, "FORM_PUBLISHED", { formId });
    logger.info("Form published", { formId, userId });
    return { form: updatedForm!, message: "Form published successfully." };
  }

  async closeForm(userId: string, formId: string) {
    const [form] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, formId))
      .limit(1);
    this.validateFormAccess(form, userId);

    if (form.status === "CLOSED") {
      return { form, message: "Form is already closed." };
    }

    const [updatedForm] = await db
      .update(formsTable)
      .set({ status: "CLOSED", closedAt: new Date() })
      .where(eq(formsTable.id, formId))
      .returning();

    await this.deps.triggerWebhooks(formId, "FORM_CLOSED", { formId });
    logger.info("Form closed", { formId, userId });
    return { form: updatedForm!, message: "Form closed successfully." };
  }

  async archiveForm(userId: string, formId: string) {
    const [form] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, formId))
      .limit(1);
    this.validateFormAccess(form, userId);
    await db.update(formsTable).set({ status: "ARCHIVED" }).where(eq(formsTable.id, formId));
    logger.info("Form archived", { formId, userId });
    return { message: "Form archived successfully." };
  }

  async deleteForm(userId: string, formId: string) {
    const [form] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, formId))
      .limit(1);
    this.validateFormAccess(form, userId);
    await db.delete(formsTable).where(eq(formsTable.id, formId));
    logger.info("Form deleted", { formId, userId });
    return { message: "Form deleted successfully." };
  }

  async duplicateForm(userId: string, formId: string) {
    const [originalForm] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, formId))
      .limit(1);
    this.validateFormAccess(originalForm, userId);

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

    const newSlug = generateSlug();

    const newForm = await db.transaction(async (tx) => {
      const [newF] = await tx
        .insert(formsTable)
        .values({
          userId,
          title: `${originalForm.title} (Copy)`,
          description: originalForm.description,
          slug: newSlug,
          status: "DRAFT",
          settings: originalForm.settings,
          theme: originalForm.theme,
        })
        .returning();

      const pageIdMap = new Map<string, string>();
      for (const page of pages) {
        const [newPage] = await tx
          .insert(formPagesTable)
          .values({
            formId: newF!.id,
            title: page.title,
            description: page.description,
            position: page.position,
            conditionalLogic: page.conditionalLogic,
          })
          .returning();
        pageIdMap.set(page.id, newPage!.id);
      }

      const fieldIdMap = new Map<string, string>();
      for (const field of fields) {
        const newPageId = pageIdMap.get(field.pageId);
        if (!newPageId) continue;
        const [newField] = await tx
          .insert(formFieldsTable)
          .values({
            formId: newF!.id,
            pageId: newPageId,
            type: field.type,
            label: field.label,
            name: field.name,
            placeholder: field.placeholder,
            description: field.description,
            required: field.required,
            validation: field.validation,
            options: field.options,
            conditionalLogic: null,
            position: field.position,
            settings: field.settings,
          })
          .returning();
        if (newField) {
          fieldIdMap.set(field.id, newField.id);
        }
      }

      for (const field of fields) {
        const newFieldId = fieldIdMap.get(field.id);
        if (!newFieldId) continue;
        if (field.conditionalLogic && typeof field.conditionalLogic === "object") {
          const logic = field.conditionalLogic as ConditionalLogic;
          const remappedConditions = logic.conditions.map((c) => ({
            ...c,
            fieldId: fieldIdMap.get(c.fieldId) ?? c.fieldId,
          }));
          await tx
            .update(formFieldsTable)
            .set({ conditionalLogic: { ...logic, conditions: remappedConditions } })
            .where(eq(formFieldsTable.id, newFieldId));
        }
      }

      return newF!;
    });

    logger.info("Form duplicated", {
      originalFormId: formId,
      newFormId: newForm.id,
      userId,
    });
    return { form: newForm, message: "Form duplicated successfully." };
  }
}