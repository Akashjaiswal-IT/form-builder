"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { trpc } from "~/trpc/client";
import { Spinner } from "~/components/ui/spinner";
import { Badge } from "~/components/ui/badge";

interface WebhookLogsDialogProps {
  webhookId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WebhookLogsDialog({
  webhookId,
  open,
  onOpenChange,
}: WebhookLogsDialogProps) {
  const logsQuery = trpc.forms.getWebhookLogs.useQuery(
    { webhookId, limit: 20 },
    { enabled: open },
  );

  const logs = logsQuery.data?.logs;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Delivery logs</DialogTitle>
          <DialogDescription>
            Recent webhook deliveries and their status.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto">
          {logsQuery.isPending ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : logsQuery.isError ? (
            <p className="text-destructive text-sm py-4 text-center">
              Failed to load logs.
            </p>
          ) : !logs || logs.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No deliveries yet.
            </p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 rounded-md border p-3 text-sm"
                >
                  <Badge
                    variant="secondary"
                    className={
                      log.statusCode && log.statusCode >= 200 && log.statusCode < 300
                        ? "bg-emerald-100 text-emerald-700"
                        : log.error
                          ? "bg-red-100 text-red-700"
                          : "bg-muted text-muted-foreground"
                    }
                  >
                    {log.statusCode ?? "ERR"}
                  </Badge>
                  <span className="flex-1 text-muted-foreground truncate">
                    {log.event}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(log.createdAt as string | Date).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}