"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Spinner } from "~/components/ui/spinner";
import { trpc } from "~/trpc/client";

export default function Home() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentUserQuery = trpc.auth.getCurrentUser.useQuery(undefined, {
    enabled: isMounted,
  });

  if (!isMounted) return null;

  // Show a brief loading spinner while checking the session
  if (currentUserQuery.isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // If the user is already authenticated, go straight to the forms dashboard
  if (currentUserQuery.data) {
    router.replace("/forms");
    return null;
  }

  // Not logged in – show the original public page
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
        </CardContent>
      </Card>
    </main>
  );
}
