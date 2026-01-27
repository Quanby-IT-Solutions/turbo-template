CREATE TYPE "public"."AccessLevel" AS ENUM('READ_ONLY', 'READ_WITH_NOTES', 'READ_WITH_HISTORY', 'FULL_ACCESS');--> statement-breakpoint
CREATE TYPE "public"."AppointmentStatus" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'REJECTED', 'RESCHEDULED');--> statement-breakpoint
CREATE TYPE "public"."AuditCategory" AS ENUM('AUTHENTICATION', 'AUTHORIZATION', 'DATA_ACCESS', 'DATA_MODIFICATION', 'SECURITY', 'SYSTEM', 'USER_ACTIVITY');--> statement-breakpoint
CREATE TYPE "public"."AuditLevel" AS ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."DiagnosisSeverity" AS ENUM('MILD', 'MODERATE', 'SEVERE', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."DiagnosisStatus" AS ENUM('ACTIVE', 'RESOLVED', 'CHRONIC', 'SUSPECTED', 'RULED_OUT');--> statement-breakpoint
CREATE TYPE "public"."DoctorApprovalStatus" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."LabRequestStatus" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED', 'ON_HOLD');--> statement-breakpoint
CREATE TYPE "public"."MedicalLicenseLevel" AS ENUM('S1', 'S2', 'S3');--> statement-breakpoint
CREATE TYPE "public"."MedicalRecordType" AS ENUM('CONSULTATION_NOTES', 'DIAGNOSIS', 'TREATMENT_PLAN', 'MEDICATION', 'LAB_RESULTS', 'IMAGING_RESULTS', 'ALLERGIES', 'CHRONIC_CONDITIONS', 'SURGICAL_HISTORY', 'FAMILY_HISTORY', 'LIFESTYLE', 'VACCINATIONS');--> statement-breakpoint
CREATE TYPE "public"."NotificationPriority" AS ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."NotificationType" AS ENUM('APPOINTMENT_CREATED', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELLED', 'APPOINTMENT_REJECTED', 'APPOINTMENT_RESCHEDULED', 'APPOINTMENT_REMINDER', 'CONSULTATION_STARTED', 'CONSULTATION_ENDED', 'PRESCRIPTION_ISSUED', 'PRESCRIPTION_EXPIRING', 'DIAGNOSIS_ADDED', 'LAB_REQUEST_CREATED', 'LAB_RESULTS_AVAILABLE', 'MEDICAL_RECORD_SHARED', 'HEALTH_SCAN_COMPLETED', 'HEALTH_SCAN_SHARED', 'RESCHEDULE_REQUEST', 'RESCHEDULE_APPROVED', 'RESCHEDULE_REJECTED', 'SYSTEM_ANNOUNCEMENT', 'SECURITY_ALERT', 'PROFILE_UPDATE', 'DOCUMENT_VERIFIED', 'DOCUMENT_REJECTED', 'GENERAL');--> statement-breakpoint
CREATE TYPE "public"."OrganizationApprovalStatus" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."PatientVerificationStatus" AS ENUM('NOT_VERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."PhilHealthAccreditation" AS ENUM('ACCREDITED', 'PENDING', 'SUSPENDED', 'EXPIRED', 'NOT_ACCREDITED', 'UNDER_REVIEW');--> statement-breakpoint
CREATE TYPE "public"."Priority" AS ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."PrivacySettingType" AS ENUM('PUBLIC_READ', 'PUBLIC_WRITE', 'SHARED_SPECIFIC', 'PATIENT_APPROVED', 'TIME_LIMITED', 'ROLE_BASED');--> statement-breakpoint
CREATE TYPE "public"."RescheduleProposedBy" AS ENUM('PATIENT', 'DOCTOR', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."RescheduleStatus" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."Role" AS ENUM('DOCTOR', 'PATIENT', 'ADMIN', 'SUPER_ADMIN', 'ORGANIZATION');--> statement-breakpoint
CREATE TYPE "public"."Sex" AS ENUM('MALE', 'FEMALE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."SubscriptionEntityType" AS ENUM('ORGANIZATION', 'DOCTOR', 'PATIENT');--> statement-breakpoint
CREATE TYPE "public"."SubscriptionTier" AS ENUM('FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE', 'T');--> statement-breakpoint
CREATE TABLE "todos" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "todos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "User" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"password" varchar(255) NOT NULL,
	"role" "Role" NOT NULL,
	"organizationId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"profilePicture" text,
	"profilePictureVerified" boolean DEFAULT false NOT NULL,
	"profilePictureVerifiedBy" varchar(255),
	"profilePictureVerifiedAt" timestamp,
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"address" text,
	"phone" varchar(50),
	"email" varchar(255),
	"website" varchar(255),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"subscriptionTier" "SubscriptionTier" DEFAULT 'FREE' NOT NULL,
	"maxDoctors" integer,
	"maxPatientsPerDoctor" integer,
	"maxFaceScansPerDoctor" integer,
	"currentDoctors" integer DEFAULT 0 NOT NULL,
	"subscriptionStartDate" timestamp,
	"subscriptionEndDate" timestamp,
	"isSubscriptionActive" boolean DEFAULT true NOT NULL,
	"approvalStatus" "OrganizationApprovalStatus" DEFAULT 'PENDING' NOT NULL,
	"approvalStatusUpdatedBy" varchar(255),
	"approvalStatusUpdatedAt" timestamp,
	"approvalRejectionReason" text,
	CONSTRAINT "Organization_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "DoctorCategory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	CONSTRAINT "DoctorCategory_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "DoctorCategory" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users_to_doctor_categories" (
	"userId" uuid NOT NULL,
	"doctorCategoryId" uuid NOT NULL,
	CONSTRAINT "users_to_doctor_categories_userId_doctorCategoryId_unique" UNIQUE("userId","doctorCategoryId")
);
--> statement-breakpoint
ALTER TABLE "users_to_doctor_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "DoctorInfo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"firstName" varchar(255) NOT NULL,
	"middleName" varchar(255),
	"lastName" varchar(255) NOT NULL,
	"gender" "Sex" NOT NULL,
	"dateOfBirth" timestamp NOT NULL,
	"contactNumber" varchar(50) NOT NULL,
	"address" text NOT NULL,
	"bio" text NOT NULL,
	"specialization" varchar(255) NOT NULL,
	"qualifications" text NOT NULL,
	"experience" integer NOT NULL,
	"prcId" varchar(255),
	"ptrId" varchar(255),
	"medicalLicenseLevel" "MedicalLicenseLevel",
	"philHealthAccreditation" "PhilHealthAccreditation",
	"licenseNumber" varchar(255),
	"licenseExpiry" timestamp,
	"isLicenseActive" boolean DEFAULT true NOT NULL,
	"additionalCertifications" text,
	"licenseIssuedBy" varchar(255),
	"licenseIssuedDate" timestamp,
	"renewalRequired" boolean DEFAULT true NOT NULL,
	"prcIdImage" text,
	"ptrIdImage" text,
	"medicalLicenseImage" text,
	"additionalIdImages" text,
	"idDocumentsVerified" boolean DEFAULT false NOT NULL,
	"idDocumentsVerifiedBy" varchar(255),
	"idDocumentsVerifiedAt" timestamp,
	"approvalStatus" "DoctorApprovalStatus" DEFAULT 'PENDING' NOT NULL,
	"approvalStatusUpdatedBy" varchar(255),
	"approvalStatusUpdatedAt" timestamp,
	"approvalRejectionReason" text,
	"subscriptionTier" "SubscriptionTier" DEFAULT 'FREE' NOT NULL,
	"maxPatients" integer,
	"currentPatients" integer DEFAULT 0 NOT NULL,
	"maxFaceScans" integer,
	"currentFaceScans" integer DEFAULT 0 NOT NULL,
	"subscriptionStartDate" timestamp,
	"subscriptionEndDate" timestamp,
	"isSubscriptionActive" boolean DEFAULT true NOT NULL,
	CONSTRAINT "DoctorInfo_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
ALTER TABLE "DoctorInfo" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "PatientInfo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"firstName" varchar(255) NOT NULL,
	"middleName" varchar(255),
	"lastName" varchar(255) NOT NULL,
	"gender" "Sex" NOT NULL,
	"dateOfBirth" timestamp NOT NULL,
	"contactNumber" varchar(50) NOT NULL,
	"address" text NOT NULL,
	"weight" real NOT NULL,
	"height" real NOT NULL,
	"bloodType" varchar(10) NOT NULL,
	"medicalHistory" text,
	"allergies" text,
	"medications" text,
	"philHealthId" varchar(50),
	"philHealthStatus" varchar(50),
	"philHealthCategory" varchar(50),
	"philHealthExpiry" timestamp,
	"philHealthMemberSince" timestamp,
	"philHealthIdImage" text,
	"philHealthIdVerified" boolean DEFAULT false NOT NULL,
	"philHealthIdVerifiedBy" varchar(255),
	"philHealthIdVerifiedAt" timestamp,
	"verificationStatus" "PatientVerificationStatus" DEFAULT 'NOT_VERIFIED' NOT NULL,
	"verificationStatusUpdatedBy" varchar(255),
	"verificationStatusUpdatedAt" timestamp,
	"verificationRejectionReason" text,
	"subscriptionTier" "SubscriptionTier" DEFAULT 'FREE' NOT NULL,
	"maxFaceScans" integer,
	"currentFaceScans" integer DEFAULT 0 NOT NULL,
	"subscriptionStartDate" timestamp,
	"subscriptionEndDate" timestamp,
	"isSubscriptionActive" boolean DEFAULT true NOT NULL,
	CONSTRAINT "PatientInfo_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
ALTER TABLE "PatientInfo" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Consultation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctorId" uuid NOT NULL,
	"patientId" uuid NOT NULL,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp,
	"consultationCode" varchar(50) NOT NULL,
	"isPublic" boolean DEFAULT false NOT NULL,
	"notes" text,
	"diagnosis" text,
	"treatment" text,
	"followUpDate" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Consultation_consultationCode_unique" UNIQUE("consultationCode")
);
--> statement-breakpoint
ALTER TABLE "Consultation" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "HealthScan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consultationId" uuid NOT NULL,
	"bloodPressure" varchar(20),
	"heartRate" real,
	"spO2" real,
	"respiratoryRate" real,
	"stressLevel" real,
	"stressScore" real,
	"hrvSdnn" real,
	"hrvRmsdd" real,
	"generalWellness" real,
	"generalRisk" real,
	"coronaryHeartDisease" real,
	"congestiveHeartFailure" real,
	"intermittentClaudication" real,
	"strokeRisk" real,
	"covidRisk" real,
	"height" real,
	"weight" real,
	"smoker" boolean,
	"hypertension" boolean,
	"bpMedication" boolean,
	"diabetic" integer,
	"waistCircumference" real,
	"heartDisease" boolean,
	"depression" boolean,
	"totalCholesterol" real,
	"hdl" real,
	"parentalHypertension" integer,
	"physicalActivity" boolean,
	"healthyDiet" boolean,
	"antiHypertensive" boolean,
	"historyBloodGlucose" boolean,
	"historyFamilyDiabetes" integer,
	CONSTRAINT "HealthScan_consultationId_unique" UNIQUE("consultationId")
);
--> statement-breakpoint
ALTER TABLE "HealthScan" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"token" varchar(500) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid,
	"action" varchar(255) NOT NULL,
	"category" "AuditCategory" NOT NULL,
	"level" "AuditLevel" NOT NULL,
	"description" text NOT NULL,
	"ipAddress" varchar(100) NOT NULL,
	"userAgent" text NOT NULL,
	"resourceType" varchar(100),
	"resourceId" varchar(255),
	"details" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"severity" varchar(50) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"eventType" varchar(255) NOT NULL,
	"severity" "AuditLevel" NOT NULL,
	"description" text NOT NULL,
	"ipAddress" varchar(100) NOT NULL,
	"userAgent" text NOT NULL,
	"userId" uuid,
	"details" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolvedAt" timestamp,
	"resolvedBy" uuid
);
--> statement-breakpoint
ALTER TABLE "security_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"type" "NotificationType" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"relatedId" varchar(255),
	"relatedType" varchar(100),
	"actionUrl" text,
	"isRead" boolean DEFAULT false NOT NULL,
	"isArchived" boolean DEFAULT false NOT NULL,
	"priority" "NotificationPriority" DEFAULT 'NORMAL' NOT NULL,
	"metadata" jsonb,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "AdminInfo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"firstName" varchar(255) NOT NULL,
	"middleName" varchar(255),
	"lastName" varchar(255) NOT NULL,
	"gender" "Sex" NOT NULL,
	"dateOfBirth" timestamp NOT NULL,
	"contactNumber" varchar(50) NOT NULL,
	"address" text NOT NULL,
	"bio" text,
	"department" varchar(255),
	"position" varchar(255),
	"employeeId" varchar(255),
	CONSTRAINT "AdminInfo_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
ALTER TABLE "AdminInfo" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "DoctorSchedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctorId" uuid NOT NULL,
	"dayOfWeek" varchar(50) NOT NULL,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp NOT NULL,
	"isAvailable" boolean DEFAULT false NOT NULL,
	CONSTRAINT "DoctorSchedule_doctorId_dayOfWeek_unique" UNIQUE("doctorId","dayOfWeek")
);
--> statement-breakpoint
ALTER TABLE "DoctorSchedule" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "EmergencyContact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patientId" uuid NOT NULL,
	"contactName" varchar(255) NOT NULL,
	"relationship" varchar(100) NOT NULL,
	"contactNumber" varchar(50) NOT NULL,
	"contactAddress" text,
	CONSTRAINT "EmergencyContact_patientId_unique" UNIQUE("patientId")
);
--> statement-breakpoint
ALTER TABLE "EmergencyContact" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "InsuranceInfo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patientId" uuid NOT NULL,
	"providerName" varchar(255) NOT NULL,
	"policyNumber" varchar(255) NOT NULL,
	"insuranceContact" varchar(255) NOT NULL,
	CONSTRAINT "InsuranceInfo_patientId_unique" UNIQUE("patientId")
);
--> statement-breakpoint
ALTER TABLE "InsuranceInfo" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "AppointmentRequest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patientId" uuid NOT NULL,
	"doctorId" uuid NOT NULL,
	"requestedDate" timestamp NOT NULL,
	"requestedTime" varchar(50) NOT NULL,
	"reason" text NOT NULL,
	"status" "AppointmentStatus" DEFAULT 'PENDING' NOT NULL,
	"priority" "Priority" DEFAULT 'NORMAL' NOT NULL,
	"notes" text,
	"consultationId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "AppointmentRequest" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "RescheduleRequest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointmentId" uuid NOT NULL,
	"requestedBy" uuid NOT NULL,
	"requestedByRole" "Role" NOT NULL,
	"currentDate" timestamp NOT NULL,
	"currentTime" varchar(50) NOT NULL,
	"newDate" timestamp NOT NULL,
	"newTime" varchar(50) NOT NULL,
	"reason" text NOT NULL,
	"status" "RescheduleStatus" DEFAULT 'PENDING' NOT NULL,
	"proposedBy" "RescheduleProposedBy" NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"resolvedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "RescheduleRequest" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Prescription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patientId" uuid NOT NULL,
	"doctorId" uuid NOT NULL,
	"consultationId" uuid,
	"roomId" varchar(255),
	"medicationName" varchar(255) NOT NULL,
	"dosage" varchar(255) NOT NULL,
	"frequency" varchar(255) NOT NULL,
	"duration" varchar(255) NOT NULL,
	"instructions" text,
	"quantity" integer,
	"refills" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"prescribedAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Prescription" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "Diagnosis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patientId" uuid NOT NULL,
	"doctorId" uuid NOT NULL,
	"consultationId" uuid,
	"roomId" varchar(255),
	"diagnosisCode" varchar(50),
	"diagnosisName" varchar(255) NOT NULL,
	"description" text,
	"severity" "DiagnosisSeverity" DEFAULT 'MILD' NOT NULL,
	"status" "DiagnosisStatus" DEFAULT 'ACTIVE' NOT NULL,
	"onsetDate" timestamp,
	"diagnosedAt" timestamp DEFAULT now() NOT NULL,
	"resolvedAt" timestamp,
	"notes" text,
	"isPrimary" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Diagnosis" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "LabRequest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patientId" uuid NOT NULL,
	"organizationId" uuid NOT NULL,
	"doctorId" uuid,
	"roomId" varchar(255),
	"note" text,
	"createdBy" uuid NOT NULL,
	"updatedBy" uuid,
	"status" "LabRequestStatus" DEFAULT 'PENDING' NOT NULL,
	"priority" "Priority" DEFAULT 'NORMAL' NOT NULL,
	"requestedTests" text,
	"instructions" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "LabRequest" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "SubscriptionTierSetting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier" "SubscriptionTier" NOT NULL,
	"entityType" "SubscriptionEntityType" NOT NULL,
	"displayName" varchar(255) NOT NULL,
	"description" text,
	"maxDoctors" integer,
	"maxPatients" integer,
	"maxFaceScans" integer,
	"maxPatientsPerDoctor" integer,
	"maxFaceScansPerDoctor" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "SubscriptionTierSetting_tier_entityType_unique" UNIQUE("tier","entityType")
);
--> statement-breakpoint
ALTER TABLE "SubscriptionTierSetting" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "FaceScanResult" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firstName" varchar(255) NOT NULL,
	"lastName" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"results" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "FaceScanResult" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "PatientMedicalHistory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patientId" uuid NOT NULL,
	"consultationId" uuid,
	"recordType" "MedicalRecordType" NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"isPublic" boolean DEFAULT false NOT NULL,
	"isSensitive" boolean DEFAULT false NOT NULL,
	"createdBy" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "PatientMedicalHistory" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "OrganizationSettings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizationId" uuid NOT NULL,
	"clinicStartTime" time DEFAULT '08:00:00' NOT NULL,
	"clinicEndTime" time DEFAULT '17:00:00' NOT NULL,
	"breakStartTime" time,
	"breakEndTime" time,
	"appointmentSlotDuration" integer DEFAULT 30 NOT NULL,
	"maxAppointmentsPerSlot" integer DEFAULT 1 NOT NULL,
	"bookingWindowDays" integer DEFAULT 30 NOT NULL,
	"minAdvanceBookingHours" integer DEFAULT 2 NOT NULL,
	"workingDays" json DEFAULT '["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"]'::json NOT NULL,
	"additionalSettings" json,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "OrganizationSettings_organizationId_unique" UNIQUE("organizationId")
);
--> statement-breakpoint
ALTER TABLE "OrganizationSettings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_Organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_doctor_categories" ADD CONSTRAINT "users_to_doctor_categories_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_to_doctor_categories" ADD CONSTRAINT "users_to_doctor_categories_doctorCategoryId_DoctorCategory_id_fk" FOREIGN KEY ("doctorCategoryId") REFERENCES "public"."DoctorCategory"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DoctorInfo" ADD CONSTRAINT "DoctorInfo_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PatientInfo" ADD CONSTRAINT "PatientInfo_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_doctorId_User_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_patientId_User_id_fk" FOREIGN KEY ("patientId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "HealthScan" ADD CONSTRAINT "HealthScan_consultationId_Consultation_id_fk" FOREIGN KEY ("consultationId") REFERENCES "public"."Consultation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_resolvedBy_User_id_fk" FOREIGN KEY ("resolvedBy") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AdminInfo" ADD CONSTRAINT "AdminInfo_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DoctorSchedule" ADD CONSTRAINT "DoctorSchedule_doctorId_User_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "EmergencyContact" ADD CONSTRAINT "EmergencyContact_patientId_User_id_fk" FOREIGN KEY ("patientId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InsuranceInfo" ADD CONSTRAINT "InsuranceInfo_patientId_User_id_fk" FOREIGN KEY ("patientId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AppointmentRequest" ADD CONSTRAINT "AppointmentRequest_patientId_User_id_fk" FOREIGN KEY ("patientId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AppointmentRequest" ADD CONSTRAINT "AppointmentRequest_doctorId_User_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "AppointmentRequest" ADD CONSTRAINT "AppointmentRequest_consultationId_Consultation_id_fk" FOREIGN KEY ("consultationId") REFERENCES "public"."Consultation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RescheduleRequest" ADD CONSTRAINT "RescheduleRequest_appointmentId_AppointmentRequest_id_fk" FOREIGN KEY ("appointmentId") REFERENCES "public"."AppointmentRequest"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RescheduleRequest" ADD CONSTRAINT "RescheduleRequest_requestedBy_User_id_fk" FOREIGN KEY ("requestedBy") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_User_id_fk" FOREIGN KEY ("patientId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_doctorId_User_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_consultationId_Consultation_id_fk" FOREIGN KEY ("consultationId") REFERENCES "public"."Consultation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_patientId_User_id_fk" FOREIGN KEY ("patientId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_doctorId_User_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_consultationId_Consultation_id_fk" FOREIGN KEY ("consultationId") REFERENCES "public"."Consultation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "LabRequest" ADD CONSTRAINT "LabRequest_patientId_User_id_fk" FOREIGN KEY ("patientId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "LabRequest" ADD CONSTRAINT "LabRequest_organizationId_Organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "LabRequest" ADD CONSTRAINT "LabRequest_doctorId_User_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "LabRequest" ADD CONSTRAINT "LabRequest_createdBy_User_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "LabRequest" ADD CONSTRAINT "LabRequest_updatedBy_User_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PatientMedicalHistory" ADD CONSTRAINT "PatientMedicalHistory_patientId_User_id_fk" FOREIGN KEY ("patientId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PatientMedicalHistory" ADD CONSTRAINT "PatientMedicalHistory_consultationId_Consultation_id_fk" FOREIGN KEY ("consultationId") REFERENCES "public"."Consultation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PatientMedicalHistory" ADD CONSTRAINT "PatientMedicalHistory_createdBy_User_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "OrganizationSettings" ADD CONSTRAINT "OrganizationSettings_organizationId_Organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_profilePictureVerified_idx" ON "User" USING btree ("profilePictureVerified");--> statement-breakpoint
CREATE INDEX "user_profilePictureVerifiedBy_idx" ON "User" USING btree ("profilePictureVerifiedBy");--> statement-breakpoint
CREATE INDEX "organization_subscriptionTier_idx" ON "Organization" USING btree ("subscriptionTier");--> statement-breakpoint
CREATE INDEX "organization_isSubscriptionActive_idx" ON "Organization" USING btree ("isSubscriptionActive");--> statement-breakpoint
CREATE INDEX "organization_approvalStatus_idx" ON "Organization" USING btree ("approvalStatus");--> statement-breakpoint
CREATE INDEX "doctorInfo_subscriptionTier_idx" ON "DoctorInfo" USING btree ("subscriptionTier");--> statement-breakpoint
CREATE INDEX "doctorInfo_isSubscriptionActive_idx" ON "DoctorInfo" USING btree ("isSubscriptionActive");--> statement-breakpoint
CREATE INDEX "doctorInfo_prcId_idx" ON "DoctorInfo" USING btree ("prcId");--> statement-breakpoint
CREATE INDEX "doctorInfo_ptrId_idx" ON "DoctorInfo" USING btree ("ptrId");--> statement-breakpoint
CREATE INDEX "doctorInfo_medicalLicenseLevel_idx" ON "DoctorInfo" USING btree ("medicalLicenseLevel");--> statement-breakpoint
CREATE INDEX "doctorInfo_philHealthAccreditation_idx" ON "DoctorInfo" USING btree ("philHealthAccreditation");--> statement-breakpoint
CREATE INDEX "doctorInfo_isLicenseActive_idx" ON "DoctorInfo" USING btree ("isLicenseActive");--> statement-breakpoint
CREATE INDEX "doctorInfo_licenseExpiry_idx" ON "DoctorInfo" USING btree ("licenseExpiry");--> statement-breakpoint
CREATE INDEX "doctorInfo_idDocumentsVerified_idx" ON "DoctorInfo" USING btree ("idDocumentsVerified");--> statement-breakpoint
CREATE INDEX "doctorInfo_idDocumentsVerifiedBy_idx" ON "DoctorInfo" USING btree ("idDocumentsVerifiedBy");--> statement-breakpoint
CREATE INDEX "doctorInfo_approvalStatus_idx" ON "DoctorInfo" USING btree ("approvalStatus");--> statement-breakpoint
CREATE INDEX "patientInfo_subscriptionTier_idx" ON "PatientInfo" USING btree ("subscriptionTier");--> statement-breakpoint
CREATE INDEX "patientInfo_isSubscriptionActive_idx" ON "PatientInfo" USING btree ("isSubscriptionActive");--> statement-breakpoint
CREATE INDEX "patientInfo_philHealthId_idx" ON "PatientInfo" USING btree ("philHealthId");--> statement-breakpoint
CREATE INDEX "patientInfo_philHealthStatus_idx" ON "PatientInfo" USING btree ("philHealthStatus");--> statement-breakpoint
CREATE INDEX "patientInfo_philHealthIdVerified_idx" ON "PatientInfo" USING btree ("philHealthIdVerified");--> statement-breakpoint
CREATE INDEX "patientInfo_philHealthIdVerifiedBy_idx" ON "PatientInfo" USING btree ("philHealthIdVerifiedBy");--> statement-breakpoint
CREATE INDEX "patientInfo_verificationStatus_idx" ON "PatientInfo" USING btree ("verificationStatus");--> statement-breakpoint
CREATE INDEX "patientInfo_verificationStatusUpdatedBy_idx" ON "PatientInfo" USING btree ("verificationStatusUpdatedBy");--> statement-breakpoint
CREATE INDEX "auditLogs_userId_idx" ON "audit_logs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "auditLogs_timestamp_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "auditLogs_category_idx" ON "audit_logs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "auditLogs_level_idx" ON "audit_logs" USING btree ("level");--> statement-breakpoint
CREATE INDEX "securityEvents_userId_idx" ON "security_events" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "securityEvents_timestamp_idx" ON "security_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "securityEvents_eventType_idx" ON "security_events" USING btree ("eventType");--> statement-breakpoint
CREATE INDEX "securityEvents_severity_idx" ON "security_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "securityEvents_resolved_idx" ON "security_events" USING btree ("resolved");--> statement-breakpoint
CREATE INDEX "notifications_userId_idx" ON "Notification" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "notifications_isRead_idx" ON "Notification" USING btree ("isRead");--> statement-breakpoint
CREATE INDEX "notifications_isArchived_idx" ON "Notification" USING btree ("isArchived");--> statement-breakpoint
CREATE INDEX "notifications_type_idx" ON "Notification" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notifications_priority_idx" ON "Notification" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "notifications_createdAt_idx" ON "Notification" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "notifications_userId_isRead_idx" ON "Notification" USING btree ("userId","isRead");--> statement-breakpoint
CREATE INDEX "adminInfo_employeeId_idx" ON "AdminInfo" USING btree ("employeeId");--> statement-breakpoint
CREATE INDEX "adminInfo_department_idx" ON "AdminInfo" USING btree ("department");--> statement-breakpoint
CREATE INDEX "appointmentRequest_patientId_idx" ON "AppointmentRequest" USING btree ("patientId");--> statement-breakpoint
CREATE INDEX "appointmentRequest_doctorId_idx" ON "AppointmentRequest" USING btree ("doctorId");--> statement-breakpoint
CREATE INDEX "appointmentRequest_status_idx" ON "AppointmentRequest" USING btree ("status");--> statement-breakpoint
CREATE INDEX "appointmentRequest_requestedDate_idx" ON "AppointmentRequest" USING btree ("requestedDate");--> statement-breakpoint
CREATE INDEX "rescheduleRequest_appointmentId_idx" ON "RescheduleRequest" USING btree ("appointmentId");--> statement-breakpoint
CREATE INDEX "rescheduleRequest_requestedBy_idx" ON "RescheduleRequest" USING btree ("requestedBy");--> statement-breakpoint
CREATE INDEX "rescheduleRequest_status_idx" ON "RescheduleRequest" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rescheduleRequest_newDate_idx" ON "RescheduleRequest" USING btree ("newDate");--> statement-breakpoint
CREATE INDEX "prescription_patientId_idx" ON "Prescription" USING btree ("patientId");--> statement-breakpoint
CREATE INDEX "prescription_doctorId_idx" ON "Prescription" USING btree ("doctorId");--> statement-breakpoint
CREATE INDEX "prescription_consultationId_idx" ON "Prescription" USING btree ("consultationId");--> statement-breakpoint
CREATE INDEX "prescription_roomId_idx" ON "Prescription" USING btree ("roomId");--> statement-breakpoint
CREATE INDEX "prescription_isActive_idx" ON "Prescription" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "prescription_prescribedAt_idx" ON "Prescription" USING btree ("prescribedAt");--> statement-breakpoint
CREATE INDEX "diagnosis_patientId_idx" ON "Diagnosis" USING btree ("patientId");--> statement-breakpoint
CREATE INDEX "diagnosis_doctorId_idx" ON "Diagnosis" USING btree ("doctorId");--> statement-breakpoint
CREATE INDEX "diagnosis_consultationId_idx" ON "Diagnosis" USING btree ("consultationId");--> statement-breakpoint
CREATE INDEX "diagnosis_roomId_idx" ON "Diagnosis" USING btree ("roomId");--> statement-breakpoint
CREATE INDEX "diagnosis_diagnosisCode_idx" ON "Diagnosis" USING btree ("diagnosisCode");--> statement-breakpoint
CREATE INDEX "diagnosis_status_idx" ON "Diagnosis" USING btree ("status");--> statement-breakpoint
CREATE INDEX "diagnosis_diagnosedAt_idx" ON "Diagnosis" USING btree ("diagnosedAt");--> statement-breakpoint
CREATE INDEX "labRequest_patientId_idx" ON "LabRequest" USING btree ("patientId");--> statement-breakpoint
CREATE INDEX "labRequest_organizationId_idx" ON "LabRequest" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "labRequest_doctorId_idx" ON "LabRequest" USING btree ("doctorId");--> statement-breakpoint
CREATE INDEX "labRequest_roomId_idx" ON "LabRequest" USING btree ("roomId");--> statement-breakpoint
CREATE INDEX "labRequest_status_idx" ON "LabRequest" USING btree ("status");--> statement-breakpoint
CREATE INDEX "labRequest_priority_idx" ON "LabRequest" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "labRequest_createdAt_idx" ON "LabRequest" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "faceScanResult_email_idx" ON "FaceScanResult" USING btree ("email");--> statement-breakpoint
CREATE INDEX "faceScanResult_createdAt_idx" ON "FaceScanResult" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "patientMedicalHistory_patientId_idx" ON "PatientMedicalHistory" USING btree ("patientId");--> statement-breakpoint
CREATE INDEX "patientMedicalHistory_consultationId_idx" ON "PatientMedicalHistory" USING btree ("consultationId");--> statement-breakpoint
CREATE INDEX "patientMedicalHistory_isPublic_idx" ON "PatientMedicalHistory" USING btree ("isPublic");--> statement-breakpoint
CREATE INDEX "patientMedicalHistory_recordType_idx" ON "PatientMedicalHistory" USING btree ("recordType");--> statement-breakpoint
CREATE INDEX "organizationSettings_organizationId_idx" ON "OrganizationSettings" USING btree ("organizationId");