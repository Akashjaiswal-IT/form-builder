import express from "express";
import { logger } from "@repo/logger";
import cors from "cors";

import * as trpcExpress from "@trpc/server/adapters/express";
import { generateOpenApiDocument, createOpenApiExpressMiddleware } from "trpc-to-openapi";
import { apiReference } from "@scalar/express-api-reference";

import { serverRouter, createContext, authenticatedUserSchema, getAuthenticationMethodOutputSchema } from "@repo/trpc/server";

import { env } from "./env";

// ---------- Google OAuth imports ----------
import { userService } from "@repo/trpc/server/services";
import { setAuthSessionCookie } from "@repo/trpc/server/utils/auth-cookie";
// ------------------------------------------

export const app = express();
const openApiDocument = generateOpenApiDocument(serverRouter, {
  title: "Form Builder OpenAPI",
  version: "1.0.0",
  baseUrl: env.BASE_URL.concat("/api"),
  defs: {
    AuthenticatedUser: authenticatedUserSchema,
    AuthenticationMethod: getAuthenticationMethodOutputSchema,
  },
});

app.use(
  cors({
    origin: env.WEB_APP_URL,
    credentials: true,
  }),
);

app.use(express.json());

// ---------- Google OAuth Callback ----------
app.get(
  "/api/auth/google/callback",
  async (req: express.Request, res: express.Response) => {
    try {
      const { code } = req.query;

      if (!code || typeof code !== "string") {
        return res.redirect(
          `${env.WEB_APP_URL}/login?error=Missing%20authorization%20code`,
        );
      }

      const result = await userService.signInWithGoogle(code);

      setAuthSessionCookie({
        res,
        sessionToken: result.sessionToken,
        expiresAt: result.sessionExpiresAt,
        isProduction: env.NODE_ENV === "production",
      });

      res.redirect(`${env.WEB_APP_URL}/forms`);
    } catch (error) {
      logger.error("Google OAuth callback failed", { error });
      res.redirect(
        `${env.WEB_APP_URL}/login?error=Google%20authentication%20failed`,
      );
    }
  },
);
// ------------------------------------------

app.get("/", (req, res) => {
  return res.json({ message: "Form Builder is up and running..." });
});

app.get("/health", (req, res) => {
  return res.json({ message: "Form Builder server is healthy", healthy: true });
});

logger.debug(`openapi.json: ${env.BASE_URL}/openapi.json`);
app.get("/openapi.json", (req, res) => {
  return res.json(openApiDocument);
});

logger.debug(`docs: ${env.BASE_URL}/docs`);
app.use("/docs", apiReference({ url: "/openapi.json" }));

app.use(
  "/api",
  createOpenApiExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

export default app;
