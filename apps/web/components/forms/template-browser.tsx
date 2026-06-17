"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Loader2, Trash2 } from "lucide-react";
import { trpc } from "~/trpc/client";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import type { RouterOutputs } from "@repo/trpc/client";

// Extract the template item type from tRPC output
type TemplateItem = RouterOutputs['forms']['listTemplates']['templates'][number];

type Tab = "public" | "my";

export function TemplateBrowser() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("public");
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const publicTemplatesQuery = trpc.forms.listTemplates.useQuery(undefined, {
    staleTime: Infinity,
    enabled: activeTab === "public",
  });

  const userTemplatesQuery = trpc.forms.listUserTemplates.useQuery(undefined, {
    staleTime: Infinity,
    enabled: activeTab === "my",
  });

  const applyMutation = trpc.forms.applyTemplate.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      void utils.forms.list.invalidate();
      router.push(`/forms/${data.form.id}`);
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setApplyingId(null),
  });

  const deleteMutation = trpc.forms.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template deleted.");
      void utils.forms.listUserTemplates.invalidate();
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setDeletingId(null),
  });

  const query = activeTab === "public" ? publicTemplatesQuery : userTemplatesQuery;
  const templates: TemplateItem[] = query.data?.templates ?? [];
  const showDelete = activeTab === "my";

  const renderSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="mb-8">
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-4 bg-muted/50 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("public")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === "public"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All Templates
        </button>
        <button
          onClick={() => setActiveTab("my")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === "my"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          My Templates
        </button>
      </div>

      {/* Content */}
      {query.isPending ? (
        renderSkeleton()
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          {activeTab === "public"
            ? "No public templates available."
            : "You haven't saved any templates yet."}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  {tpl.name}
                </CardTitle>
                <CardDescription className="line-clamp-2">{tpl.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex items-center justify-between">
                <span className="text-xs text-muted-foreground capitalize">{tpl.category}</span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    onClick={() => {
                      setApplyingId(tpl.id);
                      applyMutation.mutate({ templateId: tpl.id });
                    }}
                    disabled={applyMutation.isPending}
                  >
                    {applyingId === tpl.id ? (
                      <Loader2 className="size-4 mr-1 animate-spin" />
                    ) : null}
                    Use
                  </Button>
                  {showDelete && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setDeletingId(tpl.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingId) deleteMutation.mutate({ templateId: deletingId });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}