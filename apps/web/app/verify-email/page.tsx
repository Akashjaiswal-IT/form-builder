import { AuthPageShell } from "~/components/auth-page-shell"
import { VerifyEmailCard } from "~/components/verify-email-card"

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  return (
    <AuthPageShell>
      <VerifyEmailCard token={token} />
    </AuthPageShell>
  )
}
