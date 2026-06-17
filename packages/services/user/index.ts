import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { db } from "@repo/database";
import { logger } from "@repo/logger";
import { authTokensTable, userSessionsTable, usersTable } from "@repo/database/schema";
import { mailService } from "../mail";
import { getGoogleOAuth2Client } from "../clients/google-oauth";
import { AuthenticatedUserSchema, GetAuthenticationMethodOutputSchema } from "./model";

const BCRYPT_SALT_ROUNDS = 12;
const EMAIL_VERIFICATION_TOKEN_HOURS = 24;
const PASSWORD_RESET_TOKEN_MINUTES = 30;
const USER_SESSION_DAYS = 30;

type AuthTokenType = "EMAIL_VERIFICATION" | "PASSWORD_RESET";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createSecureToken() {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function buildWebUrl(pathname: string, token: string) {
  const base = process.env.WEB_APP_URL || "http://localhost:3000";
  const url = new URL(pathname, base);
  url.searchParams.set("token", token);
  return url.toString();
}

class UserService {
  // ---------------------------------------------------------------
  // AUTHENTICATION METHODS
  // ---------------------------------------------------------------
  public async getAuthenticationMethods(): Promise<
    ReadonlyArray<GetAuthenticationMethodOutputSchema>
  > {
    const methods: GetAuthenticationMethodOutputSchema[] = [
      {
        provider: "EMAIL_PASSWORD",
        displayName: "Email",
        displayText: "Sign in with email and password",
      },
    ];

    if (
      process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.GOOGLE_OAUTH_REDIRECT_URI
    ) {
      const client = getGoogleOAuth2Client({
        clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
        clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
      });
      const authUrl = client.generateAuthUrl({
        access_type: "offline",
        scope: ["profile", "email"],
      });

      methods.push({
        provider: "GOOGLE_OAUTH",
        displayName: "Google",
        displayText: "Continue with Google",
        authUrl,
      });
    }

    return methods;
  }

  // ---------------------------------------------------------------
  // SIGN IN WITH GOOGLE
  // ---------------------------------------------------------------
  public async signInWithGoogle(code: string): Promise<{
    sessionToken: string;
    sessionExpiresAt: Date;
    user: AuthenticatedUserSchema;
    message: string;
  }> {
    const client = getGoogleOAuth2Client({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
    });

    // 1. Exchange authorization code for tokens
    const { tokens } = await client.getToken(code);
    const idToken = tokens.id_token;
    if (!idToken) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Google authentication failed: no ID token received.",
      });
    }

    // 2. Verify the ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Google authentication failed: invalid token payload.",
      });
    }

    // 3. Extract user information
    const email = normalizeEmail(payload.email);
    const fullName = payload.name || email.split("@")[0] || "User";
    const profileImageUrl = payload.picture ?? undefined;

    // 4. Find or create user
    let user = await db
      .select({
        id: usersTable.id,
        fullName: usersTable.fullName,
        email: usersTable.email,
        emailVerified: usersTable.emailVerified,
        profileImageUrl: usersTable.profileImageUrl,
      })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!user) {
      const [newUser] = await db
        .insert(usersTable)
        .values({
          fullName,
          email,
          emailVerified: true,
          profileImageUrl,
          authenticationProvider: "GOOGLE_OAUTH",
          passwordHash: null,
        })
        .returning({
          id: usersTable.id,
          fullName: usersTable.fullName,
          email: usersTable.email,
          emailVerified: usersTable.emailVerified,
          profileImageUrl: usersTable.profileImageUrl,
        });

      if (!newUser) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to create account.",
        });
      }
      user = newUser;
    } else {
      if (profileImageUrl) {
        await db
          .update(usersTable)
          .set({ profileImageUrl, updatedAt: new Date() })
          .where(eq(usersTable.id, user.id));
      }
    }

    // 5. Create session
    const sessionToken = createSecureToken();
    const sessionExpiresAt = addDays(new Date(), USER_SESSION_DAYS);

    await db.insert(userSessionsTable).values({
      userId: user.id,
      sessionTokenHash: hashToken(sessionToken),
      expiresAt: sessionExpiresAt,
    });

    return {
      sessionToken,
      sessionExpiresAt,
      user: this.toAuthenticatedUser(user),
      message: "Signed in with Google.",
    };
  }

  // ---------------------------------------------------------------
  // REMAINING METHODS (unchanged)
  // ---------------------------------------------------------------
  public async signUpWithEmailAndPassword({
    fullName,
    email,
    password,
    profileImageUrl,
    profileImageFileId,
  }: {
    fullName: string;
    email: string;
    password: string;
    profileImageUrl?: string;
    profileImageFileId?: string;
  }): Promise<{
    user: AuthenticatedUserSchema;
    message: string;
    emailVerificationSent: boolean;
  }> {
    const normalizedEmail = normalizeEmail(email);

    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const [user] = await db
      .insert(usersTable)
      .values({
        fullName: fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        profileImageUrl,
        profileImageFileId,
        authenticationProvider: "EMAIL_PASSWORD",
      })
      .returning({
        id: usersTable.id,
        fullName: usersTable.fullName,
        email: usersTable.email,
        emailVerified: usersTable.emailVerified,
        profileImageUrl: usersTable.profileImageUrl,
      });

    if (!user) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to create your account right now.",
      });
    }

    const emailVerificationSent = await this.sendVerificationMailForUser({
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
    });

    return {
      user,
      message: emailVerificationSent
        ? "Account created. Please verify your email address."
        : "Account created, but the verification email could not be sent. Try signing in to request a fresh link.",
      emailVerificationSent,
    };
  }

  public async signInWithEmailAndPassword({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<{
    sessionToken: string;
    sessionExpiresAt: Date;
    user: AuthenticatedUserSchema;
    message: string;
  }> {
    const normalizedEmail = normalizeEmail(email);
    
    const [user] = await db
      .select({
        id: usersTable.id,
        fullName: usersTable.fullName,
        email: usersTable.email,
        emailVerified: usersTable.emailVerified,
        passwordHash: usersTable.passwordHash,
        profileImageUrl: usersTable.profileImageUrl,
      })
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .limit(1);

    if (!user?.passwordHash) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password.",
      });
    }

    if (!user.emailVerified) {
      const emailVerificationSent = await this.sendVerificationMailForUser({
        userId: user.id,
        fullName: user.fullName,
        email: user.email,
      });

      throw new TRPCError({
        code: "FORBIDDEN",
        message: emailVerificationSent
          ? "Please verify your email before signing in. We sent you a fresh verification link."
          : "Please verify your email before signing in. We could not send a fresh link right now.",
      });
    }

    const sessionToken = createSecureToken();
    const sessionExpiresAt = addDays(new Date(), USER_SESSION_DAYS);

    await db.insert(userSessionsTable).values({
      userId: user.id,
      sessionTokenHash: hashToken(sessionToken),
      expiresAt: sessionExpiresAt,
    });

    return {
      sessionToken,
      sessionExpiresAt,
      user: this.toAuthenticatedUser(user),
      message: "Signed in successfully.",
    };
  }

  public async getAuthenticatedUserBySessionToken(
    sessionToken: string | undefined,
  ): Promise<AuthenticatedUserSchema | null> {
    if (!sessionToken) return null;

    const [user] = await db
      .select({
        id: usersTable.id,
        fullName: usersTable.fullName,
        email: usersTable.email,
        emailVerified: usersTable.emailVerified,
        profileImageUrl: usersTable.profileImageUrl,
      })
      .from(userSessionsTable)
      .innerJoin(usersTable, eq(userSessionsTable.userId, usersTable.id))
      .where(
        and(
          eq(userSessionsTable.sessionTokenHash, hashToken(sessionToken)),
          isNull(userSessionsTable.revokedAt),
          gt(userSessionsTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return user ? this.toAuthenticatedUser(user) : null;
  }

  async updateCurrentUser(userId: string, fullName: string): Promise<AuthenticatedUserSchema> {
    const [user] = await db
      .update(usersTable)
      .set({ fullName: fullName.trim(), updatedAt: new Date() })
      .where(eq(usersTable.id, userId))
      .returning({
        id: usersTable.id,
        fullName: usersTable.fullName,
        email: usersTable.email,
        emailVerified: usersTable.emailVerified,
        profileImageUrl: usersTable.profileImageUrl,
      });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
    }

    return this.toAuthenticatedUser(user);
  }

  public async signOutBySessionToken(sessionToken: string | undefined) {
    if (!sessionToken) return;

    await db
      .update(userSessionsTable)
      .set({ revokedAt: new Date() })
      .where(eq(userSessionsTable.sessionTokenHash, hashToken(sessionToken)));
  }

  public async signOutAllSessionsForUser(userId: string) {
    await db
      .update(userSessionsTable)
      .set({ revokedAt: new Date() })
      .where(eq(userSessionsTable.userId, userId));
  }

  public async verifyEmailAddress(token: string): Promise<{ message: string }> {
    const tokenRecord = await this.getActiveAuthToken({ token, type: "EMAIL_VERIFICATION" });
    await db
      .update(usersTable)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(usersTable.id, tokenRecord.userId));
    await this.consumeAuthTokensForUser({ userId: tokenRecord.userId, type: "EMAIL_VERIFICATION" });
    return { message: "Email verified successfully. You can now sign in." };
  }

  public async resendEmailVerification(email: string): Promise<{ message: string }> {
    const [user] = await db
      .select({
        id: usersTable.id,
        fullName: usersTable.fullName,
        email: usersTable.email,
        emailVerified: usersTable.emailVerified,
      })
      .from(usersTable)
      .where(eq(usersTable.email, normalizeEmail(email)))
      .limit(1);

    if (!user) {
      return {
        message: "If this account exists and is unverified, a verification email has been sent.",
      };
    }

    if (user.emailVerified) {
      return { message: "This email address is already verified. You can sign in." };
    }

    const emailVerificationSent = await this.sendVerificationMailForUser({
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
    });

    return {
      message: emailVerificationSent
        ? "A new verification email has been sent."
        : "We could not send a verification email right now. Please try again.",
    };
  }

  public async requestPasswordReset(email: string): Promise<{ message: string }> {
    const [user] = await db
      .select({
        id: usersTable.id,
        fullName: usersTable.fullName,
        email: usersTable.email,
      })
      .from(usersTable)
      .where(eq(usersTable.email, normalizeEmail(email)))
      .limit(1);

    if (user) {
      const resetToken = await this.createAuthTokenForUser({
        userId: user.id,
        type: "PASSWORD_RESET",
        expiresAt: addMinutes(new Date(), PASSWORD_RESET_TOKEN_MINUTES),
      });

      try {
        await mailService.sendPasswordResetMail({
          to: user.email,
          fullName: user.fullName,
          resetUrl: buildWebUrl("/reset-password", resetToken),
        });
      } catch (error) {
        logger.error("Unable to send password reset email", { error, userId: user.id });
      }
    }

    return {
      message: "If an account exists for this email, a password reset link has been sent.",
    };
  }

  public async resetPasswordWithToken({
    token,
    newPassword,
  }: {
    token: string;
    newPassword: string;
  }): Promise<{ message: string }> {
    const tokenRecord = await this.getActiveAuthToken({ token, type: "PASSWORD_RESET" });
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    const now = new Date();

    await db
      .update(usersTable)
      .set({ passwordHash, updatedAt: now })
      .where(eq(usersTable.id, tokenRecord.userId));

    await db
      .update(userSessionsTable)
      .set({ revokedAt: now })
      .where(eq(userSessionsTable.userId, tokenRecord.userId));
    await this.consumeAuthTokensForUser({ userId: tokenRecord.userId, type: "PASSWORD_RESET" });

    return { message: "Password reset successfully. Please sign in again." };
  }

  public async updateUserProfileImage({
    userId,
    profileImageUrl,
    profileImageFileId,
  }: {
    userId: string;
    profileImageUrl: string;
    profileImageFileId?: string;
  }): Promise<AuthenticatedUserSchema> {
    const [user] = await db
      .update(usersTable)
      .set({ profileImageUrl, profileImageFileId, updatedAt: new Date() })
      .where(eq(usersTable.id, userId))
      .returning({
        id: usersTable.id,
        fullName: usersTable.fullName,
        email: usersTable.email,
        emailVerified: usersTable.emailVerified,
        profileImageUrl: usersTable.profileImageUrl,
      });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
    }

    return this.toAuthenticatedUser(user);
  }

  private async sendVerificationMailForUser({
    userId,
    fullName,
    email,
  }: {
    userId: string;
    fullName: string;
    email: string;
  }) {
    const verificationToken = await this.createAuthTokenForUser({
      userId,
      type: "EMAIL_VERIFICATION",
      expiresAt: addHours(new Date(), EMAIL_VERIFICATION_TOKEN_HOURS),
    });

    try {
      await mailService.sendEmailVerificationMail({
        to: email,
        fullName,
        verificationUrl: buildWebUrl("/verify-email", verificationToken),
      });
      return true;
    } catch (error) {
      logger.error("Unable to send email verification email", { error, userId });
      return false;
    }
  }

  private async createAuthTokenForUser({
    userId,
    type,
    expiresAt,
  }: {
    userId: string;
    type: AuthTokenType;
    expiresAt: Date;
  }) {
    const token = createSecureToken();

    await db.insert(authTokensTable).values({
      userId,
      type,
      tokenHash: hashToken(token),
      expiresAt,
    });

    return token;
  }

  private async getActiveAuthToken({ token, type }: { token: string; type: AuthTokenType }) {
    const [tokenRecord] = await db
      .select({
        id: authTokensTable.id,
        userId: authTokensTable.userId,
      })
      .from(authTokensTable)
      .where(
        and(
          eq(authTokensTable.tokenHash, hashToken(token)),
          eq(authTokensTable.type, type),
          isNull(authTokensTable.consumedAt),
          gt(authTokensTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!tokenRecord) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This link is invalid or has expired.",
      });
    }

    return tokenRecord;
  }

  private async consumeAuthTokensForUser({
    userId,
    type,
  }: {
    userId: string;
    type: AuthTokenType;
  }) {
    await db
      .update(authTokensTable)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(authTokensTable.userId, userId),
          eq(authTokensTable.type, type),
          isNull(authTokensTable.consumedAt),
        ),
      );
  }

  private toAuthenticatedUser(user: AuthenticatedUserSchema) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      emailVerified: user.emailVerified,
      profileImageUrl: user.profileImageUrl,
    };
  }
}

export default UserService;