"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { PublicFormRenderer } from "~/components/forms/renderer/public-form-renderer";
import { toRenderableForm } from "~/lib/form-data";
import { trpc } from "~/trpc/client";

interface FormPreviewClientProps {
  formId: string;
  backLabel?: string;
  backUrl?: string;
}

export function FormPreviewClient({
  formId,
  backLabel = "Back to builder",
  backUrl = `/forms/${formId}`,
}: FormPreviewClientProps) {
  const formQuery = trpc.forms.getFullById.useQuery(
    { formId },
    { enabled: !!formId },
  );

  if (formQuery.isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center gap-2 text-muted-foreground">
        <Spinner />
        <span>Loading preview...</span>
      </div>
    );
  }

  if (formQuery.isError) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-destructive">Failed to load form preview.</p>
        <Button asChild variant="outline">
          <Link href="/forms">
            <ArrowLeft className="size-4" />
            Back to forms
          </Link>
        </Button>
      </div>
    );
  }

  const form = toRenderableForm(formQuery.data);

  return (
    <div className="min-h-svh">
      <div className="border-b bg-background px-4 py-3">
        <Button asChild variant="outline" size="sm">
          <Link href={backUrl}>
            <ArrowLeft className="size-4" />
            {backLabel}
          </Link>
        </Button>
      </div>
      <PublicFormRenderer form={form} />
    </div>
  );
}