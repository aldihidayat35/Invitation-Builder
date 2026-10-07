CREATE TYPE "public"."credit_transaction_type" AS ENUM('owner_grant', 'purchase_topup', 'publish_deduct', 'unpublish_refund', 'manual_adjustment');--> statement-breakpoint
CREATE TYPE "public"."system_role" AS ENUM('owner', 'reseller', 'client');--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reseller_id" uuid NOT NULL,
	"type" "credit_transaction_type" NOT NULL,
	"amount" integer NOT NULL,
	"balance_before" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reference_id" text,
	"notes" text,
	"performed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_transactions_balances_valid" CHECK ("credit_transactions"."balance_before" + "credit_transactions"."amount" = "credit_transactions"."balance_after")
);
--> statement-breakpoint
CREATE TABLE "reseller_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"agency_name" text NOT NULL,
	"slug" text NOT NULL,
	"whatsapp_contact" text NOT NULL,
	"logo_url" text,
	"credit_quota" integer DEFAULT 0 NOT NULL,
	"custom_domain" text,
	"brand_color" text DEFAULT '#3b82f6' NOT NULL,
	"hide_watermark" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reseller_profiles_slug_format" CHECK ("reseller_profiles"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "reseller_profiles_credit_quota_non_negative" CHECK ("reseller_profiles"."credit_quota" >= 0)
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "system_role" "system_role" DEFAULT 'client' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reseller_id" uuid;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_reseller_id_reseller_profiles_id_fk" FOREIGN KEY ("reseller_id") REFERENCES "public"."reseller_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_profiles" ADD CONSTRAINT "reseller_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_transactions_reseller_idx" ON "credit_transactions" USING btree ("reseller_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reseller_profiles_user_uq" ON "reseller_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reseller_profiles_slug_uq" ON "reseller_profiles" USING btree ("slug");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_reseller_id_users_id_fk" FOREIGN KEY ("reseller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_reseller_idx" ON "users" USING btree ("reseller_id");--> statement-breakpoint
CREATE INDEX "users_system_role_idx" ON "users" USING btree ("system_role");