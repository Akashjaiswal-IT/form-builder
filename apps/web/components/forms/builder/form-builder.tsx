// web/components/forms/builder/form-builder.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bookmark,
  ArrowLeft,
  Eye,
  EyeOff,
  Save,
  Undo2,
  Redo2,
  PanelLeft,
  PanelRight,
  ChevronDown,
  Menu,
  Settings,
  SlidersHorizontal,
  Webhook,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { Separator } from "~/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "~/components/ui/sheet";
import { SaveTemplateDialog } from "./save-template-dialog";
import { trpc } from "~/trpc/client";
import { useFormBuilderStore } from "~/stores/form-builder-store";
import { FieldPalette } from "./field-palette";
import { Canvas } from "./canvas";
import { FieldEditor } from "./field-editor";
import { PageManager } from "./page-manager";
import { PreviewPanel } from "./preview-panel";
import { SettingsPanel } from "./settings-panel";
import { useIsMobile, useIsTablet, useIsDesktop } from "~/hooks/use-mobile";
import type { RouterOutputs } from "@repo/trpc/client";

type FullFormData = RouterOutputs["forms"]["getFullById"];

// ──────────────────────────────────────────────
// Sidebar content wrappers
// ──────────────────────────────────────────────

function LeftSidebarContent({ onAddField }: { onAddField: (type: any) => void }) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <PageManager />
      <div className="flex-1 min-h-0 overflow-hidden">
        <FieldPalette onAddField={onAddField} />
      </div>
    </div>
  );
}

function RightSidebarContent() {
  return <FieldEditor />;
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────

export function FormBuilder({ formId }: { formId: string }) {
  const router = useRouter();
  const store = useFormBuilderStore();

  const {
    title,
    description,
    isDirty,
    isSaving,
    selectedPageId,
    setTitle,
    setDescription,
    initializeForm,
    markClean,
    setSaving,
    undo,
    redo,
    canUndo,
    canRedo,
    getFormData,
    isPaletteOpen,
    isPropertiesOpen,
    setIsPaletteOpen,
    setIsPropertiesOpen,
  } = store;

  // ── Responsive hooks ────────────────────────
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();

  // ── Desktop-only panel toggles ──────────────
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // ── Dialogs / overflow state ────────────────
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string>("Publish");

  // ── Data fetching ───────────────────────────
  const fullFormQuery = trpc.forms.getFullById.useQuery({ formId }, { enabled: !!formId });

  const updateMutation = trpc.forms.update.useMutation();
  const publishMutation = trpc.forms.publish.useMutation();
  const closeMutation = trpc.forms.close.useMutation();
  const archiveMutation = trpc.forms.archive.useMutation();

  // ── Add-field handler ──
  const handleAddField = useCallback(
    (type: any) => {
      if (!selectedPageId) {
        toast.error("No page selected.");
        return;
      }
      store.addField(selectedPageId, type);
      if (isMobile || isTablet) {
        setIsPaletteOpen(false);
      }
    },
    [selectedPageId, store, isMobile, isTablet, setIsPaletteOpen],
  );

  // ── Warn on close if dirty ──
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ── Sync pending action with form status ──
  useEffect(() => {
    const status = fullFormQuery.data?.form?.status ?? "DRAFT";
    if (status === "DRAFT" || status === "CLOSED") {
      setPendingAction("Publish");
    } else if (status === "PUBLISHED") {
      setPendingAction("Close");
    } else {
      setPendingAction("Archive");
    }
  }, [fullFormQuery.data?.form?.status]);

  // ── Initialise Zustand store ──
  useEffect(() => {
    const data: FullFormData | undefined = fullFormQuery.data;
    if (data) {
      const { form, pages, fields } = data;
      initializeForm({
        formId: form.id,
        title: form.title,
        description: form.description ?? "",
        pages: pages.map((page) => ({
          id: page.id,
          title: page.title,
          description: page.description,
          position: page.position,
          conditionalLogic: page.conditionalLogic,
          fields: fields
            .filter((f) => f.pageId === page.id)
            .map((f) => ({
              id: f.id,
              type: f.type,
              label: f.label,
              name: f.name,
              placeholder: f.placeholder,
              description: f.description,
              required: f.required,
              validation: f.validation,
              options: f.options,
              conditionalLogic: f.conditionalLogic,
              position: f.position,
              settings: f.settings ?? {},
            })),
        })),
        settings: form.settings ?? undefined,
        theme: form.theme ?? undefined,
      });
      markClean();
    }
  }, [fullFormQuery.data, initializeForm, markClean]);

  // ── Save / Publish / Close / Archive ──
  const handleSave = useCallback(async () => {
    if (!formId) return;
    setSaving(true);
    try {
      const data = getFormData();
      await updateMutation.mutateAsync({
        formId,
        title: data.title,
        description: data.description,
        settings: data.schema.settings,
        theme: data.schema.theme,
      });
      markClean();
      toast.success("Form saved.");
    } catch (error: any) {
      toast.error(error.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [formId, updateMutation, getFormData, markClean, setSaving]);

  const handlePublish = async () => {
    if (isDirty) {
      setSaving(true);
      try {
        const data = getFormData();
        await updateMutation.mutateAsync({
          formId,
          title: data.title,
          description: data.description,
          settings: data.schema.settings,
          theme: data.schema.theme,
        });
        markClean();
      } catch (error: any) {
        toast.error(error.message ?? "Failed to save before publish");
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    try {
      await publishMutation.mutateAsync({ formId });
      toast.success("Form published.");
      setPendingAction("Close");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message ?? "Failed to publish");
    }
  };

  const handleClose = async () => {
    try {
      await closeMutation.mutateAsync({ formId });
      toast.success("Form closed.");
      setPendingAction("Publish");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message ?? "Failed to close");
    }
  };

  const handleArchive = async () => {
    try {
      await archiveMutation.mutateAsync({ formId });
      toast.success("Form archived.");
      setPendingAction("Archive");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message ?? "Failed to archive");
    }
  };

  // ── Navigation guard ──
  const handleBack = () => {
    if (isDirty) {
      setPendingNavigation("/forms");
      setShowLeaveDialog(true);
    } else {
      router.push("/forms");
    }
  };

  const confirmLeave = () => {
    setShowLeaveDialog(false);
    if (pendingNavigation) {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const cancelLeave = () => {
    setShowLeaveDialog(false);
    setPendingNavigation(null);
  };

  // ── Loading / Error states ──
  if (fullFormQuery.isLoading) {
    return (
      <div className="flex h-[calc(100vh-65px)] items-center justify-center">
        <Spinner className="mr-2" /> Loading form…
      </div>
    );
  }

  if (fullFormQuery.isError) {
    return (
      <div className="flex h-[calc(100vh-65px)] items-center justify-center text-destructive">
        Failed to load form.
      </div>
    );
  }

  const formStatus = fullFormQuery.data?.form?.status;

  // ── Shared split-button dropdown items ──
  const SplitDropdownItems = () => (
    <>
      {pendingAction !== "Publish" && formStatus !== "ARCHIVED" && (
        <DropdownMenuItem onClick={() => setPendingAction("Publish")}>
          Publish
        </DropdownMenuItem>
      )}
      {pendingAction !== "Close" && formStatus !== "ARCHIVED" && (
        <DropdownMenuItem onClick={() => setPendingAction("Close")}>
          Close
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        onClick={() => setPendingAction("Archive")}
        disabled={formStatus === "ARCHIVED"}
      >
        Archive
      </DropdownMenuItem>
    </>
  );

  // ── Render ──
  return (
    <div className="flex h-[calc(100vh-65px)] flex-col">
      {/* Unsaved changes dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>Leave without saving?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelLeave}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLeave}>Leave without saving</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save as Template dialog */}
      <SaveTemplateDialog formId={formId} open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen} />

      {/* Left Sheet */}
      <Sheet open={isPaletteOpen} onOpenChange={setIsPaletteOpen}>
        <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 flex flex-col overflow-hidden">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle>Pages & Fields</SheetTitle>
            <SheetDescription className="sr-only">Manage pages and add fields</SheetDescription>
          </SheetHeader>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <LeftSidebarContent onAddField={handleAddField} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Right Sheet */}
      <Sheet open={isPropertiesOpen} onOpenChange={setIsPropertiesOpen}>
        <SheetContent side="right" className="w-[320px] sm:w-[380px] p-0 flex flex-col overflow-hidden">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle>Field Properties</SheetTitle>
            <SheetDescription className="sr-only">Edit the selected field properties</SheetDescription>
          </SheetHeader>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <RightSidebarContent />
          </div>
        </SheetContent>
      </Sheet>

      {/* ════════════════════════════════════════════
          TOP BAR  –  CSS‑only responsive visibility
          ════════════════════════════════════════════ */}
      <div className="shrink-0">
        {/* ── Row 1 ── */}
        <div className="flex items-center gap-2 border-b px-2 md:px-4 py-2">
          {/* Hamburger – visible only on mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 md:hidden"
            onClick={() => setIsPaletteOpen(true)}
            aria-label="Open pages and fields"
          >
            <Menu className="size-4" />
          </Button>

          {/* Back */}
          <Button variant="ghost" size="sm" className="h-8 px-2 shrink-0" onClick={handleBack}>
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline ml-1">Forms</span>
          </Button>

          {/* Title */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-8 flex-1 min-w-[80px] max-w-[260px] sm:max-w-none sm:w-48 lg:w-64 text-sm font-semibold min-w-0"
            placeholder="Untitled Form"
          />

          {/* Description – hidden on mobile */}
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="hidden md:block h-8 flex-1 min-w-[100px] text-xs min-w-0"
            placeholder="Form description (optional)"
          />

          {/* Undo / Redo – hidden on mobile */}
          <div className="hidden sm:flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={!canUndo()}>
                  <Undo2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={!canRedo()}>
                  <Redo2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo</TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="hidden sm:block h-6" />

          {/* Save */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="shrink-0 h-8"
          >
            <Save className="size-4" />
            <span className="hidden sm:inline ml-1">{isSaving ? "Saving…" : "Save"}</span>
          </Button>

          {/* Desktop split button – hidden on mobile */}
          <div className="hidden md:flex items-stretch rounded-md border border-input shadow-xs">
            <Button
              size="sm"
              variant="ghost"
              className="rounded-r-none border-0 hover:bg-accent"
              onClick={() => {
                if (pendingAction === "Publish") handlePublish();
                else if (pendingAction === "Close") handleClose();
                else if (pendingAction === "Archive") handleArchive();
              }}
            >
              {pendingAction}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-l-none border-0 border-l border-input hover:bg-accent px-2"
                >
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <SplitDropdownItems />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Desktop‑only actions – hidden on mobile and tablet */}
          <div className="hidden lg:flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => setSaveTemplateOpen(true)}>
              <Bookmark className="size-4 mr-1" /> Save as Template
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/forms/${formId}/webhooks`}>Webhooks</Link>
            </Button>
            <SettingsPanel />
          </div>

          {/* Spacer */}
          {/* <div className="flex-1" /> */}

          {/* Mobile settings + field properties – visible only on mobile, pushed right */}
          <div className="flex items-center gap-0 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Form settings"
              onClick={() => document.getElementById("mobile-settings-trigger")?.click()}
            >
              <Settings className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Open field properties"
              onClick={() => setIsPropertiesOpen(true)}
            >
              <SlidersHorizontal className="size-4" />
            </Button>
            <div className="hidden">
              <SettingsPanel triggerId="mobile-settings-trigger" />
            </div>
          </div>

          {/* Desktop panel toggles – visible only on desktop */}
          <div className="hidden lg:flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setLeftPanelOpen(!leftPanelOpen)}
              aria-label={leftPanelOpen ? "Hide left panel" : "Show left panel"}
            >
              <PanelLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              aria-label={rightPanelOpen ? "Hide right panel" : "Show right panel"}
            >
              <PanelRight className="size-4" />
            </Button>
          </div>

          {/* Tablet left sheet toggle – visible only on tablet */}
          <div className="hidden md:flex lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsPaletteOpen(true)}
              aria-label="Open pages and fields"
            >
              <PanelLeft className="size-4" />
            </Button>
          </div>

          {/* Preview (desktop/tablet) – hidden on mobile */}
          <Button
            variant={previewOpen ? "default" : "outline"}
            size="sm"
            onClick={() => setPreviewOpen(!previewOpen)}
            className="hidden md:inline-flex shrink-0 h-8"
          >
            {previewOpen ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            <span className="hidden sm:inline ml-1">Preview</span>
          </Button>
        </div>

        {/* ── Row 2 (mobile only) – always in DOM, hidden with CSS ── */}
        <div className="flex items-center gap-2 border-b px-2 py-2 md:hidden">
          {/* Undo */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={undo}
            disabled={!canUndo()}
            aria-label="Undo"
          >
            <Undo2 className="size-4" />
          </Button>

          {/* Redo */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={redo}
            disabled={!canRedo()}
            aria-label="Redo"
          >
            <Redo2 className="size-4" />
          </Button>

          {/* Webhooks – icon only */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 shrink-0 p-0" asChild>
                <Link href={`/forms/${formId}/webhooks`}>
                  <Webhook className="size-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Webhooks</TooltipContent>
          </Tooltip>

          {/* Save as Template – icon only */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 shrink-0 p-0"
                onClick={() => setSaveTemplateOpen(true)}
              >
                <Bookmark className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save as Template</TooltipContent>
          </Tooltip>

          {/* Spacer pushes Preview to the right */}
          <div className="flex-1" />

          {/* Publish / Close / Archive split button */}
          <div className="flex items-stretch rounded-md border border-input shadow-xs shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="rounded-r-none border-0 hover:bg-accent"
              onClick={() => {
                if (pendingAction === "Publish") handlePublish();
                else if (pendingAction === "Close") handleClose();
                else if (pendingAction === "Archive") handleArchive();
              }}
            >
              {pendingAction}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-l-none border-0 border-l border-input hover:bg-accent px-2"
                >
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <SplitDropdownItems />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Preview (mobile) */}
          <Button
            variant={previewOpen ? "default" : "outline"}
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setPreviewOpen(!previewOpen)}
            aria-label={previewOpen ? "Exit preview" : "Preview form"}
          >
            {previewOpen ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          MAIN CONTENT AREA
          ════════════════════════════════════════════ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop left sidebar */}
        {isDesktop && leftPanelOpen && (
          <aside className="w-64 border-r flex flex-col min-h-0 shrink-0">
            <LeftSidebarContent onAddField={handleAddField} />
          </aside>
        )}

        {/* Canvas */}
        <main className="flex-1 min-h-0 overflow-hidden relative">
          {previewOpen ? <PreviewPanel formId={formId} /> : <Canvas />}
        </main>

        {/* Desktop right sidebar */}
        {isDesktop && rightPanelOpen && !previewOpen && (
          <aside className="w-80 border-l flex flex-col min-h-0 overflow-hidden shrink-0">
            <RightSidebarContent />
          </aside>
        )}

        {/* Tablet right sidebar */}
        {isTablet && !previewOpen && (
          <aside className="w-72 border-l flex flex-col min-h-0 overflow-hidden shrink-0">
            <RightSidebarContent />
          </aside>
        )}
      </div>
    </div>
  );
}