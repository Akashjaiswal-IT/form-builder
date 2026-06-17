"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Spinner } from "~/components/ui/spinner";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "~/components/ui/empty";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
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
import { downloadCsv } from "~/lib/export-csv";
import type { RouterOutputs } from "@repo/trpc/client";

type ResponseItem = RouterOutputs['forms']['listResponses']['responses'][number];
type GetResponseResult = RouterOutputs['forms']['getResponse'];

/* ------------------------------------------------------------------ */
/*  Page wrapper                                                       */
/* ------------------------------------------------------------------ */
export default function ResponsesPage() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const router = useRouter();
  const params = useParams<{ formId: string }>();
  const formId = params.formId;

  const userQuery = trpc.auth.getCurrentUser.useQuery(undefined, { enabled: isMounted });

  if (!isMounted) return null;
  if (userQuery.isPending)
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Spinner className="mr-2" /> Checking session…
      </div>
    );
  if (!userQuery.data) {
    router.replace("/login?next=/forms");
    return null;
  }

  return (
    <main className="container max-w-5xl mx-auto py-8 px-4">
      <ResponseList formId={formId} />
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Response list                                                      */
/* ------------------------------------------------------------------ */
function ResponseList({ formId }: { formId: string }) {
  const utils = trpc.useUtils();
  const [page, setPage] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const limit = 20;
  const offset = page * limit;

  const formQuery = trpc.forms.getFullById.useQuery({ formId }, { enabled: !!formId });
  const responsesQuery = trpc.forms.listResponses.useQuery(
    { formId, limit, offset },
    { enabled: !!formId },
  );

  const deleteMutation = trpc.forms.deleteResponse.useMutation({
    onSuccess: () => {
      toast.success("Response deleted.");
      utils.forms.listResponses.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  if (formQuery.isPending || responsesQuery.isPending) return <ResponseListSkeleton />;
  if (formQuery.isError || responsesQuery.isError)
    return <div className="text-destructive text-center">Failed to load responses.</div>;

  const formTitle = formQuery.data?.form?.title ?? "Form";
  const responses = responsesQuery.data?.responses ?? [];
  const total = responsesQuery.data?.total ?? 0;

  /* ---------------------------------------------------------------- */
  /*  CSV Export  (signature base64 truncated)                         */
  /* ---------------------------------------------------------------- */
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      // 1. Fetch form fields for header labels
      const formFull = await utils.forms.getFullById.fetch({ formId });
      const fieldMap = new Map<string, string>();
      const fieldOrder: string[] = [];
      if (formFull?.fields) {
        for (const f of formFull.fields) {
          fieldMap.set(f.id, f.label);
          fieldOrder.push(f.id);
        }
      }

      // 2. Fetch all responses (paginate with limit 100)
      const batchSize = 100;
      let currentOffset = 0;
      const allResponses: ResponseItem[] = [];

      while (true) {
        const batch = await utils.forms.listResponses.fetch({
          formId,
          limit: batchSize,
          offset: currentOffset,
        });
        const list = batch?.responses ?? [];
        if (list.length === 0) break;
        allResponses.push(...list);
        if (list.length < batchSize) break;
        currentOffset += batchSize;
      }

      // 3. Build rows
      const usedFieldIds = new Set<string>();
      const rows: Record<string, string>[] = [];

      for (const [index, response] of allResponses.entries()) {
        const detail: GetResponseResult | undefined =
          await utils.forms.getResponse.fetch({
            responseId: response.id,
          });

        const row: Record<string, string> = {
          "#": String(index + 1),
          Submitted: new Date(response.createdAt as string | Date).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        if (detail?.data) {
          for (const item of detail.data) {
            usedFieldIds.add(item.fieldId);
            const label =
              fieldMap.get(item.fieldId) ?? `Field (${item.fieldId.slice(0, 4)})`;

            // Prevent huge signature base64 strings from bloating the CSV
            let cleanValue: string;
            if (
              typeof item.value === "string" &&
              item.value.startsWith("data:image")
            ) {
              cleanValue = "[Signature]";
            } else if (typeof item.value === "object" && item.value !== null) {
              cleanValue = JSON.stringify(item.value);
            } else {
              cleanValue = String(item.value ?? "");
            }

            row[label] = cleanValue;
          }
        }
        rows.push(row);
      }

      // 4. Build headers: "#", "Submitted", then field labels in builder order
      const headers = ["#", "Submitted"];
      for (const fieldId of fieldOrder) {
        if (usedFieldIds.has(fieldId)) {
          const label = fieldMap.get(fieldId) ?? fieldId.slice(0, 4);
          if (!headers.includes(label)) headers.push(label);
        }
      }

      // 5. Download
      const safeTitle = formTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      downloadCsv(
        rows,
        headers,
        `responses-${safeTitle}-${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/forms/${formId}`}>
            <ArrowLeft className="size-4 mr-1" /> Back to builder
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={isExporting}
        >
          {isExporting ? (
            <Spinner className="size-4 mr-1" />
          ) : (
            <Download className="size-4 mr-1" />
          )}
          {isExporting ? "Exporting…" : "Export CSV"}
        </Button>
      </div>
      <h1 className="text-2xl font-bold">{formTitle} – Responses</h1>

      {responses.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No responses yet</EmptyTitle>
            <EmptyDescription>
              When users submit your form, responses will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Response ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map((response) => (
                  <TableRow key={response.id}>
                    <TableCell className="font-mono text-xs">
                      {response.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          response.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                            : response.status === "IN_PROGRESS"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        }
                      >
                        {response.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(response.createdAt as string | Date).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-xs" asChild>
                          <Link href={`/forms/responses/${response.id}?formId=${formId}`}>
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                        <DeleteResponseButton
                          responseId={response.id}
                          onDelete={() => deleteMutation.mutate({ responseId: response.id })}
                          isDeleting={deleteMutation.isPending}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * limit >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete button + confirmation dialog                                */
/* ------------------------------------------------------------------ */
function DeleteResponseButton({
  responseId,
  onDelete,
  isDeleting,
}: {
  responseId: string;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="icon-xs" onClick={() => setOpen(true)}>
        <Trash2 className="size-4 text-destructive" />
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete response?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setOpen(false);
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton loader                                                    */
/* ------------------------------------------------------------------ */
function ResponseListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-6 w-64" />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Skeleton className="h-4 w-20" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-24" />
              </TableHead>
              <TableHead className="text-right">
                <Skeleton className="h-4 w-12 ml-auto" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-4 w-8 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}