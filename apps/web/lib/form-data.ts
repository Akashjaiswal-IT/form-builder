import type { FormField, FormPage, FormSettings, FormTheme } from "~/types/form";

export interface FullFormPayload {
  form: {
    id: string;
    title: string;
    description?: string | null;
    settings: FormSettings | null;
    theme: FormTheme | null;
  };
  pages: Array<FormPage & { fields?: FormField[] }>;
  fields?: FormField[];
}

export interface RenderableForm {
  id: string;
  title: string;
  description?: string | null;
  settings: FormSettings;
  theme: FormTheme;
  pages: Array<FormPage & { fields: FormField[] }>;
}

function normaliseJson(raw: unknown): Record<string, unknown> {
  if (raw === null || raw === undefined) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return raw as Record<string, unknown>;
}

export function toRenderableForm(payload: FullFormPayload): RenderableForm {
  // Normalise field-level settings so nothing is ever null
  const normalisedFields: FormField[] = (payload.fields ?? []).map((f) => ({
    ...f,
    settings: (f.settings ?? {}) as FormField["settings"],
  }));

  const fieldsByPage = new Map<string, FormField[]>();
  for (const field of normalisedFields) {
    const pageFields = fieldsByPage.get(field.pageId) ?? [];
    pageFields.push(field);
    fieldsByPage.set(field.pageId, pageFields);
  }

  // Normalise form‑level settings and theme
  const settings = normaliseJson(payload.form.settings);
  const theme    = normaliseJson(payload.form.theme);

  return {
    id: payload.form.id,
    title: payload.form.title,
    description: payload.form.description ?? null,
    settings: settings as unknown as FormSettings,
    theme: theme as unknown as FormTheme,
    pages: payload.pages.map((page) => ({
      ...page,
      fields: page.fields ?? fieldsByPage.get(page.id) ?? [],
    })),
  };
}