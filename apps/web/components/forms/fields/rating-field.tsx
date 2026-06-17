"use client";

import { useId, useState, useCallback } from "react";
import { useController, type FieldValues } from "react-hook-form";
import { Star } from "lucide-react";

import { Label } from "~/components/ui/label";
import { FieldDescription } from "~/components/ui/field";
import { cn } from "~/lib/utils";
import type { FieldComponentProps } from "~/lib/field-registry";

export function RatingField<T extends FieldValues>({
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

  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const minRating = (field.settings?.minRating as number) ?? 1;
  const maxRating = (field.settings?.maxRating as number) ?? 5;
  const ratingIcon = (field.settings?.ratingIcon as string) ?? "star";

  const currentValue = (controllerField.value as number) || 0;
  const displayValue = hoverValue ?? currentValue;

  const description = field.description;

  const handleClick = useCallback(
    (value: number) => {
      if (!disabled) {
        // Toggle off if clicking the same value again (optional)
        controllerField.onChange(value === currentValue ? 0 : value);
      }
    },
    [controllerField, currentValue, disabled],
  );

  // Choose icon component (for now only star supported, but can extend)
  const IconComponent = Star; // Lucide Star icon

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
        className="flex items-center gap-1"
        onMouseLeave={() => setHoverValue(null)}
      >
        {Array.from({ length: maxRating - minRating + 1 }, (_, i) => {
          const starValue = minRating + i;
          const filled = starValue <= displayValue;
          return (
            <button
              key={starValue}
              type="button"
              disabled={disabled}
              className={cn(
                "p-0.5 transition-colors",
                disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                filled
                  ? "text-yellow-500"
                  : "text-muted-foreground hover:text-yellow-400",
                error && "text-destructive hover:text-destructive/80",
              )}
              onMouseEnter={() => !disabled && setHoverValue(starValue)}
              onClick={() => handleClick(starValue)}
              aria-label={`Rate ${starValue} out of ${maxRating}`}
            >
              <IconComponent
                className="size-6"
                fill={filled ? "currentColor" : "none"}
                strokeWidth={1.5}
              />
            </button>
          );
        })}
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