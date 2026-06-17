"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus, FileText, MoreHorizontal, Eye, Copy, Trash2, Code,
  Link2, Lock, QrCode, Archive, ArrowRight, BarChart2, Webhook,
} from "lucide-react";
import { toast } from "sonner";

import { TemplateBrowser } from "~/components/forms/template-browser";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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
import { Skeleton } from "~/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "~/components/ui/empty";
import { Spinner } from "~/components/ui/spinner";
import { trpc } from "~/trpc/client";
import { QrDialog } from "~/components/forms/qr-dialog";

import { EmbedDialog } from "~/components/forms/embed-dialog";

// ── types ─────────────────────────────────────────────────────────────────────

type FormStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";

type Form = {
  id: string;
  title: string;
  description?: string | null;
  status: FormStatus;
  slug: string;
  responseCount: number;
  updatedAt: string | Date;
  settings?: { requireLogin?: boolean } | null;
};

// ── constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<FormStatus, {
  label: string;
  borderColor: string;
  dotClass: string;
  pulse: boolean;
}> = {
  DRAFT:     { label: "Draft",     borderColor: "#9ca3af", dotClass: "bg-gray-400",     pulse: false },
  PUBLISHED: { label: "Published", borderColor: "#10b981", dotClass: "bg-emerald-500",  pulse: true  },
  CLOSED:    { label: "Closed",    borderColor: "#f97316", dotClass: "bg-orange-500",   pulse: false },
  ARCHIVED:  { label: "Archived",  borderColor: "#ef4444", dotClass: "bg-red-500",      pulse: false },
};

// ── helpers ───────────────────────────────────────────────────────────────────

function relativeTime(date: string | Date): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function publicUrl(slug: string): string {
  if (typeof window === "undefined") return `/forms/public/${slug}`;
  return `${window.location.origin}/forms/public/${slug}`;
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function FormsPage() {
  const userQuery = trpc.auth.getCurrentUser.useQuery();

  if (userQuery.isPending) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="mr-2" /> Checking session…
      </div>
    );
  }

  if (!userQuery.data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Please log in to continue.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forms</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage and create forms.
          </p>
        </div>
        <Button asChild>
          <Link href="/forms/new">
            <Plus className="size-4 mr-1.5" /> New Form
          </Link>
        </Button>
      </div>
      <TemplateBrowser />
      <FormList />
    </div>
  );
}

// ── form list ─────────────────────────────────────────────────────────────────

function FormList() {
  const utils = trpc.useUtils();

  const formsQuery = trpc.forms.list.useQuery({ limit: 50 });

  const deleteMutation = trpc.forms.delete.useMutation({
    onSuccess: () => { toast.success("Form deleted."); void utils.forms.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const duplicateMutation = trpc.forms.duplicate.useMutation({
    onSuccess: (d) => { toast.success(d.message); void utils.forms.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const archiveMutation = trpc.forms.archive.useMutation({
    onSuccess: () => { toast.success("Form archived."); void utils.forms.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  if (formsQuery.isPending) return <FormListSkeleton />;
  if (formsQuery.isError)
    return (
      <p className="text-destructive text-center py-12">Failed to load forms.</p>
    );

  const forms = (formsQuery.data?.forms ?? []) as Form[];

  if (forms.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No forms yet</EmptyTitle>
            <EmptyDescription>
              Create your first form to start collecting responses.
            </EmptyDescription>
          </EmptyHeader>
          <Button asChild>
            <Link href="/forms/new">
              <Plus className="size-4 mr-1.5" /> Create form
            </Link>
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {forms.map((form) => (
        <FormCard
          key={form.id}
          form={form}
          onDuplicate={() => duplicateMutation.mutate({ formId: form.id })}
          onDelete={() => deleteMutation.mutate({ formId: form.id })}
          onArchive={() => archiveMutation.mutate({ formId: form.id })}
        />
      ))}
    </div>
  );
}

// ── form card ─────────────────────────────────────────────────────────────────

function FormCard({
  form,
  onDuplicate,
  onDelete,
  onArchive,
}: {
  form: Form;
  onDuplicate: () => void;
  onDelete: () => void;
  onArchive: () => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);

  const cfg = STATUS_CONFIG[form.status] ?? STATUS_CONFIG.DRAFT;
  const url = publicUrl(form.slug);

  function copyLink() {
    void navigator.clipboard.writeText(url).then(() =>
      toast.success(
        form.settings?.requireLogin ? "Authenticated link copied" : "Public link copied",
      ),
    );
  }

  return (
    <>
      {/* ── delete confirmation ── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this form?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{form.title || "This form"}</span> and all its
              responses will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── qr dialog (controlled, not nested inside dropdown) ── */}
      <QrDialog
        url={url}
        title={form.title || "Untitled Form"}
        open={qrOpen}
        onOpenChange={setQrOpen}
      />

      {/* Embed dialog */}
      <EmbedDialog
        url={url}
        title={form.title || "Untitled Form"}
        open={embedOpen}
        onOpenChange={setEmbedOpen}
      />

      {/* ── card ── */}
      <div
        className="group flex flex-col rounded-xl border border-border/60 bg-card
                   overflow-hidden transition-all duration-200
                   hover:shadow-md hover:border-border"
        style={{ borderLeft: `3px solid ${cfg.borderColor}` }}
      >
        {/* Body */}
        <div className="flex-1 flex flex-col gap-3 p-4 pb-3">

          {/* Status row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span
                className={[
                  "size-2 rounded-full shrink-0",
                  cfg.dotClass,
                  cfg.pulse ? "animate-pulse" : "",
                ].join(" ")}
              />
              <span className="text-xs font-medium text-muted-foreground">
                {cfg.label}
              </span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 -mr-1.5 opacity-50 group-hover:opacity-100
                             focus-visible:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem asChild>
                  <Link href={`/forms/${form.id}`}>
                    <FileText className="size-4 mr-2" /> Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/forms/${form.id}/preview`}>
                    <Eye className="size-4 mr-2" /> Preview
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/forms/${form.id}/analytics`}>
                    <BarChart2 className="size-4 mr-2" /> Analytics
                  </Link>
                </DropdownMenuItem>
                {/* ---- NEW: Webhooks ---- */}
                <DropdownMenuItem asChild>
                  <Link href={`/forms/${form.id}/webhooks`}>
                    <Webhook className="size-4 mr-2" /> Webhooks
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="size-4 mr-2" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setQrOpen(true)}>
                  <QrCode className="size-4 mr-2" /> QR Code
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setEmbedOpen(true)}>
                  <Code className="size-4 mr-2" /> Embed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={copyLink}>
                  {form.settings?.requireLogin
                    ? <Lock className="size-4 mr-2" />
                    : <Link2 className="size-4 mr-2" />}
                  Copy link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="size-4 mr-2" /> Archive
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setDeleteOpen(true)}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="size-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Title + lock */}
          <div>
            <div className="flex items-start gap-1.5">
              <Link
                href={`/forms/${form.id}`}
                className="font-semibold text-sm leading-snug line-clamp-2
                           hover:underline decoration-muted-foreground/40 underline-offset-2"
              >
                {form.title || "Untitled Form"}
              </Link>
              {form.settings?.requireLogin && (
                <Lock className="size-3 shrink-0 mt-[3px] text-muted-foreground" />
              )}
            </div>
            {form.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                {form.description}
              </p>
            )}
          </div>

          {/* Response count — the metric that matters */}
          <div className="mt-auto">
            <span className="text-2xl font-bold tabular-nums">{form.responseCount}</span>
            <span className="text-xs text-muted-foreground ml-1.5">
              {form.responseCount === 1 ? "response" : "responses"}
            </span>
          </div>
        </div>

        {/* Footer action strip */}
        <div className="border-t border-border/50 bg-muted/20 px-3 py-2 flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-auto tabular-nums">
            {relativeTime(form.updatedAt)}
          </span>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
            <Link href={`/forms/${form.id}/preview`}>
              <Eye className="size-3.5 mr-1" /> Preview
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={copyLink}
          >
            <Link2 className="size-3.5 mr-1" /> Share
          </Button>
          <Button size="sm" className="h-7 px-2.5 text-xs" asChild>
            <Link href={`/forms/${form.id}`}>
              Edit <ArrowRight className="size-3 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}

// ── skeleton ──────────────────────────────────────────────────────────────────

function FormListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border/60 overflow-hidden"
          style={{ borderLeft: "3px solid hsl(var(--border))" }}
        >
          <div className="p-4 space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-7 w-10 mt-2" />
          </div>
          <div className="border-t border-border/50 bg-muted/20 px-3 py-2 flex items-center gap-2">
            <Skeleton className="h-3 w-14" />
            <div className="ml-auto flex gap-1">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-7 w-14" />
              <Skeleton className="h-7 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}