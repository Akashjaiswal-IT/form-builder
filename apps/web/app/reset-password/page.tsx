import { AuthPageShell } from "~/components/auth-page-shell"
import { ResetPasswordForm } from "~/components/reset-password-form"

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  return (
    <AuthPageShell>
      <ResetPasswordForm token={token} />
    </AuthPageShell>
  )
}
