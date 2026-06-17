import type { FormField, FormPage, FormSettings, FormTheme } from "~/types/form";

// Raw field shape from tRPC – settings may be null
type RawFormField = Omit<FormField, "settings"> & {
  settings: FormField["settings"] | null;
};

export interface FullFormPayload {
  form: {
    id: string;
    title: string;
    description?: string | null;
    settings: FormSettings | null;
    theme: FormTheme | null;
  };
  // Omit<FormPage, "fields"> prevents the intersection from collapsing
  // RawFormField back to FormField
  pages: Array<Omit<FormPage, "fields"> & { fields?: RawFormField[] }>;
  fields?: RawFormField[];
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
  // Normalise every field's settings so nothing is ever null
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
  const theme = normaliseJson(payload.form.theme);

  return {
    id: payload.form.id,
    title: payload.form.title,
    description: payload.form.description ?? null,
    settings: settings as unknown as FormSettings,
    theme: theme as unknown as FormTheme,
    pages: payload.pages.map((page) => ({
      ...page,
      fields: (page.fields ?? fieldsByPage.get(page.id) ?? []).map((f) => ({
        ...f,
        settings: (f.settings ?? {}) as FormField["settings"],
      })),
    })),
  };
}