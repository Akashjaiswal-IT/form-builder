"use client";

import { useId, useCallback, useRef } from "react";
import { useController, type FieldValues } from "react-hook-form";
import { toast } from "sonner";
import { Upload, X, File } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { FieldDescription } from "~/components/ui/field";
import { cn } from "~/lib/utils";
import type { FieldComponentProps } from "~/lib/field-registry";

export function FileField<T extends FieldValues>({
  field,
  control,
  name,
  disabled = false,
}: FieldComponentProps<T>) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    field: controllerField,
    fieldState: { error },
  } = useController({ name, control, disabled });

  const description = field.description;
  const acceptedFileTypes = field.settings?.acceptedFileTypes as string[] | undefined;
  const maxFileSize = field.settings?.maxFileSize as number | undefined;

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // ---- Validate file type ----
      if (acceptedFileTypes && acceptedFileTypes.length > 0 && !acceptedFileTypes.includes("*/*")) {
        const isValid = acceptedFileTypes.some((type) => {
          if (type.endsWith("/*")) {
            // e.g., "image/*" – check MIME prefix
            return file.type.startsWith(type.replace("/*", ""));
          }
          // Check exact MIME or file extension
          return file.type === type || file.name.endsWith(type);
        });
        if (!isValid) {
          toast.error(`File type not allowed. Allowed: ${acceptedFileTypes.join(", ")}`);
          if (inputRef.current) inputRef.current.value = "";
          return;
        }
      }

      // ---- Validate file size ----
      if (maxFileSize && file.size > maxFileSize) {
        const maxMB = (maxFileSize / (1024 * 1024)).toFixed(1);
        toast.error(`File too large. Maximum size: ${maxMB} MB`);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      // All validations passed
      controllerField.onChange(file);
    },
    [controllerField, acceptedFileTypes, maxFileSize],
  );

  const handleRemove = useCallback(() => {
    controllerField.onChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [controllerField]);

  const selectedFile = controllerField.value as File | null | undefined;

  return (
    <div className="space-y-2">
      {!field.settings?.hideLabel && (
        <Label htmlFor={id} className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={cn(error && "border-destructive")}
        >
          <Upload className="size-4 mr-1" />
          Choose file
        </Button>

        {selectedFile && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <File className="size-4" />
            <span className="truncate max-w-[200px]">{selectedFile.name}</span>
            <span className="text-xs opacity-70">
              ({(selectedFile.size / 1024).toFixed(0)} KB)
            </span>
            <button
              type="button"
              onClick={handleRemove}
              className="text-destructive hover:text-destructive/80"
              disabled={disabled}
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        className="hidden"
        accept={acceptedFileTypes?.join(",") ?? "*/*"}
        onChange={handleSelect}
        disabled={disabled}
      />

      {description && !error && (
        <FieldDescription className="text-muted-foreground text-xs">
          {description}
        </FieldDescription>
      )}

      {error && (
        <p className="text-destructive text-xs font-medium" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}