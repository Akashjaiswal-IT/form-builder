"use client";

import { useId } from "react";
import { useController, type FieldValues } from "react-hook-form";

import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { FieldDescription } from "~/components/ui/field";
import { cn } from "~/lib/utils";
import type { FieldComponentProps } from "~/lib/field-registry";

export function CheckboxGroupField<T extends FieldValues>({
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

  const options = field.options ?? [];
  const selectedValues: string[] = Array.isArray(controllerField.value)
    ? controllerField.value
    : [];

  const description = field.description;

  const handleToggle = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];
    controllerField.onChange(newValues);
  };

  return (
    <div className="space-y-2">
      {!field.settings?.hideLabel && (
        <Label htmlFor={id} className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <div
        id={id}
        role="group"
        className={cn("space-y-2", error && "border border-destructive rounded-md p-3")}
        aria-required={field.required}
      >
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">No options available.</p>
        ) : (
          options.map((option) => {
            const checked = selectedValues.includes(option.value);
            return (
              <div
                key={option.id}
                className="flex items-center gap-2"
              >
                <Checkbox
                  id={`${id}-${option.id}`}
                  checked={checked}
                  onCheckedChange={() => handleToggle(option.value)}
                  disabled={disabled}
                />
                <Label
                  htmlFor={`${id}-${option.id}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            );
          })
        )}
      </div>

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