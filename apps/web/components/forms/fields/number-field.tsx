"use client";

import { useId } from "react";
import { useController, type Control, type FieldValues, type Path } from "react-hook-form";

import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { FieldDescription } from "~/components/ui/field";
import { cn } from "~/lib/utils";
import type { FieldComponentProps } from "~/lib/field-registry";

export function NumberField<T extends FieldValues>({
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

  const placeholder = field.placeholder ?? "0";
  const description = field.description;
  const min = field.validation?.min;
  const max = field.validation?.max;
  const step = field.settings?.step as number | undefined;

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
        type="number"
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        step={step ?? 1}
        aria-required={field.required}
        aria-invalid={!!error}
        className={cn(error && "border-destructive focus-visible:ring-destructive")}
        {...controllerField}
        onChange={(e) => {
          const val = e.target.value;
          // Ensure value is parsed as number or empty string for react-hook-form
          controllerField.onChange(val === "" ? "" : Number(val));
        }}
        value={controllerField.value ?? ""}
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