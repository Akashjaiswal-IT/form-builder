import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { PublicFormRenderer } from "~/components/forms/renderer/public-form-renderer";
import { toRenderableForm } from "~/lib/form-data";
import { api } from "~/trpc/server";
import { userService } from "@repo/trpc/server/services";
import type { FormSettings, FormTheme } from "~/types/form";

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let result;
  try {
    result = await api.forms.getBySlug.query({ slug });
  } catch (error) {
    const trpcCode = (error as { data?: { code?: string } }).data?.code;
    if (trpcCode === "NOT_FOUND") notFound();
    throw error;
  }

  if (!result) notFound();

  // Analytics: track a view (fire-and-forget)
  api.forms.trackAnalytics
    .mutate({ formId: result.form.id, event: "view" })
    .catch(() => {});

  const requireLogin = result.form.settings?.requireLogin === true;

  if (requireLogin) {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("form_builder_session")?.value;

    const user = sessionToken
      ? await userService.getAuthenticatedUserBySessionToken(sessionToken)
      : null;

    if (!user) {
      redirect(`/login?next=/forms/public/${slug}`);
    }
  }

  // Ensure settings/theme are non-null for the renderer
  const safeResult = {
    ...result,
    form: {
      ...result.form,
      settings: (result.form.settings ?? {}) as FormSettings,
      theme: (result.form.theme ?? {}) as FormTheme,
    },
  };

  return <PublicFormRenderer form={toRenderableForm(safeResult)} />;
}