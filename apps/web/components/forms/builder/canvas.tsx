"use client";

import { useCallback } from "react";
import { GripVertical, Trash2, Copy } from "lucide-react";

import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import { useFormBuilderStore } from "~/stores/form-builder-store";
import type { FormBuilderState } from "~/stores/form-builder-store";
import { FIELD_META } from "~/lib/field-registry";
import type { BuilderField } from "~/types/form";

import {
  Type, AlignLeft, Hash, Mail, Phone, Link, Calendar, Clock, CalendarClock,
  ChevronDown, ListChecks, Circle, CheckSquare, Square, Upload, PenTool,
  Star, SlidersHorizontal, Heading, Text, Minus, EyeOff,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Type, AlignLeft, Hash, Mail, Phone, Link, Calendar, Clock, CalendarClock,
  ChevronDown, ListChecks, Circle, CheckSquare, Square, Upload, PenTool,
  Star, SlidersHorizontal, Heading, Text, Minus, EyeOff,
};


export function Canvas() {
  const selectedPageId = useFormBuilderStore((s: FormBuilderState) => s.selectedPageId);
  const selectedFieldId = useFormBuilderStore((s: FormBuilderState) => s.selectedFieldId);
  const schema = useFormBuilderStore((s: FormBuilderState) => s.schema);

  const selectField = useFormBuilderStore((s) => s.selectField);
  const deleteField = useFormBuilderStore((s) => s.deleteField);
  const duplicateField = useFormBuilderStore((s) => s.duplicateField);
  const reorderFields = useFormBuilderStore((s) => s.reorderFields);

  const currentPage = schema.pages.find((p) => p.id === selectedPageId);
  const fields = currentPage?.fields ?? [];

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, fieldId: string) => {
      e.dataTransfer.setData("text/plain", fieldId);
      e.dataTransfer.effectAllowed = "move";
    },
    [],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, targetFieldId: string) => {
      e.preventDefault();
      const sourceFieldId = e.dataTransfer.getData("text/plain");
      if (!sourceFieldId || !selectedPageId) return;

      const sourceIdx = fields.findIndex((f) => f.id === sourceFieldId);
      const targetIdx = fields.findIndex((f) => f.id === targetFieldId);
      if (sourceIdx === -1 || targetIdx === -1) return;

      const newIds = [...fields.map((f) => f.id)];
      const [moved] = newIds.splice(sourceIdx, 1);
      newIds.splice(targetIdx, 0, moved!);
      reorderFields(selectedPageId, newIds);
    },
    [fields, reorderFields, selectedPageId],
  );

  if (!currentPage) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No page selected.
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <p className="text-sm">No fields on this page.</p>
        <p className="text-xs">Drag fields from the palette.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full min-h-0">
      <div className="p-4 space-y-2">
        {fields.map((field) => (
          <CanvasField
            key={field.id}
            field={field}
            isSelected={field.id === selectedFieldId}
            onSelect={() => selectField(field.id)}
            onDelete={() => deleteField(field.id)}
            onDuplicate={() => duplicateField(field.id)}
            onDragStart={(e) => handleDragStart(e, field.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, field.id)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

interface CanvasFieldProps {
  field: BuilderField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}

function CanvasField({
  field,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onDragStart,
  onDragOver,
  onDrop,
}: CanvasFieldProps) {
  const meta = FIELD_META[field.type];
  const isLayout = meta?.isLayoutElement ?? false;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg border bg-card p-3 text-sm transition-all",
        isSelected
          ? "border-primary ring-1 ring-primary/20"
          : "border-border hover:border-accent-foreground/20",
        isLayout && "bg-muted/30 italic",
      )}
    >
      <div className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-muted-foreground">
        <GripVertical className="size-4" />
      </div>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted">
        <FieldIcon type={field.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("font-medium truncate", isLayout && "text-muted-foreground")}>
          {field.label || "Untitled"}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {meta?.label ?? field.type} {field.required && "• Required"}
        </p>
      </div>
      <div
        className={cn(
          "flex items-center gap-1 opacity-0 transition-opacity",
          (isSelected || "group-hover:opacity-100") && "opacity-100",
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          title="Duplicate field"
        >
          <Copy className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete field"
        >
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function FieldIcon({ type }: { type: string }) {
  const iconName = FIELD_META[type as keyof typeof FIELD_META]?.icon ?? "Type";
  const Icon = ICON_MAP[iconName] ?? Type;
  return <Icon className="size-4" />;
}