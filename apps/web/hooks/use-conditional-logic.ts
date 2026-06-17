"use client";

import { useMemo } from "react";
import { useWatch, type Control, type FieldValues } from "react-hook-form";
import type { ConditionalLogic } from "~/types/form";
import { evaluateAllFieldLogic } from "~/lib/conditional-logic";

interface FieldWithLogic {
  id: string;
  name: string;
  required: boolean;
  conditionalLogic?: ConditionalLogic | null;
}

/**
 * Hook that watches all form values and evaluates conditional logic for every field.
 * Returns helpers to check visibility and required state per field.
 */
export function useConditionalLogic<T extends FieldValues>(
  fields: FieldWithLogic[],
  control: Control<T>,
) {
  // Watch all form values
  const values = useWatch({ control }) as Record<string, unknown>;

  // Memoize the evaluation to prevent unnecessary recalculations
  const fieldStates = useMemo(() => {
    return evaluateAllFieldLogic(fields, values);
  }, [fields, values]);

  return {
    /**
     * Get full visibility and requirement state for a specific field.
     */
    getFieldState: (fieldName: string) => {
      return fieldStates.get(fieldName) ?? { visible: true, required: false };
    },

    /**
     * Quick check if a field should be visible.
     */
    isFieldVisible: (fieldName: string) => {
      return fieldStates.get(fieldName)?.visible ?? true;
    },

    /**
     * Quick check if a field is required (base or conditional).
     */
    isFieldRequired: (fieldName: string) => {
      return fieldStates.get(fieldName)?.required ?? false;
    },

    /**
     * The full map of field states.
     */
    fieldStates,
  };
}