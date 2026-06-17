// packages/services/form/services/analytics.service.ts
import { and, eq, gte, lte, asc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "@repo/database";
import { formsTable, formAnalyticsTable } from "@repo/database/schema";

export class AnalyticsService {
  private validateFormAccess(
    form: { userId: string } | undefined,
    userId: string,
  ): asserts form is { userId: string } {
    if (!form) throw new TRPCError({ code: "NOT_FOUND" });
    if (form.userId !== userId)
      throw new TRPCError({ code: "FORBIDDEN" });
  }

  async getAnalytics(
    userId: string,
    options: { formId: string; startDate?: string; endDate?: string },
  ) {
    const [form] = await db
      .select()
      .from(formsTable)
      .where(eq(formsTable.id, options.formId))
      .limit(1);
    this.validateFormAccess(form, userId);

    const conditions = [eq(formAnalyticsTable.formId, options.formId)];
    if (options.startDate) {
      conditions.push(
        gte(formAnalyticsTable.date, new Date(options.startDate)),
      );
    }
    if (options.endDate) {
      conditions.push(
        lte(formAnalyticsTable.date, new Date(options.endDate)),
      );
    }

    const analytics = await db
      .select()
      .from(formAnalyticsTable)
      .where(and(...conditions))
      .orderBy(asc(formAnalyticsTable.date));

    const totals = analytics.reduce(
      (acc, day) => ({
        views: acc.views + day.views,
        starts: acc.starts + day.starts,
        completions: acc.completions + day.completions,
      }),
      { views: 0, starts: 0, completions: 0 },
    );

    return { analytics, totals };
  }

  async recordAnalytics(
    formId: string,
    event: "view" | "start" | "completion",
  ) {
    const utcMidnight = new Date(
      Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );

    const [existing] = await db
      .select({ id: formAnalyticsTable.id })
      .from(formAnalyticsTable)
      .where(
        and(
          eq(formAnalyticsTable.formId, formId),
          eq(formAnalyticsTable.date, utcMidnight),
        ),
      )
      .limit(1);

    if (existing) {
      const increment =
        event === "view"
          ? { views: sql`views + 1` }
          : event === "start"
            ? { starts: sql`starts + 1` }
            : { completions: sql`completions + 1` };

      await db
        .update(formAnalyticsTable)
        .set(increment)
        .where(eq(formAnalyticsTable.id, existing.id));
    } else {
      await db.insert(formAnalyticsTable).values({
        formId,
        date: utcMidnight,
        views: event === "view" ? 1 : 0,
        starts: event === "start" ? 1 : 0,
        completions: event === "completion" ? 1 : 0,
      });
    }
  }
}