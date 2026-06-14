"use client";

import Link from "next/link";
import { FileText, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { trpc } from "~/trpc/client";

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const utils = trpc.useUtils();
  const currentUserQuery = trpc.auth.getCurrentUser.useQuery(undefined);
  const signOutMutation = trpc.auth.signOut.useMutation({
    onSuccess: async (result) => {
      toast.success(result.message);
      await utils.auth.getCurrentUser.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const currentUser = currentUserQuery.data;

  if (!isMounted) {
    return null;
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FileText className="size-5" />
          </div>
          <CardTitle className="text-2xl">Form Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {currentUserQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Checking your session...</p>
          ) : currentUser ? (
            <>
              <div className="space-y-1">
                <p className="font-medium">Welcome, {currentUser.fullName}</p>
                <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                <p className="text-sm text-muted-foreground">
                  Your authenticated Form Builder workspace is ready.
                </p>
              </div>
              <Button
                variant="outline"
                type="button"
                onClick={() => signOutMutation.mutate({ allSessions: false })}
                disabled={signOutMutation.isPending}
              >
                <LogOut />
                {signOutMutation.isPending ? "Signing out..." : "Sign out"}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Sign in to create and manage your forms.
              </p>
              <div className="flex gap-3">
                <Button asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/signup">Create account</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
