import { z } from "zod";

const envSchema = z.object({
  BASE_URL: z.string().url().default("http://localhost:8000"),
  WEB_APP_URL: z.string().url().default("http://localhost:3000"),

  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url().optional(),

  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string(),
  SMTP_PASSWORD: z.string(),
  SMTP_FROM_NAME: z.string(),
  SMTP_FROM_EMAIL: z.string().email(),

  IMAGEKIT_PUBLIC_KEY: z.string(),
  IMAGEKIT_PRIVATE_KEY: z.string(),
  IMAGEKIT_URL_ENDPOINT: z.string().url(),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) throw new Error(safeParseResult.error.message);
  return safeParseResult.data;
}

export const env = createEnv(process.env);
