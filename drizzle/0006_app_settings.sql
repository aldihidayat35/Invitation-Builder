CREATE TABLE IF NOT EXISTS "app_settings" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"app_name" text DEFAULT 'Undangan.id' NOT NULL,
	"app_tagline" text DEFAULT 'Undangan Digital, Lebih Berkesan' NOT NULL,
	"app_logo" text,
	"company_name" text DEFAULT 'Undangan.id' NOT NULL,
	"contact_phone" text DEFAULT '+62 812-3456-7890' NOT NULL,
	"contact_whatsapp" text DEFAULT '6281234567890' NOT NULL,
	"contact_email" text DEFAULT 'support@undangan.id' NOT NULL,
	"address" text DEFAULT 'Jl. Jenderal Sudirman No. 45, Jakarta Selatan, DKI Jakarta 12190' NOT NULL,
	"footer_description" text DEFAULT 'Platform pembuatan website undangan digital yang elegan, praktis, dan penuh makna untuk berbagai momen spesial di Indonesia.' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "app_settings" ("id", "app_name", "app_tagline", "company_name", "contact_phone", "contact_whatsapp", "contact_email", "address", "footer_description")
VALUES (
	'global',
	'Undangan.id',
	'Undangan Digital, Lebih Berkesan',
	'Undangan.id',
	'+62 812-3456-7890',
	'6281234567890',
	'support@undangan.id',
	'Jl. Jenderal Sudirman No. 45, Jakarta Selatan, DKI Jakarta 12190',
	'Platform pembuatan website undangan digital yang elegan, praktis, dan penuh makna untuk berbagai momen spesial di Indonesia.'
)
ON CONFLICT ("id") DO NOTHING;
