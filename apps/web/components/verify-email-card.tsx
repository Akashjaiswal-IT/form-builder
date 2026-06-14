"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react"

import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { trpc } from "~/trpc/client"

export function VerifyEmailCard({ token }: { token?: string }) {
  const hasRequestedVerification = useRef(false)
  const verifyEmailMutation = trpc.auth.verifyEmailAddress.useMutation()

  useEffect(() => {
    if (!token || hasRequestedVerification.current) return

    hasRequestedVerification.current = true
    verifyEmailMutation.mutate({ token })
  }, [token, verifyEmailMutation])

  const isMissingToken = !token
  const isSuccess = verifyEmailMutation.isSuccess
  const isError = isMissingToken || verifyEmailMutation.isError

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-muted">
          {verifyEmailMutation.isPending ? (
            <LoaderCircle className="size-5 animate-spin" />
          ) : isSuccess ? (
            <CheckCircle2 className="size-5 text-emerald-600" />
          ) : isError ? (
            <XCircle className="size-5 text-destructive" />
          ) : (
            <LoaderCircle className="size-5 animate-spin" />
          )}
        </div>
        <CardTitle className="text-xl">
          {isSuccess
            ? "Email verified"
            : isError
              ? "Verification link unavailable"
              : "Verifying your email"}
        </CardTitle>
        <CardDescription>
          {isSuccess
            ? verifyEmailMutation.data.message
            : isMissingToken
              ? "This verification link is missing its token."
              : verifyEmailMutation.error?.message ??
                "Please wait while we verify your email address."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full">
          <Link href={isSuccess ? "/login" : "/signup"}>
            {isSuccess ? "Continue to login" : "Back to signup"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
