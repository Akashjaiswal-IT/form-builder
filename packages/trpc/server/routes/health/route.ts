import { z, zodUndefinedModel } from "../../schema";
import { publicProcedure, router } from "../../trpc";

export const healthRouter = router({
  status: publicProcedure
    .meta({ openapi: { method: "GET", path: "/health" } })
    .input(zodUndefinedModel)
    .output(
      z.object({
        status: z.literal("ok").describe("Server status"),
        timestamp: z.string().datetime().describe("Current server time in ISO format"),
        uptime: z.number().describe("Process uptime in seconds"),
      })
    )
    .query(() => {
      return {
        status: "ok" as const,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    }),
});