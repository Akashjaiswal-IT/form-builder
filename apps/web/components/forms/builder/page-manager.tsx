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

export function PageManager() {
  // State selectors (annotated to avoid 'any')
  const schema = useFormBuilderStore((s: FormBuilderState) => s.schema);
  const selectedPageId = useFormBuilderStore(
    (s: FormBuilderState) => s.selectedPageId,
  );

  // Action selectors (inferred correctly)
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
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h2 className="text-sm font-medium">Pages</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => addPage()}
              disabled={schema.pages.length >= 50}
            >
              <Plus className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add page</TooltipContent>
        </Tooltip>
      </div>
      <div className="max-h-40 overflow-y-auto">
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
                  "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors cursor-pointer",
                  isSelected
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/50",
                )}
              >
                <div className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-muted-foreground">
                  <GripVertical className="size-3.5" />
                </div>

                {isEditing ? (
                  <div className="flex-1 flex items-center gap-1">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-7 text-xs"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmRename();
                        if (e.key === "Escape") cancelRename();
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={confirmRename}
                    >
                      <Check className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={cancelRename}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 truncate text-sm">
                      {page.title || "Untitled page"}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(page.id, page.title ?? null);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePage(page.id);
                        }}
                        disabled={schema.pages.length <= 1}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
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
      <div className="p-2 text-xs text-muted-foreground">
        {schema.pages.length} page{schema.pages.length !== 1 && "s"}
      </div>
    </div>
  );
}
