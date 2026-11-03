CREATE TABLE "nexora_link_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nexora_org_plans" (
	"org_id" text PRIMARY KEY NOT NULL,
	"plan" "plan" NOT NULL,
	"as_of" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "installer_github_id" bigint;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "nexora_org_id" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "nexora_org_name" text;--> statement-breakpoint
ALTER TABLE "nexora_link_requests" ADD CONSTRAINT "nexora_link_requests_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nexora_link_requests" ADD CONSTRAINT "nexora_link_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nexora_link_requests_expires_idx" ON "nexora_link_requests" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "accounts_nexora_org_idx" ON "accounts" USING btree ("nexora_org_id");