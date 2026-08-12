CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY,
	"domain" text NOT NULL,
	"action" text NOT NULL,
	"outcome" text DEFAULT 'success' NOT NULL,
	"actor_id" text,
	"target_type" text,
	"target_id" text,
	"old_value" jsonb,
	"new_value" jsonb,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" ("created_at");--> statement-breakpoint
CREATE INDEX "audit_log_actor_id_idx" ON "audit_log" ("actor_id");--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL;