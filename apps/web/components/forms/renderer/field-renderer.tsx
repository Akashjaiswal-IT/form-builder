"use client";

import type { Control, FieldValues, Path } from "react-hook-form";
import type { FieldType, FormField } from "~/types/form";
import type { FieldComponentProps } from "~/lib/field-registry";

import { TextField } from "../fields/text-field";
import { TextareaField } from "../fields/textarea-field";
import { NumberField } from "../fields/number-field";
import { EmailField } from "../fields/email-field";
import { PhoneField } from "../fields/phone-field";
import { UrlField } from "../fields/url-field";
import { DateField } from "../fields/date-field";
import { TimeField } from "../fields/time-field";
import { DatetimeField } from "../fields/datetime-field";
import { SelectField } from "../fields/select-field";
import { MultiSelectField } from "../fields/multi-select-field";
import { RadioField } from "../fields/radio-field";
import { CheckboxGroupField } from "../fields/checkbox-group-field";
import { CheckboxField } from "../fields/checkbox-field";
import { FileField } from "../fields/file-field";
import { SignatureField } from "../fields/signature-field";
import { RatingField } from "../fields/rating-field";
import { ScaleField } from "../fields/scale-field";
import { HeadingField } from "../fields/heading-field";
import { ParagraphField } from "../fields/paragraph-field";
import { DividerField } from "../fields/divider-field";
import { HiddenField } from "../fields/hidden-field";

// Map each field type to its renderer component
const FIELD_COMPONENTS: Record<
  FieldType,
  React.ComponentType<FieldComponentProps<any>>
> = {
  TEXT: TextField,
  TEXTAREA: TextareaField,
  NUMBER: NumberField,
  EMAIL: EmailField,
  PHONE: PhoneField,
  URL: UrlField,
  DATE: DateField,
  TIME: TimeField,
  DATETIME: DatetimeField,
  SELECT: SelectField,
  MULTI_SELECT: MultiSelectField,
  RADIO: RadioField,
  CHECKBOX_GROUP: CheckboxGroupField,
  CHECKBOX: CheckboxField,
  FILE: FileField,
  SIGNATURE: SignatureField,
  RATING: RatingField,
  SCALE: ScaleField,
  HEADING: HeadingField,
  PARAGRAPH: ParagraphField,
  DIVIDER: DividerField,
  HIDDEN: HiddenField,
};

interface FieldRendererProps<T extends FieldValues = FieldValues> {
  field: FormField;
  control: Control<T>;
  disabled?: boolean;
}

/**
 * Renders a single form field by delegating to the appropriate field component.
 * Uses the `name` property of the field as the form path.
 */
export function FieldRenderer<T extends FieldValues>({
  field,
  control,
  disabled = false,
}: FieldRendererProps<T>) {
  const Component = FIELD_COMPONENTS[field.type];

  if (!Component) {
    return (
      <div className="text-destructive text-sm p-2 border border-destructive rounded-md">
        Unknown field type: {field.type}
      </div>
    );
  }

  const name = field.name as Path<T>;

  return (
    <Component
      field={{
        id: field.id,
        type: field.type,
        label: field.label,
        name: field.name,
        placeholder: field.placeholder,
        description: field.description,
        required: field.required,
        validation: field.validation,
        options: field.options,
        settings: (field.settings ?? {}) as unknown as Record<string, unknown>,
      }}
      control={control as Control<FieldValues>}
      name={name}
      disabled={disabled}
    />
  );
}