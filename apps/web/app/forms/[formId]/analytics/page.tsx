"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, MousePointer2, CheckCircle2, TrendingUp } from "lucide-react";
import { trpc } from "~/trpc/client";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ── types ────────────────────────────────────────────────────────────────────

type AnalyticsDay = {
  date: string;
  views: number;
  starts: number;
  completions: number;
};

type Totals = { views: number; starts: number; completions: number };

// ── sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  sub?: string;
}

function StatCard({ label, value, icon, sub }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function PageSkeleton() {
  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      <Skeleton className="h-5 w-28" />
      <div className="space-y-1">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-24 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { formId } = useParams<{ formId: string }>();

  const formQuery = trpc.forms.getById.useQuery({ formId });
  const analyticsQuery = trpc.forms.getAnalytics.useQuery({ formId });

  if (formQuery.isPending || analyticsQuery.isPending) {
    return <PageSkeleton />;
  }

  if (formQuery.isError || analyticsQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-4">
        <p className="font-medium text-destructive">Failed to load analytics</p>
        <p className="text-sm text-muted-foreground">
          You may not have access to this form, or something went wrong.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void formQuery.refetch();
            void analyticsQuery.refetch();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  const form = formQuery.data;
  const { analytics, totals } = analyticsQuery.data ?? {
    analytics: [] as AnalyticsDay[],
    totals: { views: 0, starts: 0, completions: 0 } as Totals,
  };

  const pct = (num: number, den: number) =>
    den > 0 ? `${Math.round((num / den) * 100)}%` : "—";

  const chartData = analytics.map((day: AnalyticsDay) => ({
    date: new Date(day.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    Views: day.views,
    Starts: day.starts,
    Completions: day.completions,
  }));

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={`/forms/${formId}`}>
          <ArrowLeft className="size-4 mr-1" />
          Back to form
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {form?.title ?? "Untitled Form"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Last 30 days</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Views"
          value={totals.views}
          icon={<Eye className="size-4" />}
        />
        <StatCard
          label="Started"
          value={totals.starts}
          icon={<MousePointer2 className="size-4" />}
          sub={`${pct(totals.starts, totals.views)} of views`}
        />
        <StatCard
          label="Completions"
          value={totals.completions}
          icon={<CheckCircle2 className="size-4" />}
          sub={`${pct(totals.completions, totals.starts)} of starts`}
        />
        <StatCard
          label="Completion Rate"
          value={pct(totals.completions, totals.views)}
          icon={<TrendingUp className="size-4" />}
          sub="Completions / views"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Daily Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
              <TrendingUp className="size-8 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No data yet</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Views and submissions will appear here once your form is active.
              </p>
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  barCategoryGap="35%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                    contentStyle={{
                      borderRadius: "0.5rem",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--popover)",
                      color: "var(--popover-foreground)",
                      fontSize: "0.75rem",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: "1rem" }} />
                  <Bar dataKey="Views" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Starts" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Completions" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}