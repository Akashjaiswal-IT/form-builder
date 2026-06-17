import {
  authenticatedUserSchema,
  getAuthenticationMethodOutputSchema,
} from "@repo/services/user/model";
import { z, zodUndefinedModel } from "../../schema";
import { imageKitService, userService } from "../../services";
import { publicProcedure, protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import {
  AUTH_SESSION_COOKIE_NAME,
  clearAuthSessionCookie,
  readCookie,
  setAuthSessionCookie,
} from "../../utils/auth-cookie";

const TAGS = ["Authentication"];
const getPath = generatePath("/authentication");
const isProduction = process.env.NODE_ENV === "production";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[0-9]/, "Password must include a number");

export const authRouter = router({
  getSupportedAuthenticationProviders: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/supported-providers"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(z.readonly(z.array(getAuthenticationMethodOutputSchema)))
    .query(async () => {
      return userService.getAuthenticationMethods();
    }),

  getCurrentUser: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/current-user"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(authenticatedUserSchema.nullable())
    .query(async ({ ctx }) => {
      const sessionToken = readCookie(
        ctx.req.headers.cookie,
        AUTH_SESSION_COOKIE_NAME,
      );

      return userService.getAuthenticatedUserBySessionToken(sessionToken);
    }),

  signUpWithEmailAndPassword: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/sign-up"), tags: TAGS } })
    .input(
      z.object({
        fullName: z.string().min(2, "Name must be at least 2 characters"),
        email: z.email("Invalid email address"),
        password: passwordSchema,
        profileImageUrl: z.string().url().optional(),
        profileImageFileId: z.string().optional(),
      })
    )
    .output(
      z.object({
        user: authenticatedUserSchema,
        message: z.string(),
        emailVerificationSent: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      return userService.signUpWithEmailAndPassword(input);
    }),

  signInWithEmailAndPassword: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/sign-in"), tags: TAGS } })
    .input(
      z.object({
        email: z.email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
      }),
    )
    .output(
      z.object({
        user: authenticatedUserSchema,
        message: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await userService.signInWithEmailAndPassword(input);

      setAuthSessionCookie({
        res: ctx.res,
        sessionToken: result.sessionToken,
        expiresAt: result.sessionExpiresAt,
        isProduction,
      });

      return {
        user: result.user,
        message: result.message,
      };
    }),

  signOut: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/sign-out"), tags: TAGS } })
    .input(z.object({ allSessions: z.boolean().default(false) }))
    .output(z.object({ message: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sessionToken = readCookie(
        ctx.req.headers.cookie,
        AUTH_SESSION_COOKIE_NAME,
      );

      if (input.allSessions) {
        const currentUser =
          await userService.getAuthenticatedUserBySessionToken(sessionToken);

        if (currentUser) {
          await userService.signOutAllSessionsForUser(currentUser.id);
        }
      } else {
        await userService.signOutBySessionToken(sessionToken);
      }

      clearAuthSessionCookie(ctx.res, isProduction);

      return { message: "Signed out successfully." };
    }),

  verifyEmailAddress: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/verify-email"), tags: TAGS } })
    .input(z.object({ token: z.string().min(1, "Verification token is required") }))
    .output(z.object({ message: z.string() }))
    .mutation(async ({ input }) => {
      return userService.verifyEmailAddress(input.token);
    }),

  resendEmailVerification: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/resend-verification"), tags: TAGS } })
    .input(z.object({ email: z.email("Invalid email address") }))
    .output(z.object({ message: z.string() }))
    .mutation(async ({ input }) => {
      return userService.resendEmailVerification(input.email);
    }),

  requestPasswordReset: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/request-password-reset"), tags: TAGS } })
    .input(z.object({ email: z.email("Invalid email address") }))
    .output(z.object({ message: z.string() }))
    .mutation(async ({ input }) => {
      return userService.requestPasswordReset(input.email);
    }),

  resetPasswordWithToken: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/reset-password"), tags: TAGS } })
    .input(
      z.object({
        token: z.string().min(1, "Password reset token is required"),
        newPassword: passwordSchema,
      }),
    )
    .output(z.object({ message: z.string() }))
    .mutation(async ({ input }) => {
      return userService.resetPasswordWithToken(input);
    }),

  getImageKitUploadAuthenticationParameters: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/imagekit-upload-auth"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(
      z.object({
        token: z.string(),
        expire: z.number(),
        signature: z.string(),
        publicKey: z.string(),
        urlEndpoint: z.string().url(),
      }),
    )
    .query(() => {
      return imageKitService.getUploadAuthenticationParameters();
    }),

      /** Update the current user's full name */
  updateCurrentUser: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: getPath("/current-user") } })
    .input(z.object({ fullName: z.string().min(1).max(120) }))
    .output(authenticatedUserSchema)
    .mutation(async ({ ctx, input }) => {
      return userService.updateCurrentUser(ctx.user.id, input.fullName);
    }),

  /** Update the current user's profile image */
  updateProfileImage: protectedProcedure
    .meta({ openapi: { method: "PATCH", path: getPath("/profile-image") } })
    .input(z.object({
      profileImageUrl: z.string().url(),
      profileImageFileId: z.string().optional(),
    }))
    .output(authenticatedUserSchema)
    .mutation(async ({ ctx, input }) => {
      return userService.updateUserProfileImage({
        userId: ctx.user.id,
        profileImageUrl: input.profileImageUrl,
        profileImageFileId: input.profileImageFileId,
      });
    }),
});
