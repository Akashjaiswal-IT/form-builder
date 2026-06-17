"use client";

import { useId } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { useController } from "react-hook-form";

import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { FieldDescription } from "~/components/ui/field";
import { cn } from "~/lib/utils";
import type { FieldComponentProps } from "~/lib/field-registry";

export function TextField<T extends FieldValues>({
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

  const placeholder = field.placeholder ?? "Enter text...";
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

      <Input
        id={id}
        type="text"
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        minLength={minLength}
        aria-required={field.required}
        aria-invalid={!!error}
        className={cn(error && "border-destructive focus-visible:ring-destructive")}
        {...controllerField}
        value={controllerField.value ?? ""}
      />

      {description && !error && (
        <FieldDescription className="text-muted-foreground text-xs">{description}</FieldDescription>
      )}

      {error && (
        <p className="text-destructive text-xs font-medium" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}
