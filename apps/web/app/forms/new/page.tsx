"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Spinner } from "~/components/ui/spinner";
import { trpc } from "~/trpc/client";

export default function NewFormPage() {
  const router = useRouter();
  const mutationStarted = useRef(false);

  const createForm = trpc.forms.create.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      // replace the /new page in history so "Back" goes to /forms, not back to /new
      router.replace(`/forms/${data.form.id}`);
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to create form");
      router.replace("/forms");
    },
  });

  useEffect(() => {
    // guard against StrictMode double-invoke and re‑mounts
    if (mutationStarted.current) return;
    mutationStarted.current = true;
    createForm.mutate({ title: "Untitled Form" });
  }, [createForm]);

  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Spinner />
        <p>Creating your form…</p>
      </div>
    </div>
  );
}