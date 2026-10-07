DROP TABLE IF EXISTS "topup_requests" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "bank_accounts" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "credit_transactions" CASCADE;--> statement-breakpoint
ALTER TABLE "reseller_profiles" DROP CONSTRAINT IF EXISTS "reseller_profiles_credit_quota_non_negative";--> statement-breakpoint
ALTER TABLE "reseller_profiles" DROP COLUMN IF EXISTS "credit_quota";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."credit_transaction_type";--> statement-breakpoint
CREATE TYPE "public"."customer_order_status" AS ENUM('new', 'in_review', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "customer_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL,
	"client_user_id" uuid,
	"invitation_id" uuid,
	"template_id" uuid,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_whatsapp" text NOT NULL,
	"groom_bride_names" text,
	"event_date" timestamp with time zone,
	"event_location" text,
	"notes" text,
	"status" "customer_order_status" DEFAULT 'new' NOT NULL,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_seller_id_reseller_profiles_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."reseller_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_client_user_id_users_id_fk" FOREIGN KEY ("client_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_orders_seller_idx" ON "customer_orders" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE INDEX "customer_orders_status_idx" ON "customer_orders" USING btree ("status","created_at");
