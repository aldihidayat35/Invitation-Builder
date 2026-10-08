ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "slug" text;
--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "description" text;
--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'wedding' NOT NULL;
--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "style" text DEFAULT 'modern_minimalist' NOT NULL;
--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "thumbnail_url" text;
--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "preview_mockup_url" text;
--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "tier" text DEFAULT 'standard' NOT NULL;
--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "price" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "is_featured" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "view_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "use_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "templates" ADD CONSTRAINT "templates_slug_unique" UNIQUE ("slug");
EXCEPTION
  WHEN duplicate_table OR duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "templates" ADD CONSTRAINT "templates_price_non_negative" CHECK ("price" >= 0);
EXCEPTION
  WHEN duplicate_table OR duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "templates_catalog_filter_idx" ON "templates" ("is_public", "category", "style", "tier");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "templates_catalog_sort_idx" ON "templates" ("is_public", "is_featured", "use_count");
