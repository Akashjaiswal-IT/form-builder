"use client";

import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Copy, Code } from "lucide-react";

interface EmbedDialogProps {
  url: string;
  title: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EmbedDialog({ url, title, open, onOpenChange }: EmbedDialogProps) {
  const iframeCode = `<iframe src="${url}" width="100%" height="600" frameborder="0" style="border: none;"></iframe>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(iframeCode).then(
      () => toast.success("Embed code copied to clipboard"),
      () => toast.error("Failed to copy"),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open === undefined && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <Code className="size-4 mr-2" />
            Embed
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Embed this form</DialogTitle>
          <DialogDescription>
            Copy the code below and paste it into your website to show &ldquo;{title}&rdquo;.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            readOnly
            value={iframeCode}
            rows={3}
            className="font-mono text-xs break-all whitespace-pre-wrap"
          />
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            <Copy className="size-4 mr-1" /> Copy code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}