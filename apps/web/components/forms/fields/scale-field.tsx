"use client";

import { useId } from "react";
import { useController, type FieldValues } from "react-hook-form";

import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { FieldDescription } from "~/components/ui/field";
import { cn } from "~/lib/utils";
import type { FieldComponentProps } from "~/lib/field-registry";

export function ScaleField<T extends FieldValues>({
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

  const scaleMin = (field.settings?.scaleMin as number) ?? 1;
  const scaleMax = (field.settings?.scaleMax as number) ?? 10;
  const scaleMinLabel = (field.settings?.scaleMinLabel as string) ?? "";
  const scaleMaxLabel = (field.settings?.scaleMaxLabel as string) ?? "";

  const description = field.description;

  // Generate scale values from min to max inclusive
  const scaleValues = Array.from(
    { length: scaleMax - scaleMin + 1 },
    (_, i) => scaleMin + i,
  );

  return (
    <div className="space-y-2">
      {!field.settings?.hideLabel && (
        <Label htmlFor={id} className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <RadioGroup
        id={id}
        value={
          controllerField.value != null
            ? String(controllerField.value)
            : undefined
        }
        onValueChange={(val) => controllerField.onChange(Number(val))}
        disabled={disabled}
        aria-required={field.required}
        className="space-y-3"
      >
        <div className="flex items-center gap-4">
          {scaleValues.map((value) => (
            <div
              key={value}
              className="flex flex-col items-center gap-1 flex-1"
            >
              <RadioGroupItem
                value={String(value)}
                id={`${id}-${value}`}
                disabled={disabled}
                className="mx-auto"
              />
              <Label
                htmlFor={`${id}-${value}`}
                className="text-sm font-normal cursor-pointer"
              >
                {value}
              </Label>
            </div>
          ))}
        </div>
        {(scaleMinLabel || scaleMaxLabel) && (
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>{scaleMinLabel}</span>
            <span>{scaleMaxLabel}</span>
          </div>
        )}
      </RadioGroup>

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