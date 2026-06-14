"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import { trpc } from "~/trpc/client"

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must include an uppercase letter")
      .regex(/[a-z]/, "Password must include a lowercase letter")
      .regex(/[0-9]/, "Password must include a number"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export function ResetPasswordForm({ token }: { token?: string }) {
  const router = useRouter()
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  })

  const resetPasswordMutation = trpc.auth.resetPasswordWithToken.useMutation({
    onSuccess: (result) => {
      toast.success(result.message)
      router.push("/login")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Choose a new password</CardTitle>
        <CardDescription>
          Your new password will sign out any existing sessions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!token ? (
          <FieldDescription className="text-center">
            This reset link is missing its token.{" "}
            <Link href="/forgot-password">Request a new link</Link>.
          </FieldDescription>
        ) : (
          <form
            onSubmit={form.handleSubmit((values) => {
              resetPasswordMutation.mutate({
                token,
                newPassword: values.newPassword,
              })
            })}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="newPassword">New password</FieldLabel>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  {...form.register("newPassword")}
                />
                <FieldError errors={[form.formState.errors.newPassword]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword">
                  Confirm new password
                </FieldLabel>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...form.register("confirmPassword")}
                />
                <FieldError errors={[form.formState.errors.confirmPassword]} />
              </Field>
              <FieldDescription>
                Use at least 8 characters with uppercase, lowercase, and a
                number.
              </FieldDescription>
              <Button type="submit" disabled={resetPasswordMutation.isPending}>
                {resetPasswordMutation.isPending
                  ? "Resetting password..."
                  : "Reset password"}
              </Button>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
