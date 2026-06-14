import {
  index,
  pgTable,
  pgEnum,
  uuid,
  varchar,
  timestamp,
  boolean,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const authenticationProviderEnum = pgEnum("authentication_provider", [
  "EMAIL_PASSWORD",
  "GOOGLE_OAUTH",
]);

export const authTokenTypeEnum = pgEnum("auth_token_type", [
  "EMAIL_VERIFICATION",
  "PASSWORD_RESET",
]);

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),

  fullName: varchar("full_name", { length: 120 }).notNull(),

  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),

  passwordHash: text("password_hash"),

  profileImageUrl: text("profile_image_url"),
  profileImageFileId: text("profile_image_file_id"),
  authenticationProvider: authenticationProviderEnum(
    "authentication_provider",
  )
    .default("EMAIL_PASSWORD")
    .notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const authTokensTable = pgTable(
  "auth_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    type: authTokenTypeEnum("type").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    consumedAt: timestamp("consumed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("auth_tokens_token_hash_unique").on(table.tokenHash),
    index("auth_tokens_user_id_idx").on(table.userId),
    index("auth_tokens_type_idx").on(table.type),
  ],
);

export const userSessionsTable = pgTable(
  "user_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    sessionTokenHash: text("session_token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_sessions_session_token_hash_unique").on(
      table.sessionTokenHash,
    ),
    index("user_sessions_user_id_idx").on(table.userId),
  ],
);

export type SelectUser = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
export type SelectAuthToken = typeof authTokensTable.$inferSelect;
export type InsertAuthToken = typeof authTokensTable.$inferInsert;
export type SelectUserSession = typeof userSessionsTable.$inferSelect;
export type InsertUserSession = typeof userSessionsTable.$inferInsert;
