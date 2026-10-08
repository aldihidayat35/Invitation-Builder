ALTER TABLE "customer_orders" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_orders_idempotency_uq" ON "customer_orders" USING btree ("idempotency_key") WHERE "idempotency_key" IS NOT NULL;
