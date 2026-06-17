"use client";

import { useId } from "react";
import { useController, type FieldValues } from "react-hook-form";

import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { FieldDescription } from "~/components/ui/field";
import { cn } from "~/lib/utils";
import type { FieldComponentProps } from "~/lib/field-registry";

export function CheckboxField<T extends FieldValues>({
  field,
  control,
  name,
  disabled = false,
}: FieldComponentProps<T>) {
  const id = useId();
  const {
    field: controllerField,
    fieldState: { error },
  } = useController({ name, control, disabled });

  const description = field.description;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Checkbox
          id={id}
          checked={controllerField.value === true}
          onCheckedChange={(checked) => controllerField.onChange(checked)}
          disabled={disabled}
          aria-required={field.required}
          aria-invalid={!!error}
        />
        <Label
          htmlFor={id}
          className="text-sm font-medium cursor-pointer"
        >
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
      </div>

      {description && !error && (
        <FieldDescription className="text-muted-foreground text-xs pl-6">
          {description}
        </FieldDescription>
      )}

      {error && (
        <p className="text-destructive text-xs font-medium pl-6" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}