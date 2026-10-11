CREATE TABLE IF NOT EXISTS "global_variable_presets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"category" text DEFAULT 'kustom' NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"default_value" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"max_length" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "global_variable_presets_key_uq" ON "global_variable_presets" USING btree ("key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "global_variable_presets_cat_idx" ON "global_variable_presets" USING btree ("category");
