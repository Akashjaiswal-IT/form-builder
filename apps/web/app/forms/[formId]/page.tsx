import { BuilderClient } from "~/components/forms/builder/builder-client";

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  return <BuilderClient formId={formId} />;
}