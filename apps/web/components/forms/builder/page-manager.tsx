// web/components/forms/builder/page-manager.tsx

"use client";

import { useCallback, useState } from "react";
import {
  GripVertical,
  Plus,
  Trash2,
  Check,
  X,
  Pencil,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { useFormBuilderStore } from "~/stores/form-builder-store";
import type { FormBuilderState } from "~/stores/form-builder-store";
import { useIsMobile } from "~/hooks/use-mobile";

export function PageManager() {
  const isMobile = useIsMobile();

  // State selectors
  const schema = useFormBuilderStore((s: FormBuilderState) => s.schema);
  const selectedPageId = useFormBuilderStore(
    (s: FormBuilderState) => s.selectedPageId,
  );

  // Action selectors
  const selectPage = useFormBuilderStore((s) => s.selectPage);
  const addPage = useFormBuilderStore((s) => s.addPage);
  const deletePage = useFormBuilderStore((s) => s.deletePage);
  const updatePage = useFormBuilderStore((s) => s.updatePage);
  const reorderPages = useFormBuilderStore((s) => s.reorderPages);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const startRename = (pageId: string, currentTitle: string | null) => {
    setEditingId(pageId);
    setEditTitle(currentTitle ?? "");
  };

  const confirmRename = () => {
    if (editingId) {
      updatePage(editingId, { title: editTitle.trim() || `Page` });
    }
    setEditingId(null);
  };

  const cancelRename = () => {
    setEditingId(null);
  };

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, pageId: string) => {
      e.dataTransfer.setData("text/plain", pageId);
      e.dataTransfer.effectAllowed = "move";
    },
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, targetPageId: string) => {
      e.preventDefault();
      const sourceId = e.dataTransfer.getData("text/plain");
      if (!sourceId || sourceId === targetPageId) return;

      const pageIds = schema.pages.map((p) => p.id);
      const sourceIdx = pageIds.indexOf(sourceId);
      const targetIdx = pageIds.indexOf(targetPageId);
      if (sourceIdx === -1 || targetIdx === -1) return;

      const newOrder = [...pageIds];
      const [moved] = newOrder.splice(sourceIdx, 1);
      newOrder.splice(targetIdx, 0, moved!);
      reorderPages(newOrder);
    },
    [schema.pages, reorderPages],
  );

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 md:py-2 border-b">
        <h2 className="text-base md:text-sm font-medium">Pages</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 md:h-8 md:w-8"
              onClick={() => addPage()}
              disabled={schema.pages.length >= 50}
            >
              <Plus className="size-5 md:size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add page</TooltipContent>
        </Tooltip>
      </div>

      {/* Page list */}
      <div className="max-h-48 md:max-h-40 overflow-y-auto">
        <div className="p-1">
          {schema.pages.map((page) => {
            const isSelected = page.id === selectedPageId;
            const isEditing = editingId === page.id;

            return (
              <div
                key={page.id}
                role="button"
                tabIndex={0}
                onClick={() => !isEditing && selectPage(page.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") selectPage(page.id);
                }}
                draggable
                onDragStart={(e) => handleDragStart(e, page.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, page.id)}
                className={cn(
                  "group flex items-center gap-2 rounded-md px-2 transition-colors cursor-pointer",
                  // Responsive sizing
                  "py-3 md:py-1.5",
                  "min-h-[48px] md:min-h-0",
                  isSelected
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/50 active:bg-muted/70",
                )}
              >
                {/* Drag handle */}
                <div className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-muted-foreground touch-none">
                  <GripVertical className="size-5 md:size-3.5" />
                </div>

                {isEditing ? (
                  <div className="flex-1 flex items-center gap-1">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-9 md:h-7 text-sm md:text-xs"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmRename();
                        if (e.key === "Escape") cancelRename();
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 md:h-7 md:w-7 shrink-0"
                      onClick={confirmRename}
                    >
                      <Check className="size-4 md:size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 md:h-7 md:w-7 shrink-0"
                      onClick={cancelRename}
                    >
                      <X className="size-4 md:size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Page title */}
                    <span className="flex-1 truncate text-base md:text-sm">
                      {page.title || "Untitled page"}
                    </span>

                    {/* Action buttons */}
                    <div
                      className={cn(
                        "flex items-center gap-1 transition-opacity",
                        isMobile
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100",
                      )}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 md:h-7 md:w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(page.id, page.title ?? null);
                        }}
                      >
                        <Pencil className="size-4 md:size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 md:h-7 md:w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePage(page.id);
                        }}
                        disabled={schema.pages.length <= 1}
                      >
                        <Trash2 className="size-4 md:size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Footer */}
      <div className="p-3 md:p-2 text-sm md:text-xs text-muted-foreground">
        {schema.pages.length} page{schema.pages.length !== 1 && "s"}
      </div>
    </div>
  );
}