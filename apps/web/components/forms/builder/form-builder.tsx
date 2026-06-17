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
import { SaveTemplateDialog } from "./save-template-dialog";
import { trpc } from "~/trpc/client";
import { useFormBuilderStore } from "~/stores/form-builder-store";
import { FieldPalette } from "./field-palette";
import { Canvas } from "./canvas";
import { FieldEditor } from "./field-editor";
import { PageManager } from "./page-manager";
import { PreviewPanel } from "./preview-panel";
import { SettingsPanel } from "./settings-panel";
import type { RouterOutputs } from "@repo/trpc/client";

// tRPC‑inferred type for the full form data
type FullFormData = RouterOutputs["forms"]["getFullById"];

export function FormBuilder({ formId }: { formId: string }) {
  const router = useRouter();
  const store = useFormBuilderStore();
  const {
    title,
    description,
    isDirty,
    isSaving,
    selectedPageId,
    schema,
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
    updateSettings,
  } = store;

  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // ----- Navigation guard state -----
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // ----- Split‑button state -----
  const [pendingAction, setPendingAction] = useState<string>("Publish");

  const fullFormQuery = trpc.forms.getFullById.useQuery({ formId }, { enabled: !!formId });

  const updateMutation = trpc.forms.update.useMutation();
  const publishMutation = trpc.forms.publish.useMutation();
  const closeMutation = trpc.forms.close.useMutation();
  const archiveMutation = trpc.forms.archive.useMutation();

  // Warn on browser close/refresh if dirty
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

  // Keep pendingAction in sync with form status
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

  // ----- Publish now auto‑saves unsaved title/description/settings first -----
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
      router.refresh();
    } catch (error: any) {
      toast.error(error.message ?? "Failed to publish");
    }
  };

  const handleClose = async () => {
    try {
      await closeMutation.mutateAsync({ formId });
      toast.success("Form closed.");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message ?? "Failed to close");
    }
  };

  const handleArchive = async () => {
    try {
      await archiveMutation.mutateAsync({ formId });
      toast.success("Form archived.");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message ?? "Failed to archive");
    }
  };

  // ----- Back button with unsaved‑changes guard -----
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

  return (
    <div className="flex h-[calc(100vh-65px)] flex-col">
      {/* ---- Unsaved changes dialog ---- */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to the form title, description, or settings. Leave without
              saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelLeave}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLeave}>Leave without saving</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---- Save as Template dialog ---- */}
      <SaveTemplateDialog
        formId={formId}
        open={saveTemplateOpen}
        onOpenChange={setSaveTemplateOpen}
      />

      <div className="flex items-center gap-2 border-b px-4 py-2 shrink-0">
        {/* Back link with guard */}
        <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2" onClick={handleBack}>
          <ArrowLeft className="size-4 mr-1" /> Forms
        </Button>

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-8 w-64 text-sm font-semibold"
          placeholder="Untitled Form"
        />
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-8 flex-1 min-w-[150px] text-xs"
          placeholder="Form description (optional)"
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo()}>
              <Undo2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo()}>
              <Redo2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo</TooltipContent>
        </Tooltip>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving || !isDirty}>
          <Save className="size-4 mr-1" />
          {isSaving ? "Saving…" : "Save"}
        </Button>

        {/* ---- Split button: text = action, arrow = menu ---- */}
        <div className="flex items-stretch rounded-md border border-input shadow-xs">
          <Button
            size="sm"
            variant="ghost"
            className="rounded-r-none border-0 hover:bg-accent"
            onClick={() => {
              if (pendingAction === "Publish") {
                handlePublish();
                setPendingAction("Close");
              } else if (pendingAction === "Close") {
                handleClose();
                setPendingAction("Publish");
              } else if (pendingAction === "Archive") {
                handleArchive();
              }
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
              {fullFormQuery.data?.form?.status !== "PUBLISHED" &&
                fullFormQuery.data?.form?.status !== "ARCHIVED" && (
                  <DropdownMenuItem onClick={() => setPendingAction("Publish")}>
                    Publish
                  </DropdownMenuItem>
                )}
              {fullFormQuery.data?.form?.status === "PUBLISHED" && (
                <DropdownMenuItem onClick={() => setPendingAction("Close")}>Close</DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setPendingAction("Archive")}
                disabled={fullFormQuery.data?.form?.status === "ARCHIVED"}
              >
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button size="sm" variant="ghost" onClick={() => setSaveTemplateOpen(true)}>
          <Bookmark className="size-4 mr-1" /> Save as Template
        </Button>

        {/* ---- Webhooks link ---- */}
        <Button size="sm" variant="ghost" asChild>
          <Link href={`/forms/${formId}/webhooks`}>Webhooks</Link>
        </Button>

        {/* Settings panel button */}
        <SettingsPanel />

        <div className="flex-1" />
        <Button variant="ghost" size="icon" onClick={() => setLeftPanelOpen(!leftPanelOpen)}>
          <PanelLeft className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setRightPanelOpen(!rightPanelOpen)}>
          <PanelRight className="size-4" />
        </Button>
        <Button
          variant={previewOpen ? "default" : "outline"}
          size="sm"
          onClick={() => setPreviewOpen(!previewOpen)}
        >
          {previewOpen ? <EyeOff className="size-4 mr-1" /> : <Eye className="size-4 mr-1" />}
          Preview
        </Button>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {leftPanelOpen && (
          <aside className="w-64 border-r flex flex-col min-h-0">
            <PageManager />
            <div className="flex-1 min-h-0 overflow-hidden">
              <FieldPalette
                onAddField={(type) => {
                  if (!selectedPageId) {
                    toast.error("No page selected.");
                    return;
                  }
                  store.addField(selectedPageId, type);
                }}
              />
            </div>
          </aside>
        )}

        <main className="flex-1 min-h-0 overflow-hidden relative">
          {previewOpen ? <PreviewPanel formId={formId} /> : <Canvas />}
        </main>

        {rightPanelOpen && !previewOpen && (
          <aside className="w-80 border-l flex flex-col min-h-0 overflow-hidden">
            <FieldEditor />
          </aside>
        )}
      </div>
    </div>
  );
}
