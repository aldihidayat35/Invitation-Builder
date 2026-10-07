CREATE TABLE "bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_name" text NOT NULL,
	"account_number" text NOT NULL,
	"account_holder" text NOT NULL,
	"qr_code_url" text,
	"instructions" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topup_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reseller_id" uuid NOT NULL,
	"credit_amount" integer NOT NULL,
	"amount_paid" integer NOT NULL,
	"bank_account_id" uuid,
	"sender_bank" text NOT NULL,
	"sender_account_name" text NOT NULL,
	"proof_file_url" text NOT NULL,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topup_requests_credit_amount_positive" CHECK ("topup_requests"."credit_amount" > 0),
	CONSTRAINT "topup_requests_amount_paid_positive" CHECK ("topup_requests"."amount_paid" > 0),
	CONSTRAINT "topup_requests_status_valid" CHECK ("topup_requests"."status" in ('pending', 'approved', 'rejected', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "topup_requests" ADD CONSTRAINT "topup_requests_reseller_id_reseller_profiles_id_fk" FOREIGN KEY ("reseller_id") REFERENCES "public"."reseller_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topup_requests" ADD CONSTRAINT "topup_requests_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topup_requests" ADD CONSTRAINT "topup_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "topup_requests_reseller_idx" ON "topup_requests" USING btree ("reseller_id","created_at");--> statement-breakpoint
CREATE INDEX "topup_requests_status_idx" ON "topup_requests" USING btree ("status","created_at");
