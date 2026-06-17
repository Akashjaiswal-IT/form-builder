CREATE TYPE "public"."auth_token_type" AS ENUM('EMAIL_VERIFICATION', 'PASSWORD_RESET');--> statement-breakpoint
CREATE TYPE "public"."authentication_provider" AS ENUM('EMAIL_PASSWORD', 'GOOGLE_OAUTH');--> statement-breakpoint
CREATE TYPE "public"."field_type" AS ENUM('TEXT', 'TEXTAREA', 'NUMBER', 'EMAIL', 'PHONE', 'URL', 'DATE', 'TIME', 'DATETIME', 'SELECT', 'MULTI_SELECT', 'RADIO', 'CHECKBOX_GROUP', 'CHECKBOX', 'FILE', 'SIGNATURE', 'RATING', 'SCALE', 'HEADING', 'PARAGRAPH', 'DIVIDER', 'HIDDEN');--> statement-breakpoint
CREATE TYPE "public"."form_status" AS ENUM('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."response_status" AS ENUM('IN_PROGRESS', 'COMPLETED', 'ABANDONED');--> statement-breakpoint
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
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(120) NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"password_hash" text,
	"profile_image_url" text,
	"profile_image_file_id" text,
	"authentication_provider" "authentication_provider" DEFAULT 'EMAIL_PASSWORD' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "form_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"starts" integer DEFAULT 0 NOT NULL,
	"completions" integer DEFAULT 0 NOT NULL,
	"avg_completion_time_seconds" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"page_id" uuid NOT NULL,
	"type" "field_type" NOT NULL,
	"label" varchar(500) NOT NULL,
	"name" varchar(100) NOT NULL,
	"placeholder" varchar(255),
	"description" text,
	"required" boolean DEFAULT false NOT NULL,
	"validation" jsonb,
	"options" jsonb,
	"conditional_logic" jsonb,
	"position" integer DEFAULT 0 NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"title" varchar(255),
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"conditional_logic" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"user_id" uuid,
	"status" "response_status" DEFAULT 'IN_PROGRESS' NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"metadata" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100) NOT NULL,
	"thumbnail_url" text,
	"form_schema" jsonb NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"secret" varchar(255),
	"events" jsonb DEFAULT '["RESPONSE_SUBMITTED"]'::jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"headers" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"slug" varchar(255) NOT NULL,
	"status" "form_status" DEFAULT 'DRAFT' NOT NULL,
	"settings" jsonb DEFAULT '{"allowMultipleSubmissions":false,"showProgressBar":true,"shuffleFields":false,"submitButtonText":"Submit","successMessage":"Thank you for your submission!","redirectUrl":null,"closedMessage":"This form is no longer accepting responses.","requireLogin":false,"limitResponses":null,"startDate":null,"endDate":null}'::jsonb,
	"theme" jsonb DEFAULT '{"primaryColor":"#3b82f6","backgroundColor":"#ffffff","fontFamily":"Inter","borderRadius":"md"}'::jsonb,
	"published_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "response_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"response_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_id" uuid NOT NULL,
	"response_id" uuid,
	"event" varchar(50) NOT NULL,
	"status_code" integer,
	"request_body" jsonb,
	"response_body" text,
	"duration_ms" integer,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_analytics" ADD CONSTRAINT "form_analytics_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_page_id_form_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."form_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_pages" ADD CONSTRAINT "form_pages_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_webhooks" ADD CONSTRAINT "form_webhooks_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_data" ADD CONSTRAINT "response_data_response_id_form_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."form_responses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_data" ADD CONSTRAINT "response_data_field_id_form_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."form_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_webhook_id_form_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."form_webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_response_id_form_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."form_responses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_tokens_token_hash_unique" ON "auth_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_tokens_user_id_idx" ON "auth_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_tokens_type_idx" ON "auth_tokens" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "user_sessions_session_token_hash_unique" ON "user_sessions" USING btree ("session_token_hash");--> statement-breakpoint
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "form_analytics_form_date_unique" ON "form_analytics" USING btree ("form_id","date");--> statement-breakpoint
CREATE INDEX "form_analytics_form_id_idx" ON "form_analytics" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "form_analytics_date_idx" ON "form_analytics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "form_fields_form_id_idx" ON "form_fields" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "form_fields_page_id_idx" ON "form_fields" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "form_fields_position_idx" ON "form_fields" USING btree ("page_id","position");--> statement-breakpoint
CREATE INDEX "form_pages_form_id_idx" ON "form_pages" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "form_pages_position_idx" ON "form_pages" USING btree ("form_id","position");--> statement-breakpoint
CREATE INDEX "form_responses_form_id_idx" ON "form_responses" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "form_responses_user_id_idx" ON "form_responses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "form_responses_status_idx" ON "form_responses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "form_responses_completed_at_idx" ON "form_responses" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "form_templates_category_idx" ON "form_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "form_templates_is_public_idx" ON "form_templates" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "form_webhooks_form_id_idx" ON "form_webhooks" USING btree ("form_id");--> statement-breakpoint
CREATE UNIQUE INDEX "forms_slug_unique" ON "forms" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "forms_user_id_idx" ON "forms" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "forms_status_idx" ON "forms" USING btree ("status");--> statement-breakpoint
CREATE INDEX "response_data_response_id_idx" ON "response_data" USING btree ("response_id");--> statement-breakpoint
CREATE INDEX "response_data_field_id_idx" ON "response_data" USING btree ("field_id");--> statement-breakpoint
CREATE UNIQUE INDEX "response_data_response_field_unique" ON "response_data" USING btree ("response_id","field_id");--> statement-breakpoint
CREATE INDEX "webhook_logs_webhook_id_idx" ON "webhook_logs" USING btree ("webhook_id");--> statement-breakpoint
CREATE INDEX "webhook_logs_response_id_idx" ON "webhook_logs" USING btree ("response_id");--> statement-breakpoint
CREATE INDEX "webhook_logs_created_at_idx" ON "webhook_logs" USING btree ("created_at");