"use client";

import { useId, useRef, useState, useCallback, useEffect } from "react";
import { useController, type FieldValues } from "react-hook-form";

import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { FieldDescription } from "~/components/ui/field";
import { cn } from "~/lib/utils";
import type { FieldComponentProps } from "~/lib/field-registry";

export function SignatureField<T extends FieldValues>({
  field,
  control,
  name,
  disabled = false,
}: FieldComponentProps<T>) {
  const id = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const {
    field: controllerField,
    fieldState: { error },
  } = useController({ name, control, disabled });

  const description = field.description;

  // Initialize canvas context and restore existing signature if any
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Always fill with white background so ink is visible in any theme
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000000";

    const existingDataUrl = controllerField.value as string | undefined;
    if (existingDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setIsEmpty(false);
      };
      img.src = existingDataUrl;
    } else {
      setIsEmpty(true);
    }
  }, [controllerField.value]);

  const getCoordinates = (
    e: React.MouseEvent | React.TouchEvent,
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.offsetWidth;
    const scaleY = rect.height / canvas.offsetHeight;

    if ("touches" in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || disabled) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const coords = getCoordinates(e);
    if (!coords) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    isDrawing.current = true;
    setIsEmpty(false);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing.current || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const coords = getCoordinates(e);
    if (!coords) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");
      controllerField.onChange(dataUrl);
    }
  };

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Refill with white
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Reset stroke style
    ctx.strokeStyle = "#000000";
    controllerField.onChange(null);
    setIsEmpty(true);
  }, [controllerField]);

  return (
    <div className="space-y-2">
      {!field.settings?.hideLabel && (
        <Label htmlFor={id} className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <div
        className={cn(
          "relative border rounded-md bg-white overflow-hidden",   // white background always
          error ? "border-destructive" : "border-input",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        style={{ width: "100%", height: "150px" }}
      >
        <canvas
          ref={canvasRef}
          id={id}
          className="absolute inset-0 w-full h-full touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {isEmpty && !disabled && (
          <span className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm pointer-events-none">
            Sign here
          </span>
        )}
      </div>

      {!disabled && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearSignature}
            disabled={isEmpty}
          >
            Clear
          </Button>
        </div>
      )}

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