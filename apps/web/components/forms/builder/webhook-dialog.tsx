"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Switch } from "~/components/ui/switch";
import { trpc } from "~/trpc/client";
import type { RouterInputs } from "@repo/trpc/client";

// Extract the allowed webhook event literal types from the server schema
type WebhookEventType = NonNullable<
  RouterInputs['forms']['createWebhook']['events']
>[number];

const WEBHOOK_EVENTS = [
  "RESPONSE_SUBMITTED",
  "RESPONSE_UPDATED",
  "FORM_PUBLISHED",
  "FORM_CLOSED",
] as const;

interface WebhookDialogProps {
  formId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhook?: {
    id: string;
    name: string;
    url: string;
    secret?: string | null;
    events: string[] | null;          
    headers?: Record<string, string> | null;
    enabled?: boolean;
  } | null;
}

export function WebhookDialog({
  formId,
  open,
  onOpenChange,
  webhook,
}: WebhookDialogProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>([
    "RESPONSE_SUBMITTED",
  ]);
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const utils = trpc.useUtils();
  const createMutation = trpc.forms.createWebhook.useMutation();
  const updateMutation = trpc.forms.updateWebhook.useMutation();

  // Pre‑fill when editing
  useEffect(() => {
    if (webhook) {
      setName(webhook.name);
      setUrl(webhook.url);
      setSecret(webhook.secret ?? "");
      setEnabled(webhook.enabled ?? true);
      // Cast existing webhook events to the expected type
      setSelectedEvents(
        (webhook.events as WebhookEventType[]) ?? ["RESPONSE_SUBMITTED"],
      );
      const h = webhook.headers ?? {};
      setHeaders(
        Object.entries(h).map(([key, value]) => ({ key, value })),
      );
    } else {
      setName("");
      setUrl("");
      setSecret("");
      setEnabled(true);
      setSelectedEvents(["RESPONSE_SUBMITTED"]);
      setHeaders([]);
    }
  }, [webhook, open]);

  const toggleEvent = (event: WebhookEventType, checked: boolean) => {
    setSelectedEvents((prev) =>
      checked
        ? [...prev, event]
        : prev.filter((e) => e !== event),
    );
  };

  const addHeader = () => setHeaders([...headers, { key: "", value: "" }]);
  const removeHeader = (index: number) =>
    setHeaders(headers.filter((_, i) => i !== index));
  const updateHeader = (index: number, field: "key" | "value", val: string) => {
    const updated = [...headers];
    updated[index] = { ...updated[index]!, [field]: val };
    setHeaders(updated);
  };

  const handleSave = async () => {
    if (!name.trim() || !url.trim()) {
      toast.error("Name and URL are required.");
      return;
    }

    const headerObj: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.key.trim()) headerObj[h.key.trim()] = h.value;
    });

    setIsSaving(true);
    try {
      if (webhook) {
        const input: RouterInputs['forms']['updateWebhook'] = {
          webhookId: webhook.id,
          name: name.trim(),
          url: url.trim(),
          secret: secret.trim() || undefined,
          events: selectedEvents,
          headers: Object.keys(headerObj).length > 0 ? headerObj : undefined,
          enabled,
        };
        await updateMutation.mutateAsync(input);
        toast.success("Webhook updated.");
      } else {
        // `enabled` is not part of the create input schema – excluded.
        const input: RouterInputs['forms']['createWebhook'] = {
          formId,
          name: name.trim(),
          url: url.trim(),
          secret: secret.trim() || undefined,
          events: selectedEvents,
          headers: Object.keys(headerObj).length > 0 ? headerObj : undefined,
        };
        await createMutation.mutateAsync(input);
        toast.success("Webhook created.");
      }
      void utils.forms.listWebhooks.invalidate();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message ?? "Failed to save webhook");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{webhook ? "Edit webhook" : "Add webhook"}</DialogTitle>
          <DialogDescription>
            Webhooks send HTTP requests when form events happen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Enabled toggle (only relevant when editing, but can still show) */}
          <div className="flex items-center justify-between">
            <Label htmlFor="wh-enabled" className="text-sm cursor-pointer">
              Enabled
            </Label>
            <Switch id="wh-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wh-name">Name</Label>
            <Input
              id="wh-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Webhook"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-url">URL</Label>
            <Input
              id="wh-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhook"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-secret">Secret (optional)</Label>
            <Input
              id="wh-secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Used to verify requests"
            />
          </div>

          {/* Events */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Events</Label>
            <div className="grid grid-cols-2 gap-2">
              {WEBHOOK_EVENTS.map((event) => (
                <div key={event} className="flex items-center gap-2">
                  <Checkbox
                    id={`event-${event}`}
                    checked={(selectedEvents as string[]).includes(event)}
                    onCheckedChange={(checked) =>
                      toggleEvent(event as WebhookEventType, checked === true)
                    }
                  />
                  <Label
                    htmlFor={`event-${event}`}
                    className="text-xs cursor-pointer font-normal"
                  >
                    {event.replace(/_/g, " ")}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Custom headers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Custom headers</Label>
              <Button variant="ghost" size="sm" onClick={addHeader} type="button">
                + Add
              </Button>
            </div>
            {headers.map((h, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  placeholder="Key"
                  value={h.key}
                  onChange={(e) => updateHeader(idx, "key", e.target.value)}
                  className="h-8 text-sm flex-1"
                />
                <Input
                  placeholder="Value"
                  value={h.value}
                  onChange={(e) => updateHeader(idx, "value", e.target.value)}
                  className="h-8 text-sm flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeHeader(idx)}
                  type="button"
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : webhook ? "Save changes" : "Create webhook"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}