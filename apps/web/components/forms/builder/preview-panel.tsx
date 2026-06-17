"use client";

import { useFormBuilderStore } from "~/stores/form-builder-store";
import { FormRenderer } from "../renderer/form-renderer";

interface PreviewPanelProps {
  formId?: string | null;
}

export function PreviewPanel({ formId }: PreviewPanelProps) {
  const title = useFormBuilderStore((s) => s.title);
  const description = useFormBuilderStore((s) => s.description);
  const schema = useFormBuilderStore((s) => s.schema);

  const form = {
    id: formId ?? "preview",
    title,
    description: description || null,
    settings: schema.settings,
    theme: schema.theme,
    pages: schema.pages.map((page) => ({
      id: page.id,
      formId: formId ?? "preview",
      title: page.title ?? null,
      description: page.description ?? null,
      position: page.position,
      conditionalLogic: page.conditionalLogic,
      fields: page.fields.map((field) => ({
        id: field.id,
        formId: formId ?? "preview",
        pageId: page.id,
        type: field.type,
        label: field.label,
        name: field.name,
        placeholder: field.placeholder ?? null,
        description: field.description ?? null,
        required: field.required,
        validation: field.validation ?? null,
        options: field.options ?? null,
        conditionalLogic: field.conditionalLogic ?? null,
        position: field.position,
        settings: field.settings,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  };

  return (
    <div className="absolute inset-0 overflow-auto bg-muted/20">
      <FormRenderer form={form} />
    </div>
  );
}