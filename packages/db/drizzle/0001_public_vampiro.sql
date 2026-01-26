CREATE TABLE "ReportTemplate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"reportType" varchar(100) NOT NULL,
	"category" varchar(100) NOT NULL,
	"defaultConfiguration" jsonb NOT NULL,
	"isSystemTemplate" varchar(10) DEFAULT 'false' NOT NULL,
	"isActive" varchar(10) DEFAULT 'true' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ReportTemplate" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "SystemReport" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"reportType" varchar(100) NOT NULL,
	"organizationId" uuid NOT NULL,
	"createdBy" uuid NOT NULL,
	"configuration" jsonb NOT NULL,
	"reportData" jsonb,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"generatedAt" timestamp,
	"scheduledFor" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "SystemReport" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "SystemReport" ADD CONSTRAINT "SystemReport_organizationId_Organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SystemReport" ADD CONSTRAINT "SystemReport_createdBy_User_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reportTemplate_reportType_idx" ON "ReportTemplate" USING btree ("reportType");--> statement-breakpoint
CREATE INDEX "reportTemplate_category_idx" ON "ReportTemplate" USING btree ("category");--> statement-breakpoint
CREATE INDEX "reportTemplate_isActive_idx" ON "ReportTemplate" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "systemReport_organizationId_idx" ON "SystemReport" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "systemReport_createdBy_idx" ON "SystemReport" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX "systemReport_reportType_idx" ON "SystemReport" USING btree ("reportType");--> statement-breakpoint
CREATE INDEX "systemReport_status_idx" ON "SystemReport" USING btree ("status");--> statement-breakpoint
CREATE INDEX "systemReport_generatedAt_idx" ON "SystemReport" USING btree ("generatedAt");