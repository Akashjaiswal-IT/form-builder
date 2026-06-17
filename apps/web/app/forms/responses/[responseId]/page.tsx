"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Spinner } from "~/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { trpc } from "~/trpc/client";
import type { RouterOutputs } from "@repo/trpc/client";

type GetResponseResult = RouterOutputs['forms']['getResponse'];
type FullFormResult = RouterOutputs['forms']['getFullById'];

export default function ResponseDetailPage() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  const router = useRouter();
  const params = useParams<{ responseId: string }>();
  const searchParams = useSearchParams();
  const responseId = params.responseId;
  const formId = searchParams.get("formId") ?? "";

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
    <main className="container max-w-3xl mx-auto py-8 px-4">
      <ResponseContent responseId={responseId} formId={formId} />
    </main>
  );
}

function ResponseContent({ responseId, formId }: { responseId: string; formId: string }) {
  const responseQuery = trpc.forms.getResponse.useQuery(
    { responseId },
    { enabled: !!responseId },
  );
  const formQuery = trpc.forms.getFullById.useQuery(
    { formId },
    { enabled: !!formId },
  );

  const response: GetResponseResult | undefined = responseQuery.data;
  const formData: FullFormResult | undefined = formQuery.data;

  const fieldMap = useMemo(() => {
    if (!formData?.fields) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const f of formData.fields) {
      map.set(f.id, f.label || f.name);
    }
    return map;
  }, [formData]);

  if (responseQuery.isPending || formQuery.isPending) return <ResponseDetailSkeleton />;
  if (responseQuery.isError || formQuery.isError)
    return <div className="text-destructive text-center">Failed to load response details.</div>;
  if (!response)
    return <div className="text-destructive text-center">Response not found.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/forms/${formId}/responses`}>
            <ArrowLeft className="size-4 mr-1" /> Back to responses
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold">Response Details</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Metadata</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Status:</span>{" "}
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
          </div>
          <div>
            <span className="text-muted-foreground">IP Address:</span>{" "}
            {response.ipAddress ?? "N/A"}
          </div>
          <div>
            <span className="text-muted-foreground">User Agent:</span>{" "}
            {response.userAgent
              ? response.userAgent.substring(0, 80) + "…"
              : "N/A"}
          </div>
          <div>
            <span className="text-muted-foreground">Started:</span>{" "}
            {new Date(response.startedAt as string | Date).toLocaleString()}
          </div>
          <div>
            <span className="text-muted-foreground">Completed:</span>{" "}
            {response.completedAt
              ? new Date(response.completedAt as string | Date).toLocaleString()
              : "—"}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Field Values</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(response.data ?? []).map((item) => {
                const fieldName = fieldMap.get(item.fieldId) ?? item.fieldId;
                let displayValue: string;
                if (item.value === null || item.value === undefined)
                  displayValue = "—";
                else if (typeof item.value === "object")
                  displayValue = JSON.stringify(item.value);
                else
                  displayValue = String(item.value);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground">
                      {fieldName}
                    </TableCell>
                    <TableCell className="whitespace-pre-wrap">
                      {displayValue}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(response.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="text-center text-muted-foreground"
                  >
                    No field data
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ResponseDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-6 w-48" />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-20" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-20" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}