"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { cn } from "~/lib/utils"
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

const signupSchema = z
  .object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must include an uppercase letter")
      .regex(/[a-z]/, "Password must include a lowercase letter")
      .regex(/[0-9]/, "Password must include a number"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    profileImage: z.any().optional(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })

type SignupFormValues = z.infer<typeof signupSchema>

type UploadedImageKitFile = {
  url?: string
  fileId?: string
}

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false)
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const imageKitAuthQuery =
    trpc.auth.getImageKitUploadAuthenticationParameters.useQuery(undefined, {
      enabled: false,
    })

  const signUpMutation = trpc.auth.signUpWithEmailAndPassword.useMutation({
    onSuccess: (result) => {
      toast.success(result.message)
      router.push("/login")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  async function uploadProfileImage(file: File) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Profile image must be an image file.")
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Profile image must be smaller than 5 MB.")
    }

    const authResult = await imageKitAuthQuery.refetch()

    if (!authResult.data) {
      throw new Error("Unable to prepare profile image upload.")
    }

    const fileName = `${globalThis.crypto.randomUUID()}-${file.name}`
    const formData = new FormData()
    formData.append("file", file)
    formData.append("fileName", fileName)
    formData.append("folder", "/form-builder/profiles")
    formData.append("publicKey", authResult.data.publicKey)
    formData.append("signature", authResult.data.signature)
    formData.append("expire", String(authResult.data.expire))
    formData.append("token", authResult.data.token)

    const uploadResponse = await fetch(
      "https://upload.imagekit.io/api/v1/files/upload",
      {
        method: "POST",
        body: formData,
      },
    )

    if (!uploadResponse.ok) {
      throw new Error("Profile image upload failed.")
    }

    const uploadedFile = (await uploadResponse.json()) as UploadedImageKitFile

    if (!uploadedFile.url) {
      throw new Error("ImageKit did not return a profile image URL.")
    }

    return {
      profileImageUrl: uploadedFile.url,
      profileImageFileId: uploadedFile.fileId,
    }
  }

  async function onSubmit(values: SignupFormValues) {
    const file = values.profileImage?.[0] as File | undefined
    let uploadedProfileImage:
      | { profileImageUrl: string; profileImageFileId?: string }
      | undefined

    try {
      if (file) {
        setIsUploadingProfileImage(true)
        uploadedProfileImage = await uploadProfileImage(file)
      }

      signUpMutation.mutate({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        ...uploadedProfileImage,
      })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Profile image upload failed.",
      )
    } finally {
      setIsUploadingProfileImage(false)
    }
  }

  const isSubmitting = signUpMutation.isPending || isUploadingProfileImage

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Enter your email below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  autoComplete="name"
                  {...form.register("fullName")}
                  required
                />
                <FieldError errors={[form.formState.errors.fullName]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  autoComplete="email"
                  {...form.register("email")}
                  required
                />
                <FieldError errors={[form.formState.errors.email]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="profileImage">
                  Profile image optional
                </FieldLabel>
                <Input
                  id="profileImage"
                  type="file"
                  accept="image/*"
                  {...form.register("profileImage")}
                />
                <FieldDescription>
                  Uploaded through ImageKit. Maximum size: 5 MB.
                </FieldDescription>
              </Field>
              <Field>
                <Field className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      {...form.register("password")}
                      required
                    />
                    <FieldError errors={[form.formState.errors.password]} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Confirm Password
                    </FieldLabel>
                    <Input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      {...form.register("confirmPassword")}
                      required
                    />
                    <FieldError
                      errors={[form.formState.errors.confirmPassword]}
                    />
                  </Field>
                </Field>
                <FieldDescription>
                  Use at least 8 characters with uppercase, lowercase, and a
                  number.
                </FieldDescription>
              </Field>
              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {isUploadingProfileImage
                    ? "Uploading image..."
                    : signUpMutation.isPending
                      ? "Creating account..."
                      : "Create Account"}
                </Button>
                <FieldDescription className="text-center">
                  Already have an account? <Link href="/login">Sign in</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <Link href="#">Terms of Service</Link>{" "}
        and <Link href="#">Privacy Policy</Link>.
      </FieldDescription>
    </div>
  )
}
