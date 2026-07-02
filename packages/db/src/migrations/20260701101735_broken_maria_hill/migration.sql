CREATE TABLE "idempotency_keys" (
	"key" text PRIMARY KEY,
	"author_id" text NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
