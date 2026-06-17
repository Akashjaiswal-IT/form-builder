import { Suspense } from "react";
import { AuthPageShell } from "~/components/auth-page-shell"
import { LoginForm } from "~/components/login-form"

export default function LoginPage() {
  return (
    <AuthPageShell>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthPageShell>
  )
}
