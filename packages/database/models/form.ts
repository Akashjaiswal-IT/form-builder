import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { usersTable } from "./user";

// Enums
export const formStatusEnum = pgEnum("form_status", [
  "DRAFT",
  "PUBLISHED",
  "CLOSED",
  "ARCHIVED",
]);

export const fieldTypeEnum = pgEnum("field_type", [
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

export const responseStatusEnum = pgEnum("response_status", [
  "IN_PROGRESS",
  "COMPLETED",
  "ABANDONED",
]);

// Forms Table
export const formsTable = pgTable(
  "forms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    slug: varchar("slug", { length: 255 }).notNull(),
    status: formStatusEnum("status").default("DRAFT").notNull(),
    settings: jsonb("settings").$type<FormSettings>().default({
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
    }),
    theme: jsonb("theme").$type<FormTheme>().default({
      primaryColor: "#3b82f6",
      backgroundColor: "#ffffff",
      fontFamily: "Inter",
      borderRadius: "md",
    }),
    publishedAt: timestamp("published_at"),
    closedAt: timestamp("closed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("forms_slug_unique").on(table.slug),
    index("forms_user_id_idx").on(table.userId),
    index("forms_status_idx").on(table.status),
  ]
);

// Form Pages Table
export const formPagesTable = pgTable(
  "form_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => formsTable.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }),
    description: text("description"),
    position: integer("position").notNull().default(0),
    conditionalLogic: jsonb("conditional_logic").$type<ConditionalLogic | null>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("form_pages_form_id_idx").on(table.formId),
    index("form_pages_position_idx").on(table.formId, table.position),
  ]
);

// Form Fields Table
export const formFieldsTable = pgTable(
  "form_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => formsTable.id, { onDelete: "cascade" }),
    pageId: uuid("page_id")
      .notNull()
      .references(() => formPagesTable.id, { onDelete: "cascade" }),
    type: fieldTypeEnum("type").notNull(),
    label: varchar("label", { length: 500 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    placeholder: varchar("placeholder", { length: 255 }),
    description: text("description"),
    required: boolean("required").default(false).notNull(),
    validation: jsonb("validation").$type<FieldValidation>(),
    options: jsonb("options").$type<FieldOption[]>(),
    conditionalLogic: jsonb("conditional_logic").$type<ConditionalLogic | null>(),
    position: integer("position").notNull().default(0),
    settings: jsonb("settings").$type<FieldSettings>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("form_fields_form_id_idx").on(table.formId),
    index("form_fields_page_id_idx").on(table.pageId),
    index("form_fields_position_idx").on(table.pageId, table.position),
  ]
);

// Form Responses Table
export const formResponsesTable = pgTable(
  "form_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => formsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => usersTable.id, { onDelete: "set null" }),
    status: responseStatusEnum("status").default("IN_PROGRESS").notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").$type<ResponseMetadata>(),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("form_responses_form_id_idx").on(table.formId),
    index("form_responses_user_id_idx").on(table.userId),
    index("form_responses_status_idx").on(table.status),
    index("form_responses_completed_at_idx").on(table.completedAt),
  ]
);

// Response Data Table
export const responseDataTable = pgTable(
  "response_data",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    responseId: uuid("response_id")
      .notNull()
      .references(() => formResponsesTable.id, { onDelete: "cascade" }),
    fieldId: uuid("field_id")
      .notNull()
      .references(() => formFieldsTable.id, { onDelete: "cascade" }),
    value: jsonb("value").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("response_data_response_id_idx").on(table.responseId),
    index("response_data_field_id_idx").on(table.fieldId),
    uniqueIndex("response_data_response_field_unique").on(table.responseId, table.fieldId),
  ]
);

// Form Webhooks Table
export const formWebhooksTable = pgTable(
  "form_webhooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => formsTable.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    url: text("url").notNull(),
    secret: varchar("secret", { length: 255 }),
    events: jsonb("events").$type<WebhookEvent[]>().default(["RESPONSE_SUBMITTED"]),
    enabled: boolean("enabled").default(true).notNull(),
    headers: jsonb("headers").$type<Record<string, string>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("form_webhooks_form_id_idx").on(table.formId)]
);

// Webhook Logs Table
export const webhookLogsTable = pgTable(
  "webhook_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    webhookId: uuid("webhook_id")
      .notNull()
      .references(() => formWebhooksTable.id, { onDelete: "cascade" }),
    responseId: uuid("response_id").references(() => formResponsesTable.id, {
      onDelete: "set null",
    }),
    event: varchar("event", { length: 50 }).notNull(),
    statusCode: integer("status_code"),
    requestBody: jsonb("request_body"),
    responseBody: text("response_body"),
    durationMs: integer("duration_ms"),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("webhook_logs_webhook_id_idx").on(table.webhookId),
    index("webhook_logs_response_id_idx").on(table.responseId),
    index("webhook_logs_created_at_idx").on(table.createdAt),
  ]
);

// Form Templates Table
export const formTemplatesTable = pgTable(
  "form_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => usersTable.id, { onDelete: "set null" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 100 }).notNull(),
    thumbnailUrl: text("thumbnail_url"),
    formSchema: jsonb("form_schema").$type<FormTemplateSchema>().notNull(),
    isPublic: boolean("is_public").default(true).notNull(),
    usageCount: integer("usage_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("form_templates_category_idx").on(table.category),
    index("form_templates_is_public_idx").on(table.isPublic),
    index("form_templates_user_id_idx").on(table.userId),
  ]
);

// Form Analytics Table (Daily Aggregates)
export const formAnalyticsTable = pgTable(
  "form_analytics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => formsTable.id, { onDelete: "cascade" }),
    date: timestamp("date").notNull(),
    views: integer("views").default(0).notNull(),
    starts: integer("starts").default(0).notNull(),
    completions: integer("completions").default(0).notNull(),
    avgCompletionTimeSeconds: integer("avg_completion_time_seconds"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("form_analytics_form_date_unique").on(table.formId, table.date),
    index("form_analytics_form_id_idx").on(table.formId),
    index("form_analytics_date_idx").on(table.date),
  ]
);

// Relations
export const formsRelations = relations(formsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [formsTable.userId],
    references: [usersTable.id],
  }),
  pages: many(formPagesTable),
  fields: many(formFieldsTable),
  responses: many(formResponsesTable),
  webhooks: many(formWebhooksTable),
  analytics: many(formAnalyticsTable),
}));

export const formPagesRelations = relations(formPagesTable, ({ one, many }) => ({
  form: one(formsTable, {
    fields: [formPagesTable.formId],
    references: [formsTable.id],
  }),
  fields: many(formFieldsTable),
}));

export const formFieldsRelations = relations(formFieldsTable, ({ one, many }) => ({
  form: one(formsTable, {
    fields: [formFieldsTable.formId],
    references: [formsTable.id],
  }),
  page: one(formPagesTable, {
    fields: [formFieldsTable.pageId],
    references: [formPagesTable.id],
  }),
  responseData: many(responseDataTable),
}));

export const formResponsesRelations = relations(formResponsesTable, ({ one, many }) => ({
  form: one(formsTable, {
    fields: [formResponsesTable.formId],
    references: [formsTable.id],
  }),
  user: one(usersTable, {
    fields: [formResponsesTable.userId],
    references: [usersTable.id],
  }),
  data: many(responseDataTable),
}));

export const responseDataRelations = relations(responseDataTable, ({ one }) => ({
  response: one(formResponsesTable, {
    fields: [responseDataTable.responseId],
    references: [formResponsesTable.id],
  }),
  field: one(formFieldsTable, {
    fields: [responseDataTable.fieldId],
    references: [formFieldsTable.id],
  }),
}));

export const formWebhooksRelations = relations(formWebhooksTable, ({ one, many }) => ({
  form: one(formsTable, {
    fields: [formWebhooksTable.formId],
    references: [formsTable.id],
  }),
  logs: many(webhookLogsTable),
}));

export const webhookLogsRelations = relations(webhookLogsTable, ({ one }) => ({
  webhook: one(formWebhooksTable, {
    fields: [webhookLogsTable.webhookId],
    references: [formWebhooksTable.id],
  }),
  response: one(formResponsesTable, {
    fields: [webhookLogsTable.responseId],
    references: [formResponsesTable.id],
  }),
}));

// Type Definitions
export interface FormSettings {
  allowMultipleSubmissions: boolean;
  showProgressBar: boolean;
  shuffleFields: boolean;
  submitButtonText: string;
  successMessage: string;
  redirectUrl: string | null;
  closedMessage: string;
  requireLogin: boolean;
  limitResponses: number | null;
  startDate: string | null;
  endDate: string | null;
  notifyOnResponse: boolean;
}

export interface FormTheme {
  primaryColor: string;
  backgroundColor: string;
  fontFamily: string;
  borderRadius: "none" | "sm" | "md" | "lg" | "full";
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  customRules?: ValidationRule[];
}

export interface ValidationRule {
  type: "regex" | "function";
  value: string;
  message: string;
}

export interface FieldOption {
  id: string;
  label: string;
  value: string;
}

export interface FieldSettings {
  width?: "full" | "half" | "third";
  hideLabel?: boolean;
  allowOther?: boolean;
  otherLabel?: string;
  minRating?: number;
  maxRating?: number;
  ratingIcon?: "star" | "heart" | "thumbs";
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  headingLevel?: 1 | 2 | 3 | 4;
}

export interface ConditionalLogic {
  enabled: boolean;
  action: "show" | "hide" | "require";
  logicType: "all" | "any";
  conditions: Condition[];
}

export interface Condition {
  fieldId: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "greater_than"
    | "less_than"
    | "is_empty"
    | "is_not_empty";
  value: string | number | boolean | null;
}

export interface ResponseMetadata {
  referrer?: string;
  device?: "desktop" | "tablet" | "mobile";
  browser?: string;
  os?: string;
  country?: string;
  region?: string;
  city?: string;
}

export type WebhookEvent =
  | "RESPONSE_SUBMITTED"
  | "RESPONSE_UPDATED"
  | "FORM_PUBLISHED"
  | "FORM_CLOSED";

export interface FormTemplateSchema {
  pages: Array<{
    title?: string;
    description?: string;
    fields: Array<{
      type: string;
      label: string;
      name: string;
      placeholder?: string;
      description?: string;
      required?: boolean;
      validation?: FieldValidation;
      options?: FieldOption[];
      conditionalLogic?: ConditionalLogic | null;
      settings?: FieldSettings;
    }>;
  }>;
  settings?: Partial<FormSettings>;
  theme?: Partial<FormTheme>;
}

// Export types
export type SelectForm = typeof formsTable.$inferSelect;
export type InsertForm = typeof formsTable.$inferInsert;
export type SelectFormPage = typeof formPagesTable.$inferSelect;
export type InsertFormPage = typeof formPagesTable.$inferInsert;
export type SelectFormField = typeof formFieldsTable.$inferSelect;
export type InsertFormField = typeof formFieldsTable.$inferInsert;
export type SelectFormResponse = typeof formResponsesTable.$inferSelect;
export type InsertFormResponse = typeof formResponsesTable.$inferInsert;
export type SelectResponseData = typeof responseDataTable.$inferSelect;
export type InsertResponseData = typeof responseDataTable.$inferInsert;
export type SelectFormWebhook = typeof formWebhooksTable.$inferSelect;
export type InsertFormWebhook = typeof formWebhooksTable.$inferInsert;
export type SelectWebhookLog = typeof webhookLogsTable.$inferSelect;
export type InsertWebhookLog = typeof webhookLogsTable.$inferInsert;
export type SelectFormTemplate = typeof formTemplatesTable.$inferSelect;
export type InsertFormTemplate = typeof formTemplatesTable.$inferInsert;
export type SelectFormAnalytics = typeof formAnalyticsTable.$inferSelect;
export type InsertFormAnalytics = typeof formAnalyticsTable.$inferInsert;