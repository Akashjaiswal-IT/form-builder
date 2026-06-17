"use client";

import { useState } from "react";
import { Check, Settings } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Separator } from "~/components/ui/separator";
import { useFormBuilderStore } from "~/stores/form-builder-store";
import type { FormSettings } from "~/types/form";

// ------------------------------------------------------------------
// Helpers that work with local time, so the input always shows what
// the user expects.
// ------------------------------------------------------------------

function toLocalDatetimeValue(raw: string | null | undefined): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toUtcStorage(localValue: string): string | null {
  if (!localValue) return null;
  return new Date(localValue).toISOString();
}

export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const schema = useFormBuilderStore((s) => s.schema);
  const updateSettings = useFormBuilderStore((s) => s.updateSettings);

  const settings = schema.settings;

  const update = (patch: Partial<FormSettings>) => {
    updateSettings(patch);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="size-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Form settings</TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Form settings</DialogTitle>
          <DialogDescription>
            Configure how this form behaves and appears to users.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-4 py-2">
            {/* General */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">General</h4>
              <div className="flex items-center justify-between">
                <Label htmlFor="sw-requireLogin" className="text-sm cursor-pointer">
                  Require login to submit
                </Label>
                <Switch
                  id="sw-requireLogin"
                  checked={settings.requireLogin}
                  onCheckedChange={(v) => update({ requireLogin: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="sw-multiSub" className="text-sm cursor-pointer">
                  Allow multiple submissions
                </Label>
                <Switch
                  id="sw-multiSub"
                  checked={settings.allowMultipleSubmissions}
                  onCheckedChange={(v) => update({ allowMultipleSubmissions: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="sw-progress" className="text-sm cursor-pointer">
                  Show progress bar
                </Label>
                <Switch
                  id="sw-progress"
                  checked={settings.showProgressBar}
                  onCheckedChange={(v) => update({ showProgressBar: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="sw-shuffle" className="text-sm cursor-pointer">
                  Shuffle fields (excl. layout)
                </Label>
                <Switch
                  id="sw-shuffle"
                  checked={settings.shuffleFields}
                  onCheckedChange={(v) => update({ shuffleFields: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="sw-notify" className="text-sm cursor-pointer">
                  Email me on new responses
                </Label>
                <Switch
                  id="sw-notify"
                  checked={settings.notifyOnResponse}
                  onCheckedChange={(v) => update({ notifyOnResponse: v })}
                />
              </div>
            </div>

            <Separator />

            {/* Submission */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Submission</h4>
              <div className="space-y-1.5">
                <Label htmlFor="submitButtonText" className="text-xs">
                  Submit button text
                </Label>
                <Input
                  id="submitButtonText"
                  value={settings.submitButtonText}
                  onChange={(e) => update({ submitButtonText: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="successMessage" className="text-xs">
                  Success message
                </Label>
                <Textarea
                  id="successMessage"
                  value={settings.successMessage}
                  onChange={(e) => update({ successMessage: e.target.value })}
                  className="text-sm min-h-[60px]"
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="redirectUrl" className="text-xs">
                  Redirect URL (optional)
                </Label>
                <Input
                  id="redirectUrl"
                  value={settings.redirectUrl ?? ""}
                  onChange={(e) =>
                    update({ redirectUrl: e.target.value || null })
                  }
                  placeholder="https://example.com/thank-you"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="closedMessage" className="text-xs">
                  Closed message
                </Label>
                <Input
                  id="closedMessage"
                  value={settings.closedMessage}
                  onChange={(e) => update({ closedMessage: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <Separator />

            {/* Limits */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Limits</h4>
              <div className="space-y-1.5">
                <Label htmlFor="limitResponses" className="text-xs">
                  Response limit (empty = unlimited)
                </Label>
                <Input
                  id="limitResponses"
                  type="number"
                  min={1}
                  value={settings.limitResponses ?? ""}
                  onChange={(e) =>
                    update({
                      limitResponses: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  className="h-8 text-sm"
                  placeholder="No limit"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate" className="text-xs">
                    Start date (optional)
                  </Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={toLocalDatetimeValue(settings.startDate)}
                    onChange={(e) =>
                      update({
                        startDate: toUtcStorage(e.target.value),
                      })
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endDate" className="text-xs">
                    End date (optional)
                  </Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={toLocalDatetimeValue(settings.endDate)}
                    onChange={(e) =>
                      update({
                        endDate: toUtcStorage(e.target.value),
                      })
                    }
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            <Check className="size-4 mr-1" /> Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}