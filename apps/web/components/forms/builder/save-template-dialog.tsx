"use client";

import { useState } from "react";
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
import { trpc } from "~/trpc/client";

interface SaveTemplateDialogProps {
  formId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveTemplateDialog({ formId, open, onOpenChange }: SaveTemplateDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [isSaving, setIsSaving] = useState(false);

  const utils = trpc.useUtils();
  const mutation = trpc.forms.saveAsTemplate.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      void utils.forms.listUserTemplates.invalidate();
      onOpenChange(false);
      setName("");
      setDescription("");
      setCategory("General");
    },
    onError: (error) => toast.error(error.message),
    onSettled: () => setIsSaving(false),
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Template name is required.");
      return;
    }
    setIsSaving(true);
    mutation.mutate({
      formId,
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim() || "General",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save this form as a reusable template for later use.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">Name</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Template"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-desc">Description (optional)</Label>
            <Input
              id="tpl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this template for?"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-category">Category</Label>
            <Input
              id="tpl-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="General"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}