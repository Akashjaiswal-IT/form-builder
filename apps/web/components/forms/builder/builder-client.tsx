"use client";

import dynamic from "next/dynamic";

const FormBuilder = dynamic(
  () => import("~/components/forms/builder/form-builder").then((mod) => mod.FormBuilder),
  { ssr: false }
);

export function BuilderClient({ formId }: { formId: string }) {
  return <FormBuilder formId={formId} />;
}