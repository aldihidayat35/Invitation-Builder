CREATE TABLE IF NOT EXISTS "message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text DEFAULT 'wedding' NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_templates_cat_idx" ON "message_templates" USING btree ("category","sort_order");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_templates_default_idx" ON "message_templates" USING btree ("category","is_default");
