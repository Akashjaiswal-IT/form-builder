"use client";

import { QRCodeCanvas } from "qrcode.react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

function QrCodeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M16 16h.01" />
      <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
      <path d="M3 21v-5" />
      <path d="M16 8v1" />
    </svg>
  );
}

interface QrDialogProps {
  url: string;
  title: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function QrDialog({ url, title, open, onOpenChange }: QrDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Only render a trigger if the dialog is uncontrolled (no external open state) */}
      {open === undefined && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <QrCodeIcon className="size-4 mr-2" />
            QR Code
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Share this form</DialogTitle>
          <DialogDescription>
            Scan the QR code to open &ldquo;{title}&rdquo;
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <QRCodeCanvas value={url} size={200} level="M" includeMargin />
        </div>
        <div className="text-center text-xs text-muted-foreground break-all">
          {url}
        </div>
      </DialogContent>
    </Dialog>
  );
}