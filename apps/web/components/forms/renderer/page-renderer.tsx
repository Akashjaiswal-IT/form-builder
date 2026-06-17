"use client";

import type { Control, FieldValues } from "react-hook-form";
import type { FormField } from "~/types/form";
import { useConditionalLogic } from "~/hooks/use-conditional-logic";
import { FieldRenderer } from "./field-renderer";

interface PageRendererProps<T extends FieldValues = FieldValues> {
  fields: FormField[];
  control: Control<T>;
  disabled?: boolean;
  onNext?: () => void;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  onPrevious?: () => void;
}

export function PageRenderer<T extends FieldValues>({
  fields,
  control,
  disabled = false,
  onNext,
  hasNextPage,
  hasPreviousPage,
  onPrevious,
}: PageRendererProps<T>) {
  const fieldMetas = fields.map((f) => ({
    id: f.id,
    name: f.name,
    required: f.required,
    conditionalLogic: f.conditionalLogic,
  }));

  const { isFieldVisible, isFieldRequired } = useConditionalLogic(
    fieldMetas,
    control,
  );

  // Map width setting to Tailwind class
  const widthClass = (width?: string) => {
    if (width === "half") return "w-1/2";
    if (width === "third") return "w-1/3";
    return "w-full";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {fields.map((field) => {
          const visible = isFieldVisible(field.name);
          if (!visible) return null;

          const modifiedField = {
            ...field,
            required: isFieldRequired(field.name),
          };

          return (
            <div
              key={field.id}
              className={widthClass(field.settings?.width)}
            >
              <FieldRenderer<T>
                field={modifiedField}
                control={control}
                disabled={disabled}
              />
            </div>
          );
        })}
      </div>

      {(hasNextPage || hasPreviousPage) && (
        <div className="flex justify-between pt-4 border-t">
          <div>
            {hasPreviousPage && (
              <button
                type="button"
                onClick={onPrevious}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:outline-none"
              >
                Previous
              </button>
            )}
          </div>
          <div>
            {hasNextPage && (
              <button
                type="button"
                onClick={onNext}
                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-xs hover:bg-primary/90 transition-colors focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:outline-none"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}