// Export all enums
export * from './enums.js';

// Export todos (backward compatibility)
export * from './todos.js';

// Export user schema first (used by Better Auth)
export * from './user.schema.js';

// Export Better Auth schema tables (session, account, verification)
// Note: We no longer export a separate 'user' table - we use our unified User table
export * from './better-auth.schema.js';

// Export all schema tables
export * from './organization.schema.js';
export * from './doctor-category.schema.js';
export * from './user-doctor-category.schema.js';
export * from './doctor-info.schema.js';
export * from './patient-info.schema.js';
export * from './consultation.schema.js';
export * from './health-scan.schema.js';
export * from './refresh-token.schema.js';
export * from './audit-log.schema.js';
export * from './security-event.schema.js';
export * from './notification.schema.js';
export * from './admin-info.schema.js';
export * from './doctor-schedule.schema.js';
export * from './emergency-contact.schema.js';
export * from './insurance-info.schema.js';
export * from './appointment-request.schema.js';
export * from './reschedule-request.schema.js';
export * from './prescription.schema.js';
export * from './diagnosis.schema.js';
export * from './lab-request.schema.js';
export * from './subscription-tier-setting.schema.js';
export * from './face-scan-result.schema.js';
export * from './patient-medical-history.schema.js';

// Keep todos exports for backward compatibility (if needed)
import * as todos from "./todos.js"
import * as userSchema from "./user.schema.js"
import * as betterAuthSchema from "./better-auth.schema.js"
import * as organizationSchema from "./organization.schema.js"
import * as doctorCategorySchema from "./doctor-category.schema.js"
import * as userDoctorCategorySchema from "./user-doctor-category.schema.js"
import * as doctorInfoSchema from "./doctor-info.schema.js"
import * as patientInfoSchema from "./patient-info.schema.js"
import * as consultationSchema from "./consultation.schema.js"
import * as healthScanSchema from "./health-scan.schema.js"
import * as refreshTokenSchema from "./refresh-token.schema.js"
import * as auditLogSchema from "./audit-log.schema.js"
import * as securityEventSchema from "./security-event.schema.js"
import * as notificationSchema from "./notification.schema.js"
import * as adminInfoSchema from "./admin-info.schema.js"
import * as doctorScheduleSchema from "./doctor-schedule.schema.js"
import * as emergencyContactSchema from "./emergency-contact.schema.js"
import * as insuranceInfoSchema from "./insurance-info.schema.js"
import * as appointmentRequestSchema from "./appointment-request.schema.js"
import * as rescheduleRequestSchema from "./reschedule-request.schema.js"
import * as prescriptionSchema from "./prescription.schema.js"
import * as diagnosisSchema from "./diagnosis.schema.js"
import * as labRequestSchema from "./lab-request.schema.js"
import * as subscriptionTierSettingSchema from "./subscription-tier-setting.schema.js"
import * as faceScanResultSchema from "./face-scan-result.schema.js"
import * as patientMedicalHistorySchema from "./patient-medical-history.schema.js"

// Note: auth.ts is not exported - we use user.schema.ts and better-auth.schema.ts instead

export const schema = {
	...todos,
	...userSchema,
	...betterAuthSchema,
	...organizationSchema,
	...doctorCategorySchema,
	...userDoctorCategorySchema,
	...doctorInfoSchema,
	...patientInfoSchema,
	...consultationSchema,
	...healthScanSchema,
	...refreshTokenSchema,
	...auditLogSchema,
	...securityEventSchema,
	...notificationSchema,
	...adminInfoSchema,
	...doctorScheduleSchema,
	...emergencyContactSchema,
	...insuranceInfoSchema,
	...appointmentRequestSchema,
	...rescheduleRequestSchema,
	...prescriptionSchema,
	...diagnosisSchema,
	...labRequestSchema,
	...subscriptionTierSettingSchema,
	...faceScanResultSchema,
	...patientMedicalHistorySchema,
}

export type Schema = typeof schema

export default schema
