ALTER TABLE "reseller_profiles" ADD COLUMN "domain_status" text NOT NULL DEFAULT 'unconfigured';
--> statement-breakpoint
ALTER TABLE "reseller_profiles" ADD COLUMN "domain_verification_token" text;
--> statement-breakpoint
ALTER TABLE "reseller_profiles" ADD COLUMN "domain_verified_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "reseller_profiles" ADD COLUMN "domain_last_checked_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "reseller_profiles" ADD COLUMN "tls_status" text NOT NULL DEFAULT 'unconfigured';
--> statement-breakpoint
ALTER TABLE "reseller_profiles" ADD COLUMN "tls_activated_at" timestamp with time zone;
--> statement-breakpoint
CREATE UNIQUE INDEX "reseller_profiles_custom_domain_lower_uq" ON "reseller_profiles" (lower("custom_domain")) WHERE "custom_domain" is not null;
--> statement-breakpoint
ALTER TABLE "reseller_profiles" ADD CONSTRAINT "reseller_profiles_domain_status_check" CHECK ("domain_status" in ('unconfigured', 'pending', 'verified', 'active', 'failed'));
--> statement-breakpoint
ALTER TABLE "reseller_profiles" ADD CONSTRAINT "reseller_profiles_tls_status_check" CHECK ("tls_status" in ('unconfigured', 'pending', 'active', 'failed'));
--> statement-breakpoint
UPDATE "reseller_profiles" SET "domain_status" = 'pending', "tls_status" = 'pending' WHERE "custom_domain" is not null;
--> statement-breakpoint
CREATE TABLE "security_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_type" text NOT NULL,
  "severity" text NOT NULL DEFAULT 'warning',
  "subject_hash" text,
  "client_hash" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "security_events_severity_check" CHECK ("severity" in ('info', 'warning', 'critical'))
);
--> statement-breakpoint
CREATE INDEX "security_events_type_created_idx" ON "security_events" ("event_type", "created_at");
--> statement-breakpoint
CREATE INDEX "security_events_subject_created_idx" ON "security_events" ("subject_hash", "created_at");
--> statement-breakpoint
CREATE TABLE "privacy_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "requester_id" uuid NOT NULL REFERENCES "users"("id"),
  "target_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "request_type" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "reason" text,
  "resolution_note" text,
  "resolved_by" uuid REFERENCES "users"("id"),
  "resolved_at" timestamp with time zone,
  "retention_due_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "privacy_requests_type_check" CHECK ("request_type" in ('export', 'delete')),
  CONSTRAINT "privacy_requests_status_check" CHECK ("status" in ('pending', 'in_progress', 'completed', 'rejected'))
);
--> statement-breakpoint
CREATE INDEX "privacy_requests_status_created_idx" ON "privacy_requests" ("status", "created_at");
--> statement-breakpoint
CREATE INDEX "privacy_requests_target_idx" ON "privacy_requests" ("target_user_id", "created_at");
--> statement-breakpoint
CREATE TABLE "recovery_drills" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "drill_type" text NOT NULL DEFAULT 'restore',
  "status" text NOT NULL DEFAULT 'planned',
  "performed_by" uuid NOT NULL REFERENCES "users"("id"),
  "environment" text NOT NULL,
  "backup_reference" text,
  "measured_rpo_minutes" integer,
  "measured_rto_minutes" integer,
  "notes" text,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "recovery_drills_status_check" CHECK ("status" in ('planned', 'running', 'passed', 'failed')),
  CONSTRAINT "recovery_drills_type_check" CHECK ("drill_type" in ('backup', 'restore', 'failover'))
);
--> statement-breakpoint
CREATE INDEX "recovery_drills_status_created_idx" ON "recovery_drills" ("status", "created_at");
--> statement-breakpoint
CREATE TRIGGER "security_events_immutable" BEFORE UPDATE OR DELETE ON "security_events" FOR EACH ROW EXECUTE FUNCTION "forbid_mutation"();
