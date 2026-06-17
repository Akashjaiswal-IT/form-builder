import { FormPreviewClient } from "~/components/forms/renderer/form-preview-client";

interface PreviewPageProps {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function FormPreviewPage({
  params,
  searchParams,
}: PreviewPageProps) {
  const { formId } = await params;
  const { from } = await searchParams;

  const backLabel = from === "list" ? "Back to forms" : "Back to builder";
  const backUrl = from === "list" ? "/forms" : `/forms/${formId}`;

  return <FormPreviewClient formId={formId} backLabel={backLabel} backUrl={backUrl} />;
}