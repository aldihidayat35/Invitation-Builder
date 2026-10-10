ALTER TABLE "reseller_profiles" ADD COLUMN IF NOT EXISTS "hero_image_url" text;
--> statement-breakpoint
ALTER TABLE "reseller_profiles" ADD COLUMN IF NOT EXISTS "hero_title" text;
--> statement-breakpoint
ALTER TABLE "reseller_profiles" ADD COLUMN IF NOT EXISTS "hero_subtitle" text;
--> statement-breakpoint
ALTER TABLE "reseller_profiles" ADD COLUMN IF NOT EXISTS "hero_badge" text;
