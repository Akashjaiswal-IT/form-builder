"use client";

import { useId, useState, useCallback } from "react";
import { useController, type FieldValues } from "react-hook-form";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { FieldDescription } from "~/components/ui/field";
import { cn } from "~/lib/utils";
import type { FieldComponentProps } from "~/lib/field-registry";

export function MultiSelectField<T extends FieldValues>({
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
  const [open, setOpen] = useState(false);
  const placeholder = field.placeholder ?? "Select options";
  const description = field.description;

  const handleToggle = useCallback(
    (value: string) => {
      const newValues = selectedValues.includes(value)
        ? selectedValues.filter((v) => v !== value)
        : [...selectedValues, value];
      controllerField.onChange(newValues);
    },
    [selectedValues, controllerField],
  );

  const displayText =
    selectedValues.length > 0
      ? `${selectedValues.length} selected`
      : placeholder;

  return (
    <div className="space-y-2">
      {!field.settings?.hideLabel && (
        <Label htmlFor={id} className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              !selectedValues.length && "text-muted-foreground",
              error && "border-destructive focus-visible:ring-destructive",
            )}
            disabled={disabled}
          >
            {displayText}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-2">
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground p-2">No options available.</p>
          ) : (
            <div className="space-y-1">
              {options.map((option) => {
                const isChecked = selectedValues.includes(option.value);
                return (
                  <div
                    key={option.id}
                    onClick={() => handleToggle(option.value)}
                    className={cn(
                      "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                      isChecked && "bg-accent/50",
                    )}
                  >
                    <Checkbox
                      checked={isChecked}
                      className="pointer-events-none"
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                    <span className="flex-1">{option.label}</span>
                    {isChecked && <Check className="h-4 w-4 text-muted-foreground" />}
                  </div>
                );
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>

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