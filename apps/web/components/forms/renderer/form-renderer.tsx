"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useForm, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Spinner } from "~/components/ui/spinner";
import { trpc } from "~/trpc/client";
import { PageRenderer } from "./page-renderer";
import { uploadFileToImageKit } from "~/lib/upload-file";
import type { FormField, FormPage, FormSettings, FormTheme } from "~/types/form";

interface FormRendererProps {
  form: {
    id: string;
    title: string;
    description?: string | null;
    settings: FormSettings;
    theme: FormTheme;                    // ← added
    pages: (FormPage & { fields: FormField[] })[];
  };
}

function shuffleFields(fields: FormField[]): FormField[] {
  const layoutTypes = new Set(["HEADING", "PARAGRAPH", "DIVIDER", "HIDDEN"]);
  const dataFields = fields.filter((f) => !layoutTypes.has(f.type));
  if (dataFields.length === 0) return fields;

  const shuffled = [...dataFields];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }

  let dataIdx = 0;
  return fields.map((f) => (layoutTypes.has(f.type) ? f : shuffled[dataIdx++]!));
}

export function FormRenderer({ form }: FormRendererProps) {
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const pages = form.pages;
  const currentPage = pages[currentPageIdx]!;
  const isMultiPage = pages.length > 1;
  const isLastPage = currentPageIdx === pages.length - 1;

  const hasTrackedStart = useRef(false);
    const trackAnalytics = trpc.forms.trackAnalytics.useMutation({
    onError: () => {},   // silently ignore tracking errors
  });

  const trackStart = () => {
    if (!hasTrackedStart.current) {
      hasTrackedStart.current = true;
      trackAnalytics.mutate({ formId: form.id, event: "start" });
    }
  };

  const validationSchema = useMemo(() => {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const page of pages) {
      for (const field of page.fields) {
        let base: z.ZodTypeAny;
        switch (field.type) {
          case "NUMBER":
          case "RATING":
          case "SCALE":
            base = z.number({ error: "Please enter a number" });
            if (field.validation?.min != null) base = (base as z.ZodNumber).min(field.validation.min);
            if (field.validation?.max != null) base = (base as z.ZodNumber).max(field.validation.max);
            break;
          case "EMAIL": base = z.string().email("Enter a valid email address"); break;
          case "URL": base = z.string().url("Enter a valid URL"); break;
          case "CHECKBOX": base = z.boolean().optional().default(false); break;
          case "CHECKBOX_GROUP":
          case "MULTI_SELECT":
            base = z.array(z.string());
            if (field.required) base = (base as z.ZodArray<z.ZodString>).min(1, "Select at least one");
            else base = base.optional().default([]);
            break;
          case "FILE":
          case "SIGNATURE": base = z.any().optional(); break;
          default:
            base = z.string();
            if (field.validation?.minLength) base = (base as z.ZodString).min(field.validation.minLength);
            if (field.validation?.maxLength) base = (base as z.ZodString).max(field.validation.maxLength);
            if (field.validation?.pattern)
              base = (base as z.ZodString).regex(new RegExp(field.validation.pattern), field.validation.patternMessage ?? "Invalid format");
            break;
        }
        if (field.required) {
          if (base instanceof z.ZodString) base = base.min(1, `${field.label} is required`);
          else if (base instanceof z.ZodBoolean) base = base.refine((v) => v === true, { message: `${field.label} must be checked` });
          else if (base instanceof z.ZodArray) base = base.min(1);
        } else { base = base.optional(); }
        shape[field.name] = base;
      }
    }
    return z.object(shape);
  }, [pages]);

  const formMethods = useForm<FieldValues>({
    resolver: zodResolver(validationSchema),
    defaultValues: {},
    shouldUnregister: false,
  });
  const { handleSubmit, control, trigger } = formMethods;

  const submitMutation = trpc.forms.submitResponse.useMutation({
    onSuccess: () => {
      trackAnalytics.mutate({ formId: form.id, event: "completion" });
      toast.success(form.settings.successMessage ?? "Thank you!");
    },
    onError: (error) => toast.error(error.message),
  });

  const onSubmit = async (data: FieldValues) => {
    setIsSubmitting(true);
    try {
      const processedData = { ...data };
      const allFields = pages.flatMap((p) => p.fields);
      for (const field of allFields) {
        if (field.type === "FILE" && field.required) {
          if (!processedData[field.name] || processedData[field.name] === null) {
            toast.error(`${field.label} is required.`);
            setIsSubmitting(false);
            return;
          }
        }
      }
      for (const field of allFields) {
        if (field.type === "FILE" && processedData[field.name] instanceof File) {
          try {
            const uploaded = await uploadFileToImageKit(processedData[field.name] as File);
            processedData[field.name] = uploaded.url;
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "File upload failed.");
            setIsSubmitting(false);
            return;
          }
        }
      }
      await submitMutation.mutateAsync({ formId: form.id, data: processedData });
      if (form.settings.redirectUrl) window.location.href = form.settings.redirectUrl;
    } catch {} finally { setIsSubmitting(false); }
  };

  const handleNext = async () => {
    const fieldNames = currentPage.fields.map((f) => f.name);
    const valid = await trigger(fieldNames);
    if (valid) setCurrentPageIdx((prev) => Math.min(prev + 1, pages.length - 1));
  };
  const handlePrevious = () => setCurrentPageIdx((prev) => Math.max(prev - 1, 0));

  const visibleFields = mounted && form.settings.shuffleFields
    ? shuffleFields(currentPage.fields)
    : currentPage.fields;

  const primaryColor = form.theme?.primaryColor || "#3b82f6";

  return (
    <div className="min-h-svh w-full flex items-start justify-center"
      style={{
        fontFamily: form.theme?.fontFamily || undefined,
      }}
    >
      <div className="w-full max-w-2xl mx-auto p-4 md:p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">{form.title}</h1>
          {form.description && <p className="text-muted-foreground">{form.description}</p>}
        </div>

        {isMultiPage && form.settings.showProgressBar && (
          <Progress value={((currentPageIdx + 1) / pages.length) * 100} />
        )}

        <form onSubmit={handleSubmit(onSubmit)} onChange={trackStart} className="space-y-6">
          {currentPage.title && <h2 className="text-lg font-medium">{currentPage.title}</h2>}
          {currentPage.description && <p className="text-sm text-muted-foreground">{currentPage.description}</p>}

          <PageRenderer
            fields={visibleFields}
            control={control}
            disabled={isSubmitting}
            hasNextPage={isMultiPage && !isLastPage}
            hasPreviousPage={isMultiPage && currentPageIdx > 0}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />

          {isLastPage && (
            <div className="flex justify-end pt-4 border-t">
              <Button
                type="submit"
                disabled={isSubmitting}
                style={{
                  backgroundColor: primaryColor,
                  borderColor: primaryColor,
                  borderRadius: form.theme?.borderRadius === "none" ? "0" :
                               form.theme?.borderRadius === "sm" ? "0.25rem" :
                               form.theme?.borderRadius === "md" ? "0.5rem" :
                               form.theme?.borderRadius === "lg" ? "0.75rem" :
                               form.theme?.borderRadius === "full" ? "9999px" : undefined,
                }}
              >
                {isSubmitting ? <Spinner className="mr-2" /> : null}
                {isSubmitting ? "Submitting..." : (form.settings.submitButtonText ?? "Submit")}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}