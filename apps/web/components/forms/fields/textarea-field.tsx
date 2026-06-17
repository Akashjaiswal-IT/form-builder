"use client";

import { useId } from "react";
import { useController, type Control, type FieldValues, type Path } from "react-hook-form";

import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { FieldDescription } from "~/components/ui/field";
import { cn } from "~/lib/utils";
import type { FieldComponentProps } from "~/lib/field-registry";

export function TextareaField<T extends FieldValues>({
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

  const placeholder = field.placeholder ?? "Enter your response...";
  const description = field.description;
  const maxLength = field.validation?.maxLength;
  const minLength = field.validation?.minLength;

  return (
    <div className="space-y-2">
      {!field.settings?.hideLabel && (
        <Label htmlFor={id} className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <Textarea
        id={id}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        minLength={minLength}
        rows={4}
        aria-required={field.required}
        aria-invalid={!!error}
        className={cn(error && "border-destructive focus-visible:ring-destructive")}
        {...controllerField}
      />

      {description && !error && (
        <FieldDescription className="text-muted-foreground text-xs">
          {description}
        </FieldDescription>
      )}

      {error && (
        <p className="text-destructive text-xs font-medium" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}