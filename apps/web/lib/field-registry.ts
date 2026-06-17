import type { FieldType } from "~/types/form";
import type { ComponentType } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";

// ============================================================
// FIELD COMPONENT PROPS INTERFACE
// ============================================================

export interface FieldComponentProps<T extends FieldValues = FieldValues> {
  field: {
    id: string;
    type: FieldType;
    label: string;
    name: string;
    placeholder?: string | null;
    description?: string | null;
    required: boolean;
    validation?: {
      minLength?: number;
      maxLength?: number;
      min?: number;
      max?: number;
      pattern?: string;
      patternMessage?: string;
    } | null;
    options?: Array<{ id: string; label: string; value: string }> | null;
    settings: Record<string, unknown>;
  };
  control: Control<T>;
  name: Path<T>;
  disabled?: boolean;
}

// ============================================================
// FIELD METADATA
// ============================================================

export interface FieldMeta {
  type: FieldType;
  label: string;
  icon: string; // Lucide icon name for palette
  category: "basic" | "choice" | "datetime" | "layout" | "specialized";
  description: string;
  hasOptions: boolean;
  hasValidation: boolean;
  isLayoutElement: boolean;
}

export const FIELD_META: Record<FieldType, FieldMeta> = {
  TEXT: {
    type: "TEXT",
    label: "Short Text",
    icon: "Type",
    category: "basic",
    description: "Single line text input",
    hasOptions: false,
    hasValidation: true,
    isLayoutElement: false,
  },
  TEXTAREA: {
    type: "TEXTAREA",
    label: "Long Text",
    icon: "AlignLeft",
    category: "basic",
    description: "Multi-line text area",
    hasOptions: false,
    hasValidation: true,
    isLayoutElement: false,
  },
  NUMBER: {
    type: "NUMBER",
    label: "Number",
    icon: "Hash",
    category: "basic",
    description: "Numeric input",
    hasOptions: false,
    hasValidation: true,
    isLayoutElement: false,
  },
  EMAIL: {
    type: "EMAIL",
    label: "Email",
    icon: "Mail",
    category: "basic",
    description: "Email address input",
    hasOptions: false,
    hasValidation: true,
    isLayoutElement: false,
  },
  PHONE: {
    type: "PHONE",
    label: "Phone",
    icon: "Phone",
    category: "basic",
    description: "Phone number input",
    hasOptions: false,
    hasValidation: true,
    isLayoutElement: false,
  },
  URL: {
    type: "URL",
    label: "URL",
    icon: "Link",
    category: "basic",
    description: "Website URL input",
    hasOptions: false,
    hasValidation: true,
    isLayoutElement: false,
  },
  DATE: {
    type: "DATE",
    label: "Date",
    icon: "Calendar",
    category: "datetime",
    description: "Date picker",
    hasOptions: false,
    hasValidation: false,
    isLayoutElement: false,
  },
  TIME: {
    type: "TIME",
    label: "Time",
    icon: "Clock",
    category: "datetime",
    description: "Time picker",
    hasOptions: false,
    hasValidation: false,
    isLayoutElement: false,
  },
  DATETIME: {
    type: "DATETIME",
    label: "Date & Time",
    icon: "CalendarClock",
    category: "datetime",
    description: "Date and time picker",
    hasOptions: false,
    hasValidation: false,
    isLayoutElement: false,
  },
  SELECT: {
    type: "SELECT",
    label: "Dropdown",
    icon: "ChevronDown",
    category: "choice",
    description: "Single selection dropdown",
    hasOptions: true,
    hasValidation: false,
    isLayoutElement: false,
  },
  MULTI_SELECT: {
    type: "MULTI_SELECT",
    label: "Multi-Select",
    icon: "ListChecks",
    category: "choice",
    description: "Multiple selection dropdown",
    hasOptions: true,
    hasValidation: false,
    isLayoutElement: false,
  },
  RADIO: {
    type: "RADIO",
    label: "Radio Buttons",
    icon: "Circle",
    category: "choice",
    description: "Single choice from options",
    hasOptions: true,
    hasValidation: false,
    isLayoutElement: false,
  },
  CHECKBOX_GROUP: {
    type: "CHECKBOX_GROUP",
    label: "Checkbox Group",
    icon: "CheckSquare",
    category: "choice",
    description: "Multiple choices from options",
    hasOptions: true,
    hasValidation: false,
    isLayoutElement: false,
  },
  CHECKBOX: {
    type: "CHECKBOX",
    label: "Single Checkbox",
    icon: "Square",
    category: "choice",
    description: "Yes/No toggle",
    hasOptions: false,
    hasValidation: false,
    isLayoutElement: false,
  },
  FILE: {
    type: "FILE",
    label: "File Upload",
    icon: "Upload",
    category: "specialized",
    description: "File attachment",
    hasOptions: false,
    hasValidation: false,
    isLayoutElement: false,
  },
  SIGNATURE: {
    type: "SIGNATURE",
    label: "Signature",
    icon: "PenTool",
    category: "specialized",
    description: "Digital signature pad",
    hasOptions: false,
    hasValidation: false,
    isLayoutElement: false,
  },
  RATING: {
    type: "RATING",
    label: "Rating",
    icon: "Star",
    category: "specialized",
    description: "Star rating input",
    hasOptions: false,
    hasValidation: false,
    isLayoutElement: false,
  },
  SCALE: {
    type: "SCALE",
    label: "Scale",
    icon: "SlidersHorizontal",
    category: "specialized",
    description: "Numeric scale (e.g., 1-10)",
    hasOptions: false,
    hasValidation: false,
    isLayoutElement: false,
  },
  HEADING: {
    type: "HEADING",
    label: "Heading",
    icon: "Heading",
    category: "layout",
    description: "Section heading",
    hasOptions: false,
    hasValidation: false,
    isLayoutElement: true,
  },
  PARAGRAPH: {
    type: "PARAGRAPH",
    label: "Paragraph",
    icon: "Text",
    category: "layout",
    description: "Descriptive text block",
    hasOptions: false,
    hasValidation: false,
    isLayoutElement: true,
  },
  DIVIDER: {
    type: "DIVIDER",
    label: "Divider",
    icon: "Minus",
    category: "layout",
    description: "Visual separator",
    hasOptions: false,
    hasValidation: false,
    isLayoutElement: true,
  },
  HIDDEN: {
    type: "HIDDEN",
    label: "Hidden Field",
    icon: "EyeOff",
    category: "layout",
    description: "Hidden data field",
    hasOptions: false,
    hasValidation: false,
    isLayoutElement: true,
  },
};

// ============================================================
// DEFAULT FIELD CONFIGURATIONS
// ============================================================

export function getDefaultFieldConfig(type: FieldType): {
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: Record<string, unknown>;
  options?: Array<{ id: string; label: string; value: string }>;
  settings: Record<string, unknown>;
} {
  const meta = FIELD_META[type];

  const base: {
    label: string;
    required: boolean;
    settings: Record<string, unknown>;
  } = {
    label: meta.label,
    required: false,
    settings: {},
  };

  switch (type) {
    case "TEXT":
      return { ...base, placeholder: "Enter text..." };
    case "TEXTAREA":
      return { ...base, placeholder: "Enter your response..." };
    case "NUMBER":
      return { ...base, placeholder: "0" };
    case "EMAIL":
      return { ...base, placeholder: "email@example.com" };
    case "PHONE":
      return { ...base, placeholder: "+1 (555) 000-0000" };
    case "URL":
      return { ...base, placeholder: "https://example.com" };
    case "SELECT":
    case "MULTI_SELECT":
    case "RADIO":
    case "CHECKBOX_GROUP":
      return {
        ...base,
        options: [
          { id: crypto.randomUUID(), label: "Option 1", value: "option_1" },
          { id: crypto.randomUUID(), label: "Option 2", value: "option_2" },
          { id: crypto.randomUUID(), label: "Option 3", value: "option_3" },
        ],
      };
    case "RATING":
      return {
        ...base,
        settings: { minRating: 1, maxRating: 5, ratingIcon: "star" },
      };
    case "SCALE":
      return {
        ...base,
        settings: {
          scaleMin: 1,
          scaleMax: 10,
          scaleMinLabel: "Not at all",
          scaleMaxLabel: "Extremely",
        },
      };
    case "HEADING":
      return { ...base, label: "Section Title", settings: { headingLevel: 2 } };
    case "PARAGRAPH":
      return { ...base, label: "Add your description text here." };
    case "FILE":
      return {
        ...base,
        settings: { acceptedFileTypes: ["*/*"], maxFileSize: 10485760 },
      };
    default:
      return base;
  }
}

// ============================================================
// FIELD RENDERER MAP
// ============================================================

// This map will be populated by the individual field components as they are
// lazy-loaded or statically imported. It maps field types to React components.
export const FIELD_RENDERER_MAP: Partial<
  Record<FieldType, ComponentType<FieldComponentProps<FieldValues>>>
> = {};