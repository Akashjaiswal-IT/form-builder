import { initTRPC, TRPCError } from "@trpc/server";
import { OpenApiMeta } from "trpc-to-openapi";

import { createContext } from "./context";
import { AUTH_SESSION_COOKIE_NAME, readCookie } from "./utils/auth-cookie";
import { userService } from "./services";

export const tRPCContext = initTRPC
  .meta<OpenApiMeta>()
  .context<typeof createContext>()
  .create({});

export const router = tRPCContext.router;

export const publicProcedure = tRPCContext.procedure;

export const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const sessionToken = readCookie(ctx.req.headers.cookie, AUTH_SESSION_COOKIE_NAME);
  const user = await userService.getAuthenticatedUserBySessionToken(sessionToken);

  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({ ctx: { ...ctx, user } });
});