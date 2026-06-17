// packages/services/form/utils.ts
import { randomBytes } from "node:crypto";
import type { FormSettings } from "@repo/database/schema";

export const SLUG_LENGTH = 12;
export const DEFAULT_PAGE_TITLE = "Page 1";
export const MAX_FORMS_PER_USER = 100;
export const MAX_FIELDS_PER_FORM = 200;
export const MAX_PAGES_PER_FORM = 50;
export const WEBHOOK_TIMEOUT_MS = 10_000;

export function generateSlug(): string {
  return randomBytes(SLUG_LENGTH / 2).toString("hex");
}

export function generateFieldName(
  label: string,
  existingNames: string[],
): string {
  const baseName =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 50) || "field";

  let name = baseName;
  let counter = 1;
  while (existingNames.includes(name)) {
    name = `${baseName}_${counter}`;
    counter++;
  }
  return name;
}

export function isFormAcceptingResponses(
  form: { status: string; settings: FormSettings },
  responseCount: number,
): { accepting: boolean; reason?: string } {
  if (form.status !== "PUBLISHED") {
    return {
      accepting: false,
      reason: "This form is not currently accepting responses.",
    };
  }

  const { settings } = form;

  const toTimestamp = (value: string | null | undefined): number | null => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.getTime();
  };

  const now = Date.now();
  const start = toTimestamp(settings.startDate);
  const end = toTimestamp(settings.endDate);

  if (start !== null && now < start) {
    return { accepting: false, reason: "This form is not yet open for submissions." };
  }
  if (end !== null && now > end) {
    return { accepting: false, reason: "This form is no longer accepting responses." };
  }
  if (settings.limitResponses != null && responseCount >= settings.limitResponses) {
    return { accepting: false, reason: "This form has reached its response limit." };
  }

  return { accepting: true };
}