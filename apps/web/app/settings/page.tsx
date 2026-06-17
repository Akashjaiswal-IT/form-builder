"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Spinner } from "~/components/ui/spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { trpc } from "~/trpc/client";
import { uploadFileToImageKit } from "~/lib/upload-file";

export default function SettingsPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const userQuery = trpc.auth.getCurrentUser.useQuery();

  const [fullName, setFullName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Mutations ----
  const updateNameMutation = trpc.auth.updateCurrentUser.useMutation({
    onSuccess: () => {
      toast.success("Name updated.");
      utils.auth.getCurrentUser.invalidate();
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setIsSaving(false),
  });

  const updateImageMutation = trpc.auth.updateProfileImage.useMutation({
    onSuccess: () => {
      toast.success("Profile image updated.");
      utils.auth.getCurrentUser.invalidate();
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setIsUploading(false),
  });

  // Populate the name field when user data loads
  useEffect(() => {
    if (userQuery.data) {
      setFullName(userQuery.data.fullName ?? "");
    }
  }, [userQuery.data]);

  const handleSaveName = () => {
    if (!fullName.trim()) return;
    setIsSaving(true);
    updateNameMutation.mutate({ fullName: fullName.trim() });
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5 MB.");
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await uploadFileToImageKit(file);
      updateImageMutation.mutate({
        profileImageUrl: uploaded.url,
        profileImageFileId: uploaded.fileId,
      });
    } catch (error: any) {
      toast.error(error.message ?? "Upload failed.");
      setIsUploading(false);
    }
  };

  if (userQuery.isPending) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="mr-2" /> Loading…
      </div>
    );
  }

  if (!userQuery.data) {
    router.push("/login");
    return null;
  }

  const user = userQuery.data;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Back button */}
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/forms">
            <ArrowLeft className="size-4 mr-1" /> Back to Forms
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-6">Settings</h1>

      {/* Profile Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Profile</CardTitle>
          <CardDescription>Update your personal information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={user.profileImageUrl ?? undefined} alt={user.fullName ?? ""} />
              <AvatarFallback>
                {user.fullName
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? "Uploading…" : "Change photo"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfileImageUpload}
              />
            </div>
          </div>

          <Separator />

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          {/* Email (read‑only) */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email ?? ""} disabled className="opacity-60" />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSaveName} disabled={isSaving || !fullName.trim()}>
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Password</CardTitle>
          <CardDescription>Change your account password.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/reset-password">Change password</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}