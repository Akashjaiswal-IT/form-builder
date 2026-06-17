"use client";

import { LogOut } from "lucide-react";
import { Button } from "~/components/ui/button";
import { trpc } from "~/trpc/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function SignOutButton() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const signOut = trpc.auth.signOut.useMutation({
    onSuccess: () => {
      utils.auth.getCurrentUser.invalidate();
      router.push("/login");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Button
      variant="ghost"
      className="w-full justify-start"
      onClick={() => signOut.mutate({ allSessions: false })}
    >
      <LogOut className="size-4 mr-2" />
      Sign out
    </Button>
  );
}