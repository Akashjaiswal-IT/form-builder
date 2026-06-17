import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { router, protectedProcedure, publicProcedure } from "../../trpc";
import { formService } from "@repo/services/form";
import {
  createFormInputSchema,
  updateFormInputSchema,
  createPageInputSchema,
  updatePageInputSchema,
  createFieldInputSchema,
  updateFieldInputSchema,
  reorderFieldsInputSchema,
  submitResponseInputSchema,
  createWebhookInputSchema,
  updateWebhookInputSchema,
  formSettingsSchema,
} from "@repo/services/form/model";

// ---------------------------------------------------------------
// ADDED: imports required for the authentication check
// ---------------------------------------------------------------
import { AUTH_SESSION_COOKIE_NAME, readCookie } from "../../utils/auth-cookie";
import { userService } from "../../services";

import {
  createFormResultSchema,
  updateFormResultSchema,
  publishCloseResultSchema,
  duplicateResultSchema,
  listFormsResultSchema,
  fullFormResultSchema,
  formOutputSchema,
  messageResultSchema,
  pageResultSchema,
  fieldResultSchema,
  submitResponseResultSchema,
  listResponsesResultSchema,
  getResponseResultSchema,
  webhookResultSchema,
  listWebhooksResultSchema,
  webhookLogsResultSchema,
  analyticsResultSchema,
  trackAnalyticsResultSchema,
  listTemplatesResultSchema,
  applyTemplateResultSchema,
  saveTemplateResultSchema,
  successResultSchema,
} from "./output";

// Extended request type to safely access IP / user-agent headers
interface RequestWithExtra {
  headers: Record<string, string | undefined>;
  socket?: { remoteAddress?: string };
}

export const formsRouter = router({
  // ============================================
  // FORM CRUD
  // ============================================

  create: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/forms" } })
    .input(createFormInputSchema)
    .output(createFormResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.createForm(ctx.user.id, input);
    }),

  list: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/forms" } })
    .input(
      z.object({
        status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"]).optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
        sortBy: z.enum(["createdAt", "updatedAt", "title"]).default("updatedAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }),
    )
    .output(listFormsResultSchema)
    .query(async ({ ctx, input }) => {
      return formService.listUserForms(ctx.user.id, input);
    }),

  getById: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/forms/{formId}" } })
    .input(z.object({ formId: z.string().uuid() }))
    .output(formOutputSchema)
    .query(async ({ ctx, input }) => {
      return formService.getFormById(input.formId, ctx.user.id);
    }),

  getFullById: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/forms/{formId}/full" } })
    .input(z.object({ formId: z.string().uuid() }))
    .output(fullFormResultSchema)
    .query(async ({ ctx, input }) => {
      return formService.getFullById(input.formId, ctx.user.id);
    }),

  getBySlug: publicProcedure
    .meta({ openapi: { method: "GET", path: "/forms/slug/{slug}" } })
    .input(z.object({ slug: z.string().min(1) }))
    .output(fullFormResultSchema)
    .query(async ({ input }) => {
      const result = await formService.getFormBySlug(input.slug);
      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Form not found." });
      }
      return result;
    }),

  update: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: "/forms/{formId}" } })
    .input(updateFormInputSchema)
    .output(updateFormResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.updateForm(ctx.user.id, input);
    }),

  publish: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/forms/{formId}/publish" } })
    .input(z.object({ formId: z.string().uuid() }))
    .output(publishCloseResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.publishForm(ctx.user.id, input.formId);
    }),

  close: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/forms/{formId}/close" } })
    .input(z.object({ formId: z.string().uuid() }))
    .output(publishCloseResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.closeForm(ctx.user.id, input.formId);
    }),

  archive: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/forms/{formId}/archive" } })
    .input(z.object({ formId: z.string().uuid() }))
    .output(messageResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.archiveForm(ctx.user.id, input.formId);
    }),

  delete: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: "/forms/{formId}" } })
    .input(z.object({ formId: z.string().uuid() }))
    .output(messageResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.deleteForm(ctx.user.id, input.formId);
    }),

  duplicate: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/forms/{formId}/duplicate" } })
    .input(z.object({ formId: z.string().uuid() }))
    .output(duplicateResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.duplicateForm(ctx.user.id, input.formId);
    }),

  // ============================================
  // PAGE OPERATIONS
  // ============================================

  createPage: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/forms/{formId}/pages" } })
    .input(createPageInputSchema)
    .output(pageResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.createPage(ctx.user.id, input);
    }),

  updatePage: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: "/forms/pages/{pageId}" } })
    .input(updatePageInputSchema)
    .output(pageResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.updatePage(ctx.user.id, input);
    }),

  deletePage: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: "/forms/pages/{pageId}" } })
    .input(z.object({ pageId: z.string().uuid() }))
    .output(messageResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.deletePage(ctx.user.id, input.pageId);
    }),

  reorderPages: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/forms/{formId}/pages/reorder" } })
    .input(
      z.object({
        formId: z.string().uuid(),
        pageIds: z.array(z.string().uuid()),
      }),
    )
    .output(messageResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.reorderPages(ctx.user.id, input.formId, input.pageIds);
    }),

  // ============================================
  // FIELD OPERATIONS
  // ============================================

  createField: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/forms/{formId}/fields" } })
    .input(createFieldInputSchema)
    .output(fieldResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.createField(ctx.user.id, input);
    }),

  updateField: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: "/forms/fields/{fieldId}" } })
    .input(updateFieldInputSchema)
    .output(fieldResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.updateField(ctx.user.id, input);
    }),

  deleteField: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: "/forms/fields/{fieldId}" } })
    .input(z.object({ fieldId: z.string().uuid() }))
    .output(messageResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.deleteField(ctx.user.id, input.fieldId);
    }),

  reorderFields: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/forms/pages/{pageId}/fields/reorder" } })
    .input(reorderFieldsInputSchema)
    .output(messageResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.reorderFields(ctx.user.id, input);
    }),

  moveField: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/forms/fields/{fieldId}/move" } })
    .input(
      z.object({
        fieldId: z.string().uuid(),
        targetPageId: z.string().uuid(),
        targetIndex: z.number().int().min(0),
      }),
    )
    .output(messageResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.moveField(
        ctx.user.id,
        input.fieldId,
        input.targetPageId,
        input.targetIndex,
      );
    }),

  // ============================================
  // RESPONSE OPERATIONS
  // ============================================

  /**
   * Submit a response to a published form.
   * Public — no auth required unless form settings require it.
   */
  submitResponse: publicProcedure
    .meta({ openapi: { method: "POST", path: "/forms/{formId}/responses" } })
    .input(submitResponseInputSchema)
    .output(submitResponseResultSchema)
    .mutation(async ({ ctx, input }) => {
      // If the form requires login, verify the session
      const form = await formService.getFormByIdNoAuth(input.formId);
      const settings = formSettingsSchema.parse(form.settings ?? {});

      if (settings.requireLogin) {
        const sessionToken = readCookie(ctx.req.headers.cookie, AUTH_SESSION_COOKIE_NAME);
        const user = await userService.getAuthenticatedUserBySessionToken(sessionToken);
        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "You must be logged in to submit this form.",
          });
        }
      }

      // Extract IP and user-agent safely
      const req = ctx.req as RequestWithExtra;
      const ipAddress =
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ??
        req.socket?.remoteAddress ??
        undefined;
      const userAgent = req.headers["user-agent"] ?? undefined;

      return formService.submitResponse({
        ...input,
        ipAddress,
        userAgent,
      });
    }),

  listResponses: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/forms/{formId}/responses" } })
    .input(
      z.object({
        formId: z.string().uuid(),
        status: z.enum(["IN_PROGRESS", "COMPLETED", "ABANDONED"]).optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .output(listResponsesResultSchema)
    .query(async ({ ctx, input }) => {
      return formService.listResponses(ctx.user.id, input);
    }),

  getResponse: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/forms/responses/{responseId}" } })
    .input(z.object({ responseId: z.string().uuid() }))
    .output(getResponseResultSchema)
    .query(async ({ ctx, input }) => {
      return formService.getResponse(ctx.user.id, input.responseId);
    }),

  deleteResponse: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: "/forms/responses/{responseId}" } })
    .input(z.object({ responseId: z.string().uuid() }))
    .output(messageResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.deleteResponse(ctx.user.id, input.responseId);
    }),

  // ============================================
  // WEBHOOK OPERATIONS
  // ============================================

  createWebhook: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/forms/{formId}/webhooks" } })
    .input(createWebhookInputSchema)
    .output(webhookResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.createWebhook(ctx.user.id, input);
    }),

  testWebhook: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/forms/webhooks/{webhookId}/test" } })
    .input(z.object({ webhookId: z.string().uuid() }))
    .output(successResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.testWebhook(ctx.user.id, input.webhookId);
    }),

  listWebhooks: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/forms/{formId}/webhooks" } })
    .input(z.object({ formId: z.string().uuid() }))
    .output(listWebhooksResultSchema)
    .query(async ({ ctx, input }) => {
      return formService.listWebhooks(ctx.user.id, input.formId);
    }),

  updateWebhook: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: "/forms/webhooks/{webhookId}" } })
    .input(updateWebhookInputSchema)
    .output(webhookResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.updateWebhook(ctx.user.id, input);
    }),

  deleteWebhook: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: "/forms/webhooks/{webhookId}" } })
    .input(z.object({ webhookId: z.string().uuid() }))
    .output(messageResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.deleteWebhook(ctx.user.id, input.webhookId);
    }),

  getWebhookLogs: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/forms/webhooks/{webhookId}/logs" } })
    .input(
      z.object({
        webhookId: z.string().uuid(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .output(webhookLogsResultSchema)
    .query(async ({ ctx, input }) => {
      return formService.getWebhookLogs(ctx.user.id, input);
    }),

  // ============================================
  // ANALYTICS
  // ============================================

  getAnalytics: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/forms/{formId}/analytics" } })
    .input(
      z.object({
        formId: z.string().uuid(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .output(analyticsResultSchema)
    .query(async ({ ctx, input }) => {
      return formService.getAnalytics(ctx.user.id, input);
    }),

  /** Record a view, start, or completion for analytics */

  trackAnalytics: publicProcedure
    .meta({ openapi: { method: "POST", path: "/forms/{formId}/analytics/track" } })
    .input(
      z.object({
        formId: z.string().uuid(),
        event: z.enum(["view", "start", "completion"]),
      }),
    )
    .output(trackAnalyticsResultSchema)
    .mutation(async ({ input }) => {
      await formService.recordAnalytics(input.formId, input.event);
      return { success: true };
    }),

  /** List all public templates */
  listTemplates: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/forms/templates" } })
    .input(z.undefined())
    .output(listTemplatesResultSchema)
    .query(async () => {
      return formService.listTemplates();
    }),

  /** Create a new form from a template */
  applyTemplate: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/forms/templates/{templateId}/apply" } })
    .input(z.object({ templateId: z.string().uuid() }))
    .output(applyTemplateResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.applyTemplate(ctx.user.id, input.templateId);
    }),

  /** Save an existing form as a user template */
  saveAsTemplate: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/forms/{formId}/save-as-template" } })
    .input(
      z.object({
        formId: z.string().uuid(),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        category: z.string().min(1).max(100),
      }),
    )
    .output(saveTemplateResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.saveAsTemplate(ctx.user.id, input.formId, {
        name: input.name,
        description: input.description,
        category: input.category,
      });
    }),

  /** List templates belonging to the current user */
  listUserTemplates: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/forms/templates/my" } })
    .input(z.undefined())
    .output(listTemplatesResultSchema)
    .query(async ({ ctx }) => {
      return formService.listUserTemplates(ctx.user.id);
    }),

  deleteTemplate: protectedProcedure
    .meta({ openapi: { method: "DELETE", path: "/forms/templates/{templateId}" } })
    .input(z.object({ templateId: z.string().uuid() }))
    .output(successResultSchema)
    .mutation(async ({ ctx, input }) => {
      return formService.deleteTemplate(ctx.user.id, input.templateId);
    }),
});
