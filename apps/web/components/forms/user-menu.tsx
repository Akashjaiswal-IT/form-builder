"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { trpc } from "~/trpc/client";

export function UserMenu() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: user } = trpc.auth.getCurrentUser.useQuery(undefined, {
    enabled: mounted,
  });

  if (!mounted) return null;

  const initials = user?.fullName
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <Avatar className="size-8">
      {user?.profileImageUrl && (
        <AvatarImage src={user.profileImageUrl} alt={user.fullName ?? "User"} />
      )}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}