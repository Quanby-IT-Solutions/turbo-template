import { pgEnum } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('Role', [
  'DOCTOR',
  'PATIENT',
  'ADMIN',
  'SUPER_ADMIN',
  'ORGANIZATION',
]);

export const sexEnum = pgEnum('Sex', ['MALE', 'FEMALE', 'OTHER']);

export const doctorApprovalStatusEnum = pgEnum('DoctorApprovalStatus', [
  'PENDING',
  'APPROVED',
  'REJECTED',
]);

export const medicalLicenseLevelEnum = pgEnum('MedicalLicenseLevel', [
  'S1',
  'S2',
  'S3',
]);

export const philHealthAccreditationEnum = pgEnum('PhilHealthAccreditation', [
  'ACCREDITED',
  'PENDING',
  'SUSPENDED',
  'EXPIRED',
  'NOT_ACCREDITED',
  'UNDER_REVIEW',
]);

export const patientVerificationStatusEnum = pgEnum('PatientVerificationStatus', [
  'NOT_VERIFIED',
  'PENDING',
  'VERIFIED',
  'REJECTED',
]);

export const subscriptionTierEnum = pgEnum('SubscriptionTier', [
  'FREE',
  'BASIC',
  'PREMIUM',
  'ENTERPRISE',
  'T',
]);

export const organizationApprovalStatusEnum = pgEnum('OrganizationApprovalStatus', [
  'PENDING',
  'APPROVED',
  'REJECTED',
]);

export const subscriptionEntityTypeEnum = pgEnum('SubscriptionEntityType', [
  'ORGANIZATION',
  'DOCTOR',
  'PATIENT',
]);

export const appointmentStatusEnum = pgEnum('AppointmentStatus', [
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'REJECTED',
  'RESCHEDULED',
]);

export const rescheduleStatusEnum = pgEnum('RescheduleStatus', [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
]);

export const rescheduleProposedByEnum = pgEnum('RescheduleProposedBy', [
  'PATIENT',
  'DOCTOR',
  'SYSTEM',
]);

export const priorityEnum = pgEnum('Priority', ['LOW', 'NORMAL', 'HIGH', 'URGENT']);

export const privacySettingTypeEnum = pgEnum('PrivacySettingType', [
  'PUBLIC_READ',
  'PUBLIC_WRITE',
  'SHARED_SPECIFIC',
  'PATIENT_APPROVED',
  'TIME_LIMITED',
  'ROLE_BASED',
]);

export const accessLevelEnum = pgEnum('AccessLevel', [
  'READ_ONLY',
  'READ_WITH_NOTES',
  'READ_WITH_HISTORY',
  'FULL_ACCESS',
]);

export const medicalRecordTypeEnum = pgEnum('MedicalRecordType', [
  'CONSULTATION_NOTES',
  'DIAGNOSIS',
  'TREATMENT_PLAN',
  'MEDICATION',
  'LAB_RESULTS',
  'IMAGING_RESULTS',
  'ALLERGIES',
  'CHRONIC_CONDITIONS',
  'SURGICAL_HISTORY',
  'FAMILY_HISTORY',
  'LIFESTYLE',
  'VACCINATIONS',
]);

export const diagnosisSeverityEnum = pgEnum('DiagnosisSeverity', [
  'MILD',
  'MODERATE',
  'SEVERE',
  'CRITICAL',
]);

export const diagnosisStatusEnum = pgEnum('DiagnosisStatus', [
  'ACTIVE',
  'RESOLVED',
  'CHRONIC',
  'SUSPECTED',
  'RULED_OUT',
]);

export const labRequestStatusEnum = pgEnum('LabRequestStatus', [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
  'ON_HOLD',
]);

export const notificationTypeEnum = pgEnum('NotificationType', [
  'APPOINTMENT_CREATED',
  'APPOINTMENT_CONFIRMED',
  'APPOINTMENT_CANCELLED',
  'APPOINTMENT_REJECTED',
  'APPOINTMENT_RESCHEDULED',
  'APPOINTMENT_REMINDER',
  'CONSULTATION_STARTED',
  'CONSULTATION_ENDED',
  'PRESCRIPTION_ISSUED',
  'PRESCRIPTION_EXPIRING',
  'DIAGNOSIS_ADDED',
  'LAB_REQUEST_CREATED',
  'LAB_RESULTS_AVAILABLE',
  'MEDICAL_RECORD_SHARED',
  'HEALTH_SCAN_COMPLETED',
  'HEALTH_SCAN_SHARED',
  'RESCHEDULE_REQUEST',
  'RESCHEDULE_APPROVED',
  'RESCHEDULE_REJECTED',
  'SYSTEM_ANNOUNCEMENT',
  'SECURITY_ALERT',
  'PROFILE_UPDATE',
  'DOCUMENT_VERIFIED',
  'DOCUMENT_REJECTED',
  'GENERAL',
]);

export const notificationPriorityEnum = pgEnum('NotificationPriority', [
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT',
]);

export const auditCategoryEnum = pgEnum('AuditCategory', [
  'AUTHENTICATION',
  'AUTHORIZATION',
  'DATA_ACCESS',
  'DATA_MODIFICATION',
  'SECURITY',
  'SYSTEM',
  'USER_ACTIVITY',
]);

export const auditLevelEnum = pgEnum('AuditLevel', [
  'INFO',
  'WARNING',
  'ERROR',
  'CRITICAL',
]);

// Enum value objects for runtime use
export const Role = {
  DOCTOR: 'DOCTOR' as const,
  PATIENT: 'PATIENT' as const,
  ADMIN: 'ADMIN' as const,
  SUPER_ADMIN: 'SUPER_ADMIN' as const,
  ORGANIZATION: 'ORGANIZATION' as const,
};

export const Sex = {
  MALE: 'MALE' as const,
  FEMALE: 'FEMALE' as const,
  OTHER: 'OTHER' as const,
};

export const SubscriptionTier = {
  FREE: 'FREE' as const,
  BASIC: 'BASIC' as const,
  PREMIUM: 'PREMIUM' as const,
  ENTERPRISE: 'ENTERPRISE' as const,
  T: 'T' as const,
};

export const SubscriptionEntityType = {
  ORGANIZATION: 'ORGANIZATION' as const,
  DOCTOR: 'DOCTOR' as const,
  PATIENT: 'PATIENT' as const,
};

export const MedicalLicenseLevel = {
  S1: 'S1' as const,
  S2: 'S2' as const,
  S3: 'S3' as const,
};

export const PhilHealthAccreditation = {
  ACCREDITED: 'ACCREDITED' as const,
  PENDING: 'PENDING' as const,
  SUSPENDED: 'SUSPENDED' as const,
  EXPIRED: 'EXPIRED' as const,
  NOT_ACCREDITED: 'NOT_ACCREDITED' as const,
  UNDER_REVIEW: 'UNDER_REVIEW' as const,
};

export const AuditLevel = {
  INFO: 'INFO' as const,
  WARNING: 'WARNING' as const,
  ERROR: 'ERROR' as const,
  CRITICAL: 'CRITICAL' as const,
};

export const AuditCategory = {
  AUTHENTICATION: 'AUTHENTICATION' as const,
  AUTHORIZATION: 'AUTHORIZATION' as const,
  DATA_ACCESS: 'DATA_ACCESS' as const,
  DATA_MODIFICATION: 'DATA_MODIFICATION' as const,
  SECURITY: 'SECURITY' as const,
  SYSTEM: 'SYSTEM' as const,
  USER_ACTIVITY: 'USER_ACTIVITY' as const,
};

// Type exports for TypeScript types
// For enums with const objects, we derive types from the const values
export type Role = 'DOCTOR' | 'PATIENT' | 'ADMIN' | 'SUPER_ADMIN' | 'ORGANIZATION';
export type Sex = 'MALE' | 'FEMALE' | 'OTHER';
export type SubscriptionTier = 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE' | 'T';
export type SubscriptionEntityType = 'ORGANIZATION' | 'DOCTOR' | 'PATIENT';
export type MedicalLicenseLevel = 'S1' | 'S2' | 'S3';
export type PhilHealthAccreditation = 'ACCREDITED' | 'PENDING' | 'SUSPENDED' | 'EXPIRED' | 'NOT_ACCREDITED' | 'UNDER_REVIEW';
export type AuditLevel = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
export type AuditCategory = 'AUTHENTICATION' | 'AUTHORIZATION' | 'DATA_ACCESS' | 'DATA_MODIFICATION' | 'SECURITY' | 'SYSTEM' | 'USER_ACTIVITY';
export type DoctorApprovalStatus = typeof doctorApprovalStatusEnum.enumValues[number];
export type PatientVerificationStatus = typeof patientVerificationStatusEnum.enumValues[number];
export type OrganizationApprovalStatus = typeof organizationApprovalStatusEnum.enumValues[number];
export type AppointmentStatus = typeof appointmentStatusEnum.enumValues[number];
export type RescheduleStatus = typeof rescheduleStatusEnum.enumValues[number];
export type RescheduleProposedBy = typeof rescheduleProposedByEnum.enumValues[number];
export type Priority = typeof priorityEnum.enumValues[number];
export type PrivacySettingType = typeof privacySettingTypeEnum.enumValues[number];
export type AccessLevel = typeof accessLevelEnum.enumValues[number];
export type MedicalRecordType = typeof medicalRecordTypeEnum.enumValues[number];
export type DiagnosisSeverity = typeof diagnosisSeverityEnum.enumValues[number];
export type DiagnosisStatus = typeof diagnosisStatusEnum.enumValues[number];
export type LabRequestStatus = typeof labRequestStatusEnum.enumValues[number];
export type NotificationType = typeof notificationTypeEnum.enumValues[number];
export type NotificationPriority = typeof notificationPriorityEnum.enumValues[number];
// AuditCategory and AuditLevel types are already defined above using the const objects
