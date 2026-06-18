// /web/components/forms/builder/field-palette.tsx

"use client";

import { useState } from "react";
import {
  Type,
  AlignLeft,
  Hash,
  Mail,
  Phone,
  Link,
  Calendar,
  Clock,
  CalendarClock,
  ChevronDown,
  ListChecks,
  Circle,
  CheckSquare,
  Square,
  Upload,
  PenTool,
  Star,
  SlidersHorizontal,
  Heading,
  Text,
  Minus,
  EyeOff,
  Search,
} from "lucide-react";

import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { cn } from "~/lib/utils";
import { FIELD_CATEGORIES, type FieldType } from "~/types/form";
import { FIELD_META } from "~/lib/field-registry";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Type,
  AlignLeft,
  Hash,
  Mail,
  Phone,
  Link,
  Calendar,
  Clock,
  CalendarClock,
  ChevronDown,
  ListChecks,
  Circle,
  CheckSquare,
  Square,
  Upload,
  PenTool,
  Star,
  SlidersHorizontal,
  Heading,
  Text,
  Minus,
  EyeOff,
};

interface FieldPaletteProps {
  onAddField: (type: FieldType) => void;
  disabled?: boolean;
}

export function FieldPalette({ onAddField, disabled = false }: FieldPaletteProps) {
  const [search, setSearch] = useState("");

  const filteredCategories = search
    ? (Object.entries(FIELD_CATEGORIES) as [string, readonly FieldType[]][])
        .map(([cat, types]) => ({
          category: cat,
          types: types.filter(
            (type) =>
              FIELD_META[type].label.toLowerCase().includes(search.toLowerCase()) ||
              FIELD_META[type].description.toLowerCase().includes(search.toLowerCase()),
          ),
        }))
        .filter((group) => group.types.length > 0)
    : (Object.entries(FIELD_CATEGORIES) as [string, readonly FieldType[]][]).map(
        ([cat, types]) => ({ category: cat, types }),
      );

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* Search bar */}
      <div className="shrink-0 p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search fields..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-10 md:h-9 text-sm"
          />
        </div>
      </div>

      {/* Field type accordion */}
      <ScrollArea className="flex-1 min-h-0 overscroll-contain">
        <Accordion type="multiple" defaultValue={["basic", "choice", "datetime"]}>
          {filteredCategories.map(({ category, types }) => (
            <AccordionItem key={category} value={category}>
              <AccordionTrigger className="px-2 py-3 md:py-2 text-sm font-medium">
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 gap-1 p-1">
                  {types.map((type) => {
                    const meta = FIELD_META[type];
                    const Icon = ICON_MAP[meta.icon] ?? Type;
                    return (
                      <button
                        key={type}
                        type="button"
                        disabled={disabled}
                        onClick={() => onAddField(type)}
                        className={cn(
                          // Base styles
                          "flex items-center gap-3 rounded-md px-3 text-sm transition-colors text-left",
                          // Larger touch targets on mobile, normal on desktop
                          "py-3 md:py-2",
                          "min-h-[48px] md:min-h-0",
                          "hover:bg-accent hover:text-accent-foreground",
                          "active:bg-accent/80",
                          disabled && "opacity-50 cursor-not-allowed",
                        )}
                      >
                        {/* Icon */}
                        <div className="flex size-10 md:size-8 items-center justify-center rounded-md border bg-muted shrink-0">
                          <Icon className="size-5 md:size-4" />
                        </div>
                        {/* Label + description */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-base md:text-sm">
                            {meta.label}
                          </div>
                          <div className="text-sm md:text-xs text-muted-foreground truncate">
                            {meta.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>
    </div>
  );
}