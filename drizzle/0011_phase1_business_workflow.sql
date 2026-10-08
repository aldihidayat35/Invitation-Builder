CREATE TYPE "business_order_status" AS ENUM ('new', 'qualified', 'accepted', 'rejected', 'cancelled', 'completed');
--> statement-breakpoint
CREATE TYPE "production_status" AS ENUM ('awaiting_client', 'in_production', 'client_review', 'revision_requested', 'approved', 'published');
--> statement-breakpoint
CREATE TYPE "payment_status" AS ENUM ('unpaid', 'partial', 'paid', 'refunded');
--> statement-breakpoint
ALTER TABLE "customer_orders" ADD COLUMN "order_status" "business_order_status" NOT NULL DEFAULT 'new';
--> statement-breakpoint
ALTER TABLE "customer_orders" ADD COLUMN "production_status" "production_status" NOT NULL DEFAULT 'awaiting_client';
--> statement-breakpoint
ALTER TABLE "customer_orders" ADD COLUMN "payment_status" "payment_status" NOT NULL DEFAULT 'unpaid';
--> statement-breakpoint
ALTER TABLE "customer_orders" ADD COLUMN "workspace_id" uuid REFERENCES "workspaces"("id");
--> statement-breakpoint
ALTER TABLE "customer_orders" ADD COLUMN "template_version_id" uuid REFERENCES "template_versions"("id");
--> statement-breakpoint
ALTER TABLE "customer_orders" ADD COLUMN "assigned_to" uuid REFERENCES "users"("id");
--> statement-breakpoint
ALTER TABLE "customer_orders" ADD COLUMN "due_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "customer_orders" ADD COLUMN "accepted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "customer_orders" ADD COLUMN "completed_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "customer_orders"
SET "order_status" = CASE
  WHEN "status" = 'in_review' THEN 'qualified'::"business_order_status"
  WHEN "status" = 'in_progress' THEN 'accepted'::"business_order_status"
  WHEN "status" = 'completed' THEN 'completed'::"business_order_status"
  WHEN "status" = 'cancelled' THEN 'cancelled'::"business_order_status"
  ELSE 'new'::"business_order_status"
END;
--> statement-breakpoint
UPDATE "customer_orders"
SET "production_status" = CASE
  WHEN "status" = 'in_progress' THEN 'in_production'::"production_status"
  WHEN "status" = 'completed' THEN 'published'::"production_status"
  ELSE 'awaiting_client'::"production_status"
END;
--> statement-breakpoint
CREATE INDEX "customer_orders_business_status_idx" ON "customer_orders" ("order_status", "created_at");
--> statement-breakpoint
CREATE INDEX "customer_orders_production_status_idx" ON "customer_orders" ("production_status", "due_at");
--> statement-breakpoint
CREATE INDEX "customer_orders_workspace_idx" ON "customer_orders" ("workspace_id");
--> statement-breakpoint
CREATE INDEX "customer_orders_assignee_idx" ON "customer_orders" ("assigned_to", "production_status");
--> statement-breakpoint
CREATE TABLE "order_workflow_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "customer_orders"("id"),
  "actor_id" uuid REFERENCES "users"("id"),
  "event_type" text NOT NULL,
  "from_value" text,
  "to_value" text,
  "note" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "order_workflow_events_order_idx" ON "order_workflow_events" ("order_id", "created_at");
--> statement-breakpoint
CREATE TRIGGER "order_workflow_events_immutable" BEFORE UPDATE OR DELETE ON "order_workflow_events"
  FOR EACH ROW EXECUTE FUNCTION "forbid_mutation"();
