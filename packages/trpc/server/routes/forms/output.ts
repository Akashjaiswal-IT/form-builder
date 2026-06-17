import { z } from "zod";
import {
  formSettingsSchema,
  formThemeSchema,
  fieldValidationSchema,
  fieldOptionSchema,
  fieldSettingsSchema,
  conditionalLogicSchema,
  responseMetadataSchema,
} from "@repo/services/form/model";

/* ================================================================
   HELPER: timestamp that accepts Date OR string
   ================================================================ */
const timestampSchema = z.union([z.date(), z.string().datetime()]);

/* ================================================================
   PRIMITIVE SHAPES
   ================================================================ */

export const formOutputSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  slug: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"]),
  settings: formSettingsSchema.nullable(), // allow null from DB
  theme: formThemeSchema.nullable(),
  publishedAt: timestampSchema.nullable(),
  closedAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const pageOutputSchema = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  position: z.number().int(),
  conditionalLogic: conditionalLogicSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const fieldOutputSchema = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid(),
  pageId: z.string().uuid(),
  type: z.enum([
    "TEXT",
    "TEXTAREA",
    "NUMBER",
    "EMAIL",
    "PHONE",
    "URL",
    "DATE",
    "TIME",
    "DATETIME",
    "SELECT",
    "MULTI_SELECT",
    "RADIO",
    "CHECKBOX_GROUP",
    "CHECKBOX",
    "FILE",
    "SIGNATURE",
    "RATING",
    "SCALE",
    "HEADING",
    "PARAGRAPH",
    "DIVIDER",
    "HIDDEN",
  ]),
  label: z.string(),
  name: z.string(),
  placeholder: z.string().nullable(),
  description: z.string().nullable(),
  required: z.boolean(),
  validation: fieldValidationSchema.nullable(),
  options: z.array(fieldOptionSchema).nullable(),
  conditionalLogic: conditionalLogicSchema.nullable(),
  position: z.number().int(),
  settings: fieldSettingsSchema.nullable(), // ← allow null
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const responseOutputSchema = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "ABANDONED"]),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  metadata: responseMetadataSchema.nullable(),
  startedAt: timestampSchema,
  completedAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const responseDataOutputSchema = z.object({
  id: z.string().uuid(),
  responseId: z.string().uuid(),
  fieldId: z.string().uuid(),
  value: z.unknown(),
  createdAt: timestampSchema,
});

export const webhookOutputSchema = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid(),
  name: z.string(),
  url: z.string(),
  secret: z.string().nullable(),
  events: z.array(z.string()).nullable(),
  enabled: z.boolean(),
  headers: z.record(z.string(), z.string()).nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const webhookLogOutputSchema = z.object({
  id: z.string().uuid(),
  webhookId: z.string().uuid(),
  responseId: z.string().uuid().nullable(),
  event: z.string(),
  statusCode: z.number().int().nullable(),
  requestBody: z.unknown().nullable(),
  responseBody: z.string().nullable(),
  durationMs: z.number().int().nullable(),
  error: z.string().nullable(),
  createdAt: timestampSchema,
});

export const analyticsOutputSchema = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid(),
  date: timestampSchema,
  views: z.number().int(),
  starts: z.number().int(),
  completions: z.number().int(),
  avgCompletionTimeSeconds: z.number().int().nullable(),
  createdAt: timestampSchema,
});

export const templateOutputSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  thumbnailUrl: z.string().nullable(),
  formSchema: z.unknown(),
  isPublic: z.boolean(),
  usageCount: z.number().int(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

/* ================================================================
   COMPOUND (METHOD-SPECIFIC) SHAPES
   ================================================================ */

export const formWithCountSchema = formOutputSchema.extend({
  responseCount: z.number().int(),
});

export const createFormResultSchema = z.object({
  form: formOutputSchema,
  page: pageOutputSchema,
  message: z.string(),
});

export const fullFormResultSchema = z.object({
  form: formOutputSchema,
  pages: z.array(pageOutputSchema),
  fields: z.array(fieldOutputSchema),
});

export const updateFormResultSchema = z.object({
  form: formOutputSchema,
  message: z.string(),
});

export const publishCloseResultSchema = z.object({
  form: formOutputSchema,
  message: z.string(),
});

export const duplicateResultSchema = z.object({
  form: formOutputSchema,
  message: z.string(),
});

export const listFormsResultSchema = z.object({
  forms: z.array(formWithCountSchema),
  total: z.number().int(),
});

export const messageResultSchema = z.object({
  message: z.string(),
});

export const successResultSchema = z.object({
  success: z.boolean(),
});

export const pageResultSchema = z.object({
  page: pageOutputSchema,
  message: z.string(),
});

export const fieldResultSchema = z.object({
  field: fieldOutputSchema,
  message: z.string(),
});

export const submitResponseResultSchema = z.object({
  response: responseOutputSchema,
  message: z.string(),
});

export const listResponsesResultSchema = z.object({
  responses: z.array(responseOutputSchema),
  total: z.number().int(),
});

export const getResponseResultSchema = responseOutputSchema.extend({
  data: z.array(responseDataOutputSchema),
});

export const webhookResultSchema = z.object({
  webhook: webhookOutputSchema,
  message: z.string(),
});

export const listWebhooksResultSchema = z.object({
  webhooks: z.array(webhookOutputSchema),
});

export const webhookLogsResultSchema = z.object({
  logs: z.array(webhookLogOutputSchema),
});

export const analyticsResultSchema = z.object({
  analytics: z.array(analyticsOutputSchema),
  totals: z.object({
    views: z.number().int(),
    starts: z.number().int(),
    completions: z.number().int(),
  }),
});

export const trackAnalyticsResultSchema = z.object({
  success: z.boolean(),
});

export const listTemplatesResultSchema = z.object({
  templates: z.array(templateOutputSchema),
});

export const applyTemplateResultSchema = z.object({
  form: formOutputSchema,
  message: z.string(),
});

export const saveTemplateResultSchema = z.object({
  id: z.string().uuid(),
  message: z.string(),
});
