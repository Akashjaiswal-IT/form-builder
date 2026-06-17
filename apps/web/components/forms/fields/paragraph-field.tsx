"use client";

import { useId } from "react";
import type { FieldValues } from "react-hook-form";

import { cn } from "~/lib/utils";
import type { FieldComponentProps } from "~/lib/field-registry";

export function ParagraphField<T extends FieldValues>({
  field,
}: FieldComponentProps<T>) {
  const id = useId();

  return (
    <div id={id} className="text-sm text-muted-foreground leading-relaxed">
      <p>{field.label}</p>
    </div>
  );
}