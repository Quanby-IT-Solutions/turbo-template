import { Module } from "@nestjs/common"

import { AppointmentsModule } from "./appointments/appointments.module"
import { AuditModule } from "./audit/audit.module"
import { AuthModule } from "./auth/auth.module"
import { ConsultationsModule } from "./consultations/consultations.module"
import { DiagnosesModule } from "./diagnoses/diagnoses.module"
import { DoctorsModule } from "./doctors/doctors.module"
import { EmailModule } from "./email/email.module"
import { ExamplesModule } from "./examples/examples.module"
import { FaceScanModule } from "./face-scan/face-scan.module"
import { LabRequestsModule } from "./lab-requests/lab-requests.module"
import { MedicalRecordsModule } from "./medical-records/medical-records.module"
import { NotificationsModule } from "./notifications/notifications.module"
import { OrganizationsModule } from "./organizations/organizations.module"
import { PatientsModule } from "./patients/patients.module"
import { PrescriptionsModule } from "./prescriptions/prescriptions.module"
import { SelfCheckModule } from "./self-check/self-check.module"
import { SubscriptionTiersModule } from "./subscription-tiers/subscription-tiers.module"
import { SubscriptionsModule } from "./subscriptions/subscriptions.module"
import { SuperAdminModule } from "./super-admin/super-admin.module"
import { UsersModule } from "./users/users.module"
import { WebRtcModule } from "./webrtc/webrtc.module"

@Module({
	imports: [
		ExamplesModule,
		AuthModule,
		DoctorsModule,
		PatientsModule,
		AppointmentsModule,
		ConsultationsModule,
		PrescriptionsModule,
		DiagnosesModule,
		OrganizationsModule,
		LabRequestsModule,
		NotificationsModule,
		AuditModule,
		SuperAdminModule,
		SubscriptionsModule,
		SubscriptionTiersModule,
		UsersModule,
		WebRtcModule,
		FaceScanModule,
		MedicalRecordsModule,
		SelfCheckModule,
		EmailModule,
	],
})
export class AppModule {}
