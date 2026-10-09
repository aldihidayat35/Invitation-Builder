ALTER TABLE "invitations" ADD COLUMN "client_access_token" text;--> statement-breakpoint
ALTER TABLE "customer_orders" ADD COLUMN "client_access_token" text;--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_client_access_token_uq" ON "invitations" ("client_access_token") WHERE "client_access_token" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_orders_client_access_token_uq" ON "customer_orders" ("client_access_token") WHERE "client_access_token" is not null;
