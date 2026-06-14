CREATE TYPE "public"."authentication_provider" AS ENUM('EMAIL_PASSWORD', 'GOOGLE_OAUTH');
--> statement-breakpoint
CREATE TYPE "public"."auth_token_type" AS ENUM('EMAIL_VERIFICATION', 'PASSWORD_RESET');
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "full_name" SET DATA TYPE varchar(120);
--> statement-breakpoint
UPDATE "users" SET "email_verified" = false WHERE "email_verified" IS NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email_verified" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_image_file_id" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "authentication_provider" "authentication_provider" DEFAULT 'EMAIL_PASSWORD' NOT NULL;
--> statement-breakpoint
UPDATE "users" SET "created_at" = now() WHERE "created_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET NOT NULL;
--> statement-breakpoint
UPDATE "users" SET "updated_at" = COALESCE("created_at", now()) WHERE "updated_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET NOT NULL;
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"type" "auth_token_type" NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "auth_tokens_token_hash_unique" ON "auth_tokens" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "auth_tokens_user_id_idx" ON "auth_tokens" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "auth_tokens_type_idx" ON "auth_tokens" USING btree ("type");
--> statement-breakpoint
CREATE UNIQUE INDEX "user_sessions_session_token_hash_unique" ON "user_sessions" USING btree ("session_token_hash");
--> statement-breakpoint
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions" USING btree ("user_id");
