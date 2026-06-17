// ============================================================
// ENUMS & CONSTANTS
// ============================================================

export const FIELD_TYPES = [
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
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_CATEGORIES = {
  basic: ["TEXT", "TEXTAREA", "NUMBER", "EMAIL", "PHONE", "URL"] as const,
  choice: ["SELECT", "MULTI_SELECT", "RADIO", "CHECKBOX_GROUP", "CHECKBOX"] as const,
  datetime: ["DATE", "TIME", "DATETIME"] as const,
  layout: ["HEADING", "PARAGRAPH", "DIVIDER", "HIDDEN"] as const,
  specialized: ["FILE", "SIGNATURE", "RATING", "SCALE"] as const,
} as const;

export type FieldCategory = keyof typeof FIELD_CATEGORIES;

export const FORM_STATUSES = ["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"] as const;
export type FormStatus = (typeof FORM_STATUSES)[number];

export const RESPONSE_STATUSES = ["IN_PROGRESS", "COMPLETED", "ABANDONED"] as const;
export type ResponseStatus = (typeof RESPONSE_STATUSES)[number];

export const WEBHOOK_EVENTS = [
  "RESPONSE_SUBMITTED",
  "RESPONSE_UPDATED",
  "FORM_PUBLISHED",
  "FORM_CLOSED",
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

// ============================================================
// FIELD-LEVEL TYPES
// ============================================================

export interface FieldOption {
  id: string;
  label: string;
  value: string;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
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

export interface ConditionalLogic {
  enabled: boolean;
  action: "show" | "hide" | "require";
  logicType: "all" | "any";
  conditions: Condition[];
}

// ============================================================
// FORM SCHEMA TYPES
// ============================================================

export interface FormField {
  id: string;
  formId: string;
  pageId: string;
  type: FieldType;
  label: string;
  name: string;
  placeholder?: string | null;
  description?: string | null;
  required: boolean;
  validation?: FieldValidation | null;
  options?: FieldOption[] | null;
  conditionalLogic?: ConditionalLogic | null;
  position: number;
  settings: FieldSettings;
}

export interface FormPage {
  id: string;
  formId: string;
  title?: string | null;
  description?: string | null;
  position: number;
  conditionalLogic?: ConditionalLogic | null;
}

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

export interface Form {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  slug: string;
  status: FormStatus;
  settings: FormSettings;
  theme: FormTheme;
  publishedAt?: Date | null;
  closedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// BUILDER-SPECIFIC TYPES
// ============================================================

export interface BuilderField extends Omit<FormField, "id" | "formId" | "pageId"> {
  id: string; // client-generated UUID for new fields
}

export interface BuilderPage extends Omit<FormPage, "id" | "formId"> {
  id: string;
  fields: BuilderField[];
}

export interface BuilderFormSchema {
  pages: BuilderPage[];
  settings: FormSettings;
  theme: FormTheme;
}

// ============================================================
// RESPONSE TYPES
// ============================================================

export interface ResponseMetadata {
  referrer?: string;
  device?: "desktop" | "tablet" | "mobile";
  browser?: string;
  os?: string;
  country?: string;
  region?: string;
  city?: string;
}

export interface FormResponse {
  id: string;
  formId: string;
  userId?: string | null;
  status: ResponseStatus;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: ResponseMetadata | null;
  startedAt: Date;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  data?: ResponseFieldData[];
}

export interface ResponseFieldData {
  id: string;
  responseId: string;
  fieldId: string;
  value: unknown;
  createdAt: Date;
}