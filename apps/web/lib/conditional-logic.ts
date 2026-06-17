import type { Condition, ConditionalLogic } from "~/types/form";

/**
 * Helper to coerce a value to a number if possible, otherwise return null.
 */
function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isNaN(value) ? null : value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

/**
 * Compare two values for equality, with coercion for numbers and booleans.
 */
function valuesAreEqual(
  fieldValue: unknown,
  conditionValue: Condition["value"]
): boolean {
  // Strict equality first
  if (fieldValue === conditionValue) return true;

  // Coerce boolean and numeric strings
  if (typeof fieldValue === "boolean") {
    const condVal =
      conditionValue === "true"
        ? true
        : conditionValue === "false"
          ? false
          : conditionValue;
    return fieldValue === condVal;
  }

  const fieldNum = toNumber(fieldValue);
  const conditionNum = toNumber(conditionValue);
  if (fieldNum !== null && conditionNum !== null) {
    return fieldNum === conditionNum;
  }

  // String comparison
  return String(fieldValue) === String(conditionValue);
}

/**
 * Compare two values for magnitude, coercing both to numbers.
 * Returns false if either side cannot be parsed as a number.
 */
function compareValues(
  fieldValue: unknown,
  conditionValue: Condition["value"],
  type: "greater_than" | "less_than"
): boolean {
  const fieldNum = toNumber(fieldValue);
  const conditionNum = toNumber(conditionValue);
  if (fieldNum === null || conditionNum === null) return false;
  return type === "greater_than" ? fieldNum > conditionNum : fieldNum < conditionNum;
}

/**
 * Evaluates a single condition against the current form values.
 * IMPORTANT: `condition.fieldId` must already be resolved to a **name**
 * (not a UUID) before calling this function.
 */
export function evaluateCondition(
  condition: Condition,
  values: Record<string, unknown>
): boolean {
  const fieldValue = values[condition.fieldId]; // now keyed by name
  const { operator, value: conditionValue } = condition;

  switch (operator) {
    case "equals":
      return valuesAreEqual(fieldValue, conditionValue);

    case "not_equals":
      return !valuesAreEqual(fieldValue, conditionValue);

    case "contains":
      if (typeof fieldValue === "string" && typeof conditionValue === "string") {
        return fieldValue.toLowerCase().includes(conditionValue.toLowerCase());
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(conditionValue);
      }
      return false;

    case "not_contains":
      if (typeof fieldValue === "string" && typeof conditionValue === "string") {
        return !fieldValue.toLowerCase().includes(conditionValue.toLowerCase());
      }
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(conditionValue);
      }
      return true;

    case "greater_than":
      return compareValues(fieldValue, conditionValue, "greater_than");

    case "less_than":
      return compareValues(fieldValue, conditionValue, "less_than");

    case "is_empty":
      return (
        fieldValue === null ||
        fieldValue === undefined ||
        fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );

    case "is_not_empty":
      return !(
        fieldValue === null ||
        fieldValue === undefined ||
        fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );

    default:
      return false;
  }
}

/**
 * Evaluates conditional logic against form values.
 * Returns the visibility and conditional requirement state of the field.
 */
export function evaluateConditionalLogic(
  logic: ConditionalLogic | null | undefined,
  values: Record<string, unknown>
): { visible: boolean; required: boolean } {
  if (!logic || !logic.enabled || logic.conditions.length === 0) {
    return { visible: true, required: false };
  }

  const { action, logicType, conditions } = logic;

  const results = conditions.map((condition) =>
    evaluateCondition(condition, values)
  );

  const conditionsMet =
    logicType === "all"
      ? results.every(Boolean)
      : results.some(Boolean);

  switch (action) {
    case "show":
      return { visible: conditionsMet, required: false };
    case "hide":
      return { visible: !conditionsMet, required: false };
    case "require":
      return { visible: true, required: conditionsMet };
    default:
      return { visible: true, required: false };
  }
}

/**
 * Evaluates conditional logic for a list of fields and returns a Map
 * of field names to their visibility and required states.
 *
 * **Critical fix**: resolves condition.fieldId (UUID) to field.name
 * so that the actual form values can be read.
 */
export function evaluateAllFieldLogic(
  fields: Array<{
    id: string;
    name: string;
    required: boolean;
    conditionalLogic?: ConditionalLogic | null;
  }>,
  values: Record<string, unknown>
): Map<string, { visible: boolean; required: boolean }> {
  // Map field UUID -> field name
  const idToName = new Map(fields.map((f) => [f.id, f.name]));

  const result = new Map<string, { visible: boolean; required: boolean }>();

  for (const field of fields) {
    const logic = field.conditionalLogic;

    // Replace condition.fieldId (UUID) with the actual field name
    let resolvedLogic = logic;
    if (logic?.enabled && logic.conditions.length > 0) {
      resolvedLogic = {
        ...logic,
        conditions: logic.conditions.map((c) => ({
          ...c,
          fieldId: idToName.get(c.fieldId) ?? c.fieldId,
        })),
      };
    }

    const logicResult = evaluateConditionalLogic(resolvedLogic, values);
    result.set(field.name, {
      visible: logicResult.visible,
      required:
        logicResult.visible && (field.required || logicResult.required),
    });
  }

  return result;
}