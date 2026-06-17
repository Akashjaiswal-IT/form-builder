import { z } from "zod";

// ============================================================
// FIELD OPTIONS & VALIDATION
// ============================================================

export const fieldOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
});
export type FieldOption = z.infer<typeof fieldOptionSchema>;

export const validationRuleSchema = z.object({
  type: z.enum(["regex", "function"]),
  value: z.string(),
  message: z.string(),
});
export type ValidationRule = z.infer<typeof validationRuleSchema>;

export const fieldValidationSchema = z.object({
  minLength: z.number().int().positive().optional(),
  maxLength: z.number().int().positive().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  patternMessage: z.string().optional(),
  customRules: z.array(validationRuleSchema).optional(),
});
export type FieldValidation = z.infer<typeof fieldValidationSchema>;

export const fieldSettingsSchema = z.object({
  width: z.enum(["full", "half", "third"]).optional(),
  hideLabel: z.boolean().optional(),
  allowOther: z.boolean().optional(),
  otherLabel: z.string().optional(),
  minRating: z.number().int().min(1).optional(),
  maxRating: z.number().int().min(1).optional(),
  ratingIcon: z.enum(["star", "heart", "thumbs"]).optional(),
  scaleMin: z.number().optional(),
  scaleMax: z.number().optional(),
  scaleMinLabel: z.string().optional(),
  scaleMaxLabel: z.string().optional(),
  acceptedFileTypes: z.array(z.string()).optional(),
  maxFileSize: z.number().int().positive().optional(),
  headingLevel: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
    .optional(),
});
export type FieldSettings = z.infer<typeof fieldSettingsSchema>;

export const conditionSchema = z.object({
  fieldId: z.string(),
  operator: z.enum([
    "equals",
    "not_equals",
    "contains",
    "not_contains",
    "greater_than",
    "less_than",
    "is_empty",
    "is_not_empty",
  ]),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
});
export type Condition = z.infer<typeof conditionSchema>;

export const conditionalLogicSchema = z.object({
  enabled: z.boolean(),
  action: z.enum(["show", "hide", "require"]),
  logicType: z.enum(["all", "any"]),
  conditions: z.array(conditionSchema).min(1),
});
export type ConditionalLogic = z.infer<typeof conditionalLogicSchema>;

export const formSettingsSchema = z.object({
  allowMultipleSubmissions: z.boolean().default(false),
  showProgressBar: z.boolean().default(true),
  shuffleFields: z.boolean().default(false),
  submitButtonText: z.string().default("Submit"),
  successMessage: z
    .string()
    .default("Thank you for your submission!"),
  redirectUrl: z.string().url().nullable().default(null),
  closedMessage: z
    .string()
    .default("This form is no longer accepting responses."),
  requireLogin: z.boolean().default(false),
  limitResponses: z.number().int().positive().nullable().default(null),
  startDate: z.string().datetime({ offset: true }).nullable().default(null),
  endDate: z.string().datetime({ offset: true }).nullable().default(null),
  notifyOnResponse: z.boolean().default(false),
});
export type FormSettings = z.infer<typeof formSettingsSchema>;

export const formThemeSchema = z.object({
  primaryColor: z.string().default("#3b82f6"),
  backgroundColor: z.string().default("#ffffff"),
  fontFamily: z.string().default("Inter"),
  borderRadius: z.enum(["none", "sm", "md", "lg", "full"]).default("md"),
});
export type FormTheme = z.infer<typeof formThemeSchema>;

export const fieldTypeSchema = z.enum([
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
]);
export type FieldType = z.infer<typeof fieldTypeSchema>;

export const formStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "CLOSED",
  "ARCHIVED",
]);
export const responseStatusSchema = z.enum([
  "IN_PROGRESS",
  "COMPLETED",
  "ABANDONED",
]);
export const webhookEventSchema = z.enum([
  "RESPONSE_SUBMITTED",
  "RESPONSE_UPDATED",
  "FORM_PUBLISHED",
  "FORM_CLOSED",
]);

// --- Input schemas ---
export const createFormInputSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
});
export type CreateFormInput = z.infer<typeof createFormInputSchema>;

export const updateFormInputSchema = z.object({
  formId: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  settings: formSettingsSchema.partial().optional(),
  theme: formThemeSchema.partial().optional(),
});
export type UpdateFormInput = z.infer<typeof updateFormInputSchema>;

export const createPageInputSchema = z.object({
  formId: z.string().uuid(),
  title: z.string().optional(),
  description: z.string().optional(),
  position: z.number().int().min(0).optional(),
});
export type CreatePageInput = z.infer<typeof createPageInputSchema>;

export const updatePageInputSchema = z.object({
  pageId: z.string().uuid(),
  title: z.string().optional(),
  description: z.string().optional(),
  position: z.number().int().min(0).optional(),
  conditionalLogic: conditionalLogicSchema.nullable().optional(),
});
export type UpdatePageInput = z.infer<typeof updatePageInputSchema>;

export const createFieldInputSchema = z.object({
  formId: z.string().uuid(),
  pageId: z.string().uuid(),
  type: fieldTypeSchema,
  label: z.string().min(1).max(500),
  name: z.string().min(1).max(100).optional(),
  placeholder: z.string().max(255).optional(),
  description: z.string().optional(),
  required: z.boolean().default(false),
  validation: fieldValidationSchema.optional(),
  options: z.array(fieldOptionSchema).optional(),
  conditionalLogic: conditionalLogicSchema.nullable().optional(),
  position: z.number().int().min(0).optional(),
  settings: fieldSettingsSchema.optional(),
});
export type CreateFieldInput = z.infer<typeof createFieldInputSchema>;

export const updateFieldInputSchema = z.object({
  fieldId: z.string().uuid(),
  type: fieldTypeSchema.optional(),
  label: z.string().min(1).max(500).optional(),
  name: z.string().min(1).max(100).optional(),
  placeholder: z.string().max(255).optional(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  validation: fieldValidationSchema.optional(),
  options: z.array(fieldOptionSchema).optional(),
  conditionalLogic: conditionalLogicSchema.nullable().optional(),
  position: z.number().int().min(0).optional(),
  settings: fieldSettingsSchema.optional(),
});
export type UpdateFieldInput = z.infer<typeof updateFieldInputSchema>;

export const reorderFieldsInputSchema = z.object({
  pageId: z.string().uuid(),
  fieldIds: z.array(z.string().uuid()).min(1),
});
export type ReorderFieldsInput = z.infer<typeof reorderFieldsInputSchema>;

export const responseMetadataSchema = z.object({
  referrer: z.string().optional(),
  device: z.enum(["desktop", "tablet", "mobile"]).optional(),
  browser: z.string().optional(),
  os: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
});
export type ResponseMetadata = z.infer<typeof responseMetadataSchema>;

export const submitResponseInputSchema = z.object({
  formId: z.string().uuid(),
  data: z.record(z.string(), z.any()),
  metadata: responseMetadataSchema.optional(),
});
export type SubmitResponseInput = z.infer<typeof submitResponseInputSchema>;

export const createWebhookInputSchema = z.object({
  formId: z.string().uuid(),
  name: z.string().min(1).max(255),
  url: z.string().url(),
  secret: z.string().max(255).optional(),
  events: z.array(webhookEventSchema).default(["RESPONSE_SUBMITTED"]),
  headers: z.record(z.string(), z.string()).optional(),
});
export type CreateWebhookInput = z.infer<typeof createWebhookInputSchema>;

export const updateWebhookInputSchema = z.object({
  webhookId: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  url: z.string().url().optional(),
  secret: z.string().optional(),
  events: z.array(webhookEventSchema).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  enabled: z.boolean().optional(),
});
export type UpdateWebhookInput = z.infer<typeof updateWebhookInputSchema>;