"use client";

import { useId } from "react";
import { useController, type FieldValues } from "react-hook-form";

import { Input } from "~/components/ui/input";
import type { FieldComponentProps } from "~/lib/field-registry";

/**
 * Renders a hidden input field. Visually nothing is rendered.
 */
export function HiddenField<T extends FieldValues>({
  field,
  control,
  name,
  disabled = false,
}: FieldComponentProps<T>) {
  const { field: controllerField } = useController({ name, control, disabled });

  return (
    <input
      type="hidden"
      {...controllerField}
      value={controllerField.value ?? ""}
    />
  );
}