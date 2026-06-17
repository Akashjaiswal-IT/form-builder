"use client";

import { useMemo } from "react";
import { FormRenderer } from "./form-renderer";
import type { FormSettings, FormTheme } from "~/types/form";

interface PublicFormRendererProps {
  form: {
    id: string;
    title: string;
    description?: string | null;
    settings: FormSettings;
    theme: FormTheme;
    pages: Array<{
      id: string;
      formId: string;
      title?: string | null;
      description?: string | null;
      position: number;
      conditionalLogic?: any;
      fields: Array<any>;
    }>;
  };
}

export function PublicFormRenderer({ form }: PublicFormRendererProps) {
  const cssVars = useMemo(
    () => ({
      "--form-primary": form.theme?.primaryColor || "#3b82f6",
      "--form-background": form.theme?.backgroundColor || "#ffffff",
      "--form-font-family": form.theme?.fontFamily || "Inter",
      "--form-border-radius":
        form.theme?.borderRadius === "none"
          ? "0"
          : form.theme?.borderRadius === "sm"
            ? "0.25rem"
            : form.theme?.borderRadius === "md"
              ? "0.5rem"
              : form.theme?.borderRadius === "lg"
                ? "0.75rem"
                : "9999px",
    }),
    [form.theme],
  );

  return (
    <div
      className="min-h-svh py-8 px-4"
      style={cssVars as React.CSSProperties}
    >
      <FormRenderer form={form} />
    </div>
  );
}