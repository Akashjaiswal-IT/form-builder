import express from "express";
import { logger } from "@repo/logger";
import cors from "cors";

import * as trpcExpress from "@trpc/server/adapters/express";
import { generateOpenApiDocument, createOpenApiExpressMiddleware } from "trpc-to-openapi";
import { apiReference } from "@scalar/express-api-reference";

import { serverRouter, createContext, authenticatedUserSchema, getAuthenticationMethodOutputSchema } from "@repo/trpc/server";

import { env } from "./env";

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
