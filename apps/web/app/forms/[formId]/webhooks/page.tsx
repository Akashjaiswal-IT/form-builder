"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Pencil, ScrollText, Play } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Spinner } from "~/components/ui/spinner";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "~/components/ui/empty";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { trpc } from "~/trpc/client";
import { WebhookDialog } from "~/components/forms/builder/webhook-dialog";
import { WebhookLogsDialog } from "~/components/forms/builder/webhook-logs-dialog";
import type { RouterOutputs } from "@repo/trpc/client";

type FormData = RouterOutputs['forms']['getById'];
type WebhookItem = RouterOutputs['forms']['listWebhooks']['webhooks'][number];

export default function WebhooksPage() {
  const { formId } = useParams<{ formId: string }>();

  const userQuery = trpc.auth.getCurrentUser.useQuery();
  const formQuery = trpc.forms.getById.useQuery({ formId });
  const webhooksQuery = trpc.forms.listWebhooks.useQuery({ formId });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [logsWebhookId, setLogsWebhookId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const deleteMutation = trpc.forms.deleteWebhook.useMutation({
    onSuccess: () => {
      toast.success("Webhook deleted.");
      void utils.forms.listWebhooks.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const testMutation = trpc.forms.testWebhook.useMutation({
    onSuccess: () => toast.success("Test event sent."),
    onError: (error) => toast.error(error.message),
  });

  if (userQuery.isPending || formQuery.isPending || webhooksQuery.isPending) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="mr-2" /> Loading…
      </div>
    );
  }

  if (userQuery.isError || formQuery.isError) {
    return <div className="p-8 text-destructive">Failed to load.</div>;
  }

  const form: FormData = formQuery.data!;
  const webhooks: WebhookItem[] = webhooksQuery.data?.webhooks ?? [];

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link href={`/forms/${formId}`}>
          <ArrowLeft className="size-4 mr-1" /> Back to builder
        </Link>
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Webhooks for {form?.title ?? "Untitled Form"}
          </h1>
          <p className="text-muted-foreground mt-0.5">
            Send real‑time notifications to external services.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingWebhook(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4 mr-1.5" /> Add webhook
        </Button>
      </div>

      {webhooks.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No webhooks</EmptyTitle>
            <EmptyDescription>
              Add a webhook to get notified when responses are submitted, forms are published, etc.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((wh) => (
                  <TableRow key={wh.id}>
                    <TableCell className="font-medium">{wh.name}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[200px]">
                      {wh.url}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(wh.events ?? []).map((e) => (
                          <Badge key={e} variant="secondary" className="text-xs">
                            {e.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={wh.enabled ? "default" : "secondary"}>
                        {wh.enabled ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => testMutation.mutate({ webhookId: wh.id })}
                          title="Send test event"
                          disabled={testMutation.isPending}
                        >
                          <Play className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setLogsWebhookId(wh.id)}
                          title="Delivery logs"
                        >
                          <ScrollText className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => {
                            setEditingWebhook(wh);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeletingId(wh.id)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add / Edit dialog */}
      <WebhookDialog
        formId={formId}
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) setEditingWebhook(null);
          setDialogOpen(open);
        }}
        webhook={editingWebhook}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Future events will no longer be sent to this URL.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingId) deleteMutation.mutate({ webhookId: deletingId });
                setDeletingId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logs dialog */}
      {logsWebhookId && (
        <WebhookLogsDialog
          webhookId={logsWebhookId}
          open={!!logsWebhookId}
          onOpenChange={(open) => {
            if (!open) setLogsWebhookId(null);
          }}
        />
      )}
    </div>
  );
}