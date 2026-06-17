"use client";

import { useId } from "react";
import type { FieldValues } from "react-hook-form";

import { cn } from "~/lib/utils";
import type { FieldComponentProps } from "~/lib/field-registry";

export function HeadingField<T extends FieldValues>({
  field,
}: FieldComponentProps<T>) {
  const id = useId();
  const headingLevel = (field.settings?.headingLevel as number) ?? 2;
  const clampedLevel = Math.min(Math.max(headingLevel, 1), 4) as 1 | 2 | 3 | 4;

  const className = cn(
    "pt-2",
    clampedLevel === 1 && "text-2xl font-bold",
    clampedLevel === 2 && "text-xl font-semibold",
    clampedLevel === 3 && "text-lg font-medium",
    clampedLevel === 4 && "text-base font-medium",
  );

  const content = <>{field.label}</>;

  return (
    <div id={id} className={className}>
      {clampedLevel === 1 && <h1>{content}</h1>}
      {clampedLevel === 2 && <h2>{content}</h2>}
      {clampedLevel === 3 && <h3>{content}</h3>}
      {clampedLevel === 4 && <h4>{content}</h4>}
    </div>
  );
}