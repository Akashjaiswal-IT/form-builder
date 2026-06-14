import { z } from "zod";

export const authenticatedUserSchema = z
  .object({
    id: z.uuid().describe("User ID"),
    fullName: z.string().describe("User full name"),
    email: z.email().describe("User email address"),
    emailVerified: z.boolean().describe("Whether email is verified"),
    profileImageUrl: z.string().nullable().describe("User profile image URL"),
  })
  .describe("Authenticated User");
export type AuthenticatedUserSchema = z.infer<typeof authenticatedUserSchema>;

export const getAuthenticationMethodOutputSchema = z
  .object({
    provider: z.enum(["EMAIL_PASSWORD", "GOOGLE_OAUTH"]).describe("Authentication provider"),
    displayName: z.string().optional().describe("Display name for the provider"),
    displayText: z.string().optional().describe("Display text for the provider"),
    authUrl: z.string().optional().describe("Authentication URL"),
  })
  .describe("Authentication Method");
export type GetAuthenticationMethodOutputSchema = z.infer<
  typeof getAuthenticationMethodOutputSchema
>;
