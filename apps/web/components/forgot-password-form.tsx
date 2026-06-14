"use client"

import Link from "next/link"
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

const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address"),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordForm() {
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  const requestPasswordResetMutation =
    trpc.auth.requestPasswordReset.useMutation({
      onSuccess: (result) => {
        toast.success(result.message)
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Forgot your password?</CardTitle>
        <CardDescription>
          Enter your email and we will send a secure reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit((values) => {
            requestPasswordResetMutation.mutate(values)
          })}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="m@example.com"
                {...form.register("email")}
              />
              <FieldError errors={[form.formState.errors.email]} />
            </Field>
            <Field>
              <Button
                type="submit"
                disabled={requestPasswordResetMutation.isPending}
              >
                {requestPasswordResetMutation.isPending
                  ? "Sending reset link..."
                  : "Send reset link"}
              </Button>
              <FieldDescription className="text-center">
                Remembered it? <Link href="/login">Back to login</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
