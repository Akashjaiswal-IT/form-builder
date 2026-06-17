"use client";

import { useId } from "react";
import { useController, type FieldValues } from "react-hook-form";

import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { FieldDescription } from "~/components/ui/field";
import { cn } from "~/lib/utils";
import type { FieldComponentProps } from "~/lib/field-registry";

export function RadioField<T extends FieldValues>({
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
  const description = field.description;

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
        value={controllerField.value ?? undefined}
        onValueChange={(value) => controllerField.onChange(value)}
        disabled={disabled}
        aria-required={field.required}
        className={cn(error && "border border-destructive rounded-md p-3")}
      >
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">No options available.</p>
        ) : (
          options.map((option) => (
            <div key={option.id} className="flex items-center gap-2">
              <RadioGroupItem
                value={option.value}
                id={`${id}-${option.id}`}
                disabled={disabled}
              />
              <Label
                htmlFor={`${id}-${option.id}`}
                className="text-sm font-normal cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))
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