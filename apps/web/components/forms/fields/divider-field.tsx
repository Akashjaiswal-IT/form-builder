"use client";

import { useId } from "react";
import type { FieldValues } from "react-hook-form";

import { Separator } from "~/components/ui/separator";
import type { FieldComponentProps } from "~/lib/field-registry";

export function DividerField<T extends FieldValues>({
  field,
}: FieldComponentProps<T>) {
  const id = useId();

  return (
    <div id={id} className="py-2">
      <Separator />
    </div>
  );
}