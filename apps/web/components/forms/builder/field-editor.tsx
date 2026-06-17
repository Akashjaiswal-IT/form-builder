"use client";

import { useMemo } from "react";
import { Trash2, Plus, GripVertical, Eye, EyeOff } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { useFormBuilderStore } from "~/stores/form-builder-store";
import type { FormBuilderState } from "~/stores/form-builder-store";
import { FIELD_META } from "~/lib/field-registry";
import type {
  BuilderField,
  FieldOption,
  Condition,
  ConditionalLogic,
  FieldSettings,
} from "~/types/form";

export function FieldEditor() {
  const selectedFieldId = useFormBuilderStore(
    (s: FormBuilderState) => s.selectedFieldId,
  );
  const schema = useFormBuilderStore((s: FormBuilderState) => s.schema);

  const updateField = useFormBuilderStore((s) => s.updateField);
  const addFieldOption = useFormBuilderStore((s) => s.addFieldOption);
  const updateFieldOption = useFormBuilderStore((s) => s.updateFieldOption);
  const deleteFieldOption = useFormBuilderStore((s) => s.deleteFieldOption);
  const updateFieldConditionalLogic = useFormBuilderStore(
    (s) => s.updateFieldConditionalLogic,
  );

  const selectedField = useMemo(() => {
    if (!selectedFieldId) return null;
    for (const page of schema.pages) {
      const field = page.fields.find((f) => f.id === selectedFieldId);
      if (field) return field;
    }
    return null;
  }, [schema.pages, selectedFieldId]);

  if (!selectedField) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-muted-foreground gap-2">
        <p className="text-sm">No field selected.</p>
        <p className="text-xs text-center">
          Click a field on the canvas to edit its properties.
        </p>
      </div>
    );
  }

  const meta = FIELD_META[selectedField.type];
  const isLayout = meta?.isLayoutElement ?? false;

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">
              {meta?.label ?? selectedField.type}
            </h3>
            <p className="text-xs text-muted-foreground">{meta?.description}</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  updateField(selectedField.id, {
                    settings: {
                      ...selectedField.settings,
                      hideLabel: !selectedField.settings?.hideLabel,
                    },
                  })
                }
              >
                {selectedField.settings?.hideLabel ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {selectedField.settings?.hideLabel ? "Show label" : "Hide label"}
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator />

        <Accordion type="multiple" defaultValue={["basic"]}>
          {/* Basic properties */}
          <AccordionItem value="basic">
            <AccordionTrigger className="text-sm font-medium">
              Basic
            </AccordionTrigger>
            <AccordionContent className="space-y-3 px-1 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Label</Label>
                <Input
                  value={selectedField.label}
                  onChange={(e) =>
                    updateField(selectedField.id, { label: e.target.value })
                  }
                  className="h-8 text-sm"
                />
              </div>
              {!isLayout && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Name (key)</Label>
                  <Input
                    value={selectedField.name}
                    onChange={(e) =>
                      updateField(selectedField.id, { name: e.target.value })
                    }
                    className="h-8 text-sm font-mono"
                  />
                </div>
              )}
              {!isLayout && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`required-${selectedField.id}`}
                    checked={selectedField.required}
                    onCheckedChange={(checked) =>
                      updateField(selectedField.id, {
                        required: checked === true,
                      })
                    }
                  />
                  <Label
                    htmlFor={`required-${selectedField.id}`}
                    className="text-sm cursor-pointer"
                  >
                    Required
                  </Label>
                </div>
              )}
              {!isLayout && selectedField.type !== "HEADING" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Placeholder</Label>
                  <Input
                    value={selectedField.placeholder ?? ""}
                    onChange={(e) =>
                      updateField(selectedField.id, {
                        placeholder: e.target.value || null,
                      })
                    }
                    className="h-8 text-sm"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={selectedField.description ?? ""}
                  onChange={(e) =>
                    updateField(selectedField.id, {
                      description: e.target.value || null,
                    })
                  }
                  className="text-sm min-h-[60px]"
                  rows={2}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Validation */}
          {!isLayout && meta?.hasValidation && (
            <AccordionItem value="validation">
              <AccordionTrigger className="text-sm font-medium">
                Validation
              </AccordionTrigger>
              <AccordionContent className="space-y-3 px-1 pt-2">
                {(selectedField.type === "TEXT" ||
                  selectedField.type === "TEXTAREA") && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Min length</Label>
                      <Input
                        type="number"
                        min={0}
                        value={selectedField.validation?.minLength ?? ""}
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            validation: {
                              ...selectedField.validation,
                              minLength: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            },
                          })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Max length</Label>
                      <Input
                        type="number"
                        min={0}
                        value={selectedField.validation?.maxLength ?? ""}
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            validation: {
                              ...selectedField.validation,
                              maxLength: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            },
                          })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                  </>
                )}
                {selectedField.type === "NUMBER" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Minimum value</Label>
                      <Input
                        type="number"
                        value={selectedField.validation?.min ?? ""}
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            validation: {
                              ...selectedField.validation,
                              min: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            },
                          })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Maximum value</Label>
                      <Input
                        type="number"
                        value={selectedField.validation?.max ?? ""}
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            validation: {
                              ...selectedField.validation,
                              max: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            },
                          })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">Pattern (regex)</Label>
                  <Input
                    value={selectedField.validation?.pattern ?? ""}
                    onChange={(e) =>
                      updateField(selectedField.id, {
                        validation: {
                          ...selectedField.validation,
                          pattern: e.target.value || undefined,
                        },
                      })
                    }
                    placeholder="e.g. ^[A-Z]+$"
                    className="h-8 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Pattern error message</Label>
                  <Input
                    value={selectedField.validation?.patternMessage ?? ""}
                    onChange={(e) =>
                      updateField(selectedField.id, {
                        validation: {
                          ...selectedField.validation,
                          patternMessage: e.target.value || undefined,
                        },
                      })
                    }
                    placeholder="Invalid format"
                    className="h-8 text-sm"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Options (choice fields) */}
          {meta?.hasOptions && (
            <AccordionItem value="options">
              <AccordionTrigger className="text-sm font-medium">
                Options
              </AccordionTrigger>
              <AccordionContent className="space-y-2 px-1 pt-2">
                {(selectedField.options ?? []).map((option: FieldOption) => (
                  <div key={option.id} className="flex items-center gap-1">
                    <GripVertical className="size-3.5 text-muted-foreground cursor-grab" />
                    <Input
                      value={option.label}
                      onChange={(e) =>
                        updateFieldOption(selectedField.id, option.id, {
                          label: e.target.value,
                          value: e.target.value
                            .toLowerCase()
                            .replace(/\s+/g, "_")
                            .replace(/[^a-z0-9_]/g, ""),
                        })
                      }
                      className="h-8 text-sm flex-1"
                      placeholder="Option label"
                    />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() =>
                        deleteFieldOption(selectedField.id, option.id)
                      }
                      disabled={(selectedField.options ?? []).length <= 1}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addFieldOption(selectedField.id)}
                  className="w-full mt-1"
                >
                  <Plus className="size-4 mr-1" /> Add option
                </Button>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Settings (type-specific) */}
          {!isLayout && (
            <AccordionItem value="settings">
              <AccordionTrigger className="text-sm font-medium">
                Settings
              </AccordionTrigger>
              <AccordionContent className="space-y-3 px-1 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Width</Label>
                  <Select
                    value={selectedField.settings?.width ?? "full"}
                    onValueChange={(val) =>
                      updateField(selectedField.id, {
                        settings: {
                          ...selectedField.settings,
                          width: val as FieldSettings["width"],
                        },
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Full" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full</SelectItem>
                      <SelectItem value="half">Half</SelectItem>
                      <SelectItem value="third">Third</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedField.type === "RATING" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Min</Label>
                        <Input
                          type="number"
                          min={1}
                          value={selectedField.settings?.minRating ?? 1}
                          onChange={(e) =>
                            updateField(selectedField.id, {
                              settings: {
                                ...selectedField.settings,
                                minRating: Number(e.target.value) || 1,
                              },
                            })
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Max</Label>
                        <Input
                          type="number"
                          min={1}
                          value={selectedField.settings?.maxRating ?? 5}
                          onChange={(e) =>
                            updateField(selectedField.id, {
                              settings: {
                                ...selectedField.settings,
                                maxRating: Number(e.target.value) || 5,
                              },
                            })
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Icon</Label>
                      <Select
                        value={selectedField.settings?.ratingIcon ?? "star"}
                        onValueChange={(val) =>
                          updateField(selectedField.id, {
                            settings: {
                              ...selectedField.settings,
                              ratingIcon: val as NonNullable<FieldSettings["ratingIcon"]>,
                            },
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="star">Star</SelectItem>
                          <SelectItem value="heart">Heart</SelectItem>
                          <SelectItem value="thumbs">Thumbs</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                {selectedField.type === "SCALE" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Min</Label>
                        <Input
                          type="number"
                          value={selectedField.settings?.scaleMin ?? 1}
                          onChange={(e) =>
                            updateField(selectedField.id, {
                              settings: {
                                ...selectedField.settings,
                                scaleMin: Number(e.target.value) || 1,
                              },
                            })
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Max</Label>
                        <Input
                          type="number"
                          value={selectedField.settings?.scaleMax ?? 10}
                          onChange={(e) =>
                            updateField(selectedField.id, {
                              settings: {
                                ...selectedField.settings,
                                scaleMax: Number(e.target.value) || 10,
                              },
                            })
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Min label</Label>
                      <Input
                        value={selectedField.settings?.scaleMinLabel ?? ""}
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            settings: {
                              ...selectedField.settings,
                              scaleMinLabel: e.target.value || undefined,
                            },
                          })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Max label</Label>
                      <Input
                        value={selectedField.settings?.scaleMaxLabel ?? ""}
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            settings: {
                              ...selectedField.settings,
                              scaleMaxLabel: e.target.value || undefined,
                            },
                          })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                  </>
                )}
                {selectedField.type === "HEADING" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Heading level</Label>
                    <Select
                      value={String(selectedField.settings?.headingLevel ?? 2)}
                      onValueChange={(val) =>
                        updateField(selectedField.id, {
                          settings: {
                            ...selectedField.settings,
                            headingLevel: Number(val) as 1 | 2 | 3 | 4,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">H1</SelectItem>
                        <SelectItem value="2">H2</SelectItem>
                        <SelectItem value="3">H3</SelectItem>
                        <SelectItem value="4">H4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {selectedField.type === "FILE" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Accepted file types</Label>
                      <Input
                        value={
                          (selectedField.settings?.acceptedFileTypes as string[])?.join(
                            ",",
                          ) ?? "*/*"
                        }
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            settings: {
                              ...selectedField.settings,
                              acceptedFileTypes: e.target.value
                                ? e.target.value.split(",").map((s) => s.trim())
                                : ["*/*"],
                            },
                          })
                        }
                        placeholder="image/*,.pdf"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Max file size (MB)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={
                          selectedField.settings?.maxFileSize
                            ? (selectedField.settings.maxFileSize as number) /
                              1024 /
                              1024
                            : 10
                        }
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            settings: {
                              ...selectedField.settings,
                              maxFileSize:
                                (Number(e.target.value) || 0) * 1024 * 1024,
                            },
                          })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                  </>
                )}
                {(selectedField.type === "SELECT" ||
                  selectedField.type === "RADIO" ||
                  selectedField.type === "CHECKBOX_GROUP") && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`allowOther-${selectedField.id}`}
                      checked={selectedField.settings?.allowOther === true}
                      onCheckedChange={(checked) =>
                        updateField(selectedField.id, {
                          settings: {
                            ...selectedField.settings,
                            allowOther: checked === true,
                          },
                        })
                      }
                    />
                    <Label
                      htmlFor={`allowOther-${selectedField.id}`}
                      className="text-sm cursor-pointer"
                    >
                      Allow "other" option
                    </Label>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Conditional Logic */}
          {!isLayout && (
            <AccordionItem value="logic">
              <AccordionTrigger className="text-sm font-medium">
                Conditional Logic
              </AccordionTrigger>
              <AccordionContent className="space-y-4 px-1 pt-2">
                <ConditionalLogicEditor
                  field={selectedField}
                  allFields={schema.pages.flatMap((p) => p.fields)}
                  onChange={(logic) =>
                    updateFieldConditionalLogic(selectedField.id, logic)
                  }
                />
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </div>
    </ScrollArea>
  );
}

// ---- Conditional Logic Sub-Editor (fully typed) ----
interface ConditionalLogicEditorProps {
  field: BuilderField;
  allFields: BuilderField[];
  onChange: (logic: ConditionalLogic | null) => void;
}

function ConditionalLogicEditor({
  field,
  allFields,
  onChange,
}: ConditionalLogicEditorProps) {
  const logic = field.conditionalLogic;
  const enabled = logic?.enabled ?? false;

  const toggleEnabled = (checked: boolean) => {
    if (checked) {
      onChange({
        enabled: true,
        action: "show",
        logicType: "all",
        conditions: [],
      });
    } else {
      onChange(null);
    }
  };

  const updateAction = (action: "show" | "hide" | "require") => {
    if (!logic) return;
    onChange({ ...logic, action });
  };

  const updateLogicType = (logicType: "all" | "any") => {
    if (!logic) return;
    onChange({ ...logic, logicType });
  };

  const addCondition = () => {
    if (!logic) return;
    const newCondition: Condition = {
      fieldId: allFields[0]?.id ?? "",
      operator: "equals",
      value: "",
    };
    onChange({ ...logic, conditions: [...logic.conditions, newCondition] });
  };

  const updateCondition = (index: number, patch: Partial<Condition>) => {
    if (!logic) return;
    const conditions = [...logic.conditions];
    conditions[index] = { ...conditions[index]!, ...patch };
    onChange({ ...logic, conditions });
  };

  const removeCondition = (index: number) => {
    if (!logic) return;
    const conditions = logic.conditions.filter((_, i) => i !== index);
    onChange({ ...logic, conditions });
  };

  const eligibleFields = allFields.filter(
    (f) => f.id !== field.id && !FIELD_META[f.type]?.isLayoutElement,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Switch checked={enabled} onCheckedChange={toggleEnabled} />
        <Label className="text-sm cursor-pointer">Enable conditional logic</Label>
      </div>

      {enabled && logic && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Action</Label>
              <Select
                value={logic.action}
                onValueChange={(val) => updateAction(val as "show" | "hide" | "require")}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="show">Show</SelectItem>
                  <SelectItem value="hide">Hide</SelectItem>
                  <SelectItem value="require">Require</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Condition type</Label>
              <Select
                value={logic.logicType}
                onValueChange={(val) => updateLogicType(val as "all" | "any")}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All conditions</SelectItem>
                  <SelectItem value="any">Any condition</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            {logic.conditions.map((condition, index) => (
              <div
                key={index}
                className="flex items-start gap-1 p-2 border rounded-md bg-muted/20"
              >
                <div className="flex-1 space-y-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Field</Label>
                    <Select
                      value={condition.fieldId}
                      onValueChange={(val) =>
                        updateCondition(index, { fieldId: val })
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleFields.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Operator</Label>
                    <Select
                      value={condition.operator}
                      onValueChange={(val) =>
                        updateCondition(index, { operator: val as Condition["operator"] })
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="not_equals">Not equals</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                        <SelectItem value="not_contains">Not contains</SelectItem>
                        <SelectItem value="greater_than">Greater than</SelectItem>
                        <SelectItem value="less_than">Less than</SelectItem>
                        <SelectItem value="is_empty">Is empty</SelectItem>
                        <SelectItem value="is_not_empty">Is not empty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {!["is_empty", "is_not_empty"].includes(condition.operator) && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Value</Label>
                      <Input
                        value={
                          typeof condition.value === "string" ||
                          typeof condition.value === "number"
                            ? String(condition.value)
                            : ""
                        }
                        onChange={(e) =>
                          updateCondition(index, {
                            value: e.target.value,
                          })
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeCondition(index)}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={addCondition}
              className="w-full"
            >
              <Plus className="size-4 mr-1" /> Add condition
            </Button>
          </div>
        </>
      )}
    </div>
  );
}