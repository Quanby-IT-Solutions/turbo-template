-- AB-3 / F-13: idempotency keys become identity-scoped and expiring.
--
-- The table is a replay cache, not a record, so it is emptied rather than
-- migrated. Two reasons, both from the ticket's own guidance:
--   1. `expires_at` is NOT NULL with no sensible default for rows written
--      before expiry existed — inventing one would either resurrect stale
--      replay targets or expire them at an arbitrary moment.
--   2. The primary key changes from (key) to (author_id, key). Existing rows
--      were written under the global keyspace this change exists to remove.
--
-- The cost of truncating is that an in-flight client retry within the old
-- window re-executes instead of replaying. That is the safe direction for a
-- cache, and the alternative is a migration that fails outright on any
-- non-empty table.
TRUNCATE TABLE "idempotency_keys";--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD COLUMN "expires_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "idempotency_keys" DROP CONSTRAINT "idempotency_keys_pkey";--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD PRIMARY KEY ("author_id","key");--> statement-breakpoint
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys" ("expires_at");
