import "dotenv/config"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { eq, and } from "drizzle-orm"
import { hash as hashPassword } from "bcryptjs"
import { v4 as uuidv4 } from "uuid"

import { type createDBClient } from "./client.js"
import { schema } from "./schema/index.js"
import { subscriptionTierSettings } from "./schema/subscription-tier-setting.schema.js"
import { doctorCategories } from "./schema/doctor-category.schema.js"
import { organizations } from "./schema/organization.schema.js"
import { users } from "./schema/user.schema.js"
import { adminInfos } from "./schema/admin-info.schema.js"
import { doctorInfos } from "./schema/doctor-info.schema.js"
import { patientInfos } from "./schema/patient-info.schema.js"
import { usersToDoctorCategories } from "./schema/user-doctor-category.schema.js"
import { account } from "./schema/better-auth.schema.js"
import { appointmentRequests } from "./schema/appointment-request.schema.js"
import { consultations } from "./schema/consultation.schema.js"

/**
 * Create Better Auth account for a user
 */
async function createBetterAuthAccount(
	db: ReturnType<typeof createDBClient>,
	userId: string,
	email: string,
	plainPassword: string,
) {
	try {
		const existingAccount = await db
			.select()
			.from(account)
			.where(eq(account.accountId, email))
			.limit(1)

		if (!existingAccount || existingAccount.length === 0) {
			const passwordHash = await hashPassword(plainPassword, 10)
			await db
				.insert(account)
				.values({
					id: uuidv4(),
					accountId: email,
					providerId: "credential",
					userId,
					password: passwordHash,
					createdAt: new Date(),
					updatedAt: new Date(),
				})
				.onConflictDoNothing()
				.catch(() => {
					// Ignore errors
				})
		}
	} catch (error) {
		console.warn(`Warning: Failed to create Better Auth account for ${email}:`, error)
	}
}

/**
 * Main seed function
 */
async function seed() {
	const connectionString = process.env.POSTGRES_URL
	if (!connectionString) {
		throw new Error("POSTGRES_URL is not defined in environment variables")
	}

	const pool = new Pool({
		connectionString,
		max: 1,
	})
	const db = drizzle(pool, { schema })

	console.log("🌱 Starting database seeding...")

	try {
		// Seed subscription tier settings
		console.log("📦 Seeding subscription tier settings...")
		const subscriptionTierSettingsData: Array<{
			tier: "FREE" | "BASIC" | "PREMIUM" | "ENTERPRISE"
			entityType: "DOCTOR" | "PATIENT" | "ORGANIZATION"
			displayName: string
			description: string
			maxDoctors?: number
			maxPatients?: number
			maxFaceScans?: number
			maxPatientsPerDoctor?: number
			maxFaceScansPerDoctor?: number
		}> = [
				{
					tier: "FREE",
					entityType: "ORGANIZATION",
					displayName: "Free Organization",
					description: "Default free organization tier",
					maxDoctors: 5,
					maxPatientsPerDoctor: 10,
					maxFaceScansPerDoctor: 30,
				},
				{
					tier: "BASIC",
					entityType: "ORGANIZATION",
					displayName: "Basic Organization",
					description: "Basic paid plan for organizations",
					maxDoctors: 15,
					maxPatientsPerDoctor: 25,
					maxFaceScansPerDoctor: 100,
				},
				{
					tier: "PREMIUM",
					entityType: "ORGANIZATION",
					displayName: "Premium Organization",
					description: "Premium organization tier with higher doctor limits",
					maxDoctors: 40,
					maxPatientsPerDoctor: 60,
					maxFaceScansPerDoctor: 250,
				},
				{
					tier: "ENTERPRISE",
					entityType: "ORGANIZATION",
					displayName: "Enterprise Organization",
					description: "Enterprise tier with very high doctor capacity",
					maxDoctors: 100,
					maxPatientsPerDoctor: 150,
					maxFaceScansPerDoctor: 600,
				},
				{
					tier: "FREE",
					entityType: "DOCTOR",
					displayName: "Free Doctor",
					description: "Default free tier for doctors",
					maxPatients: 50,
					maxFaceScans: 200,
				},
				{
					tier: "BASIC",
					entityType: "DOCTOR",
					displayName: "Basic Doctor",
					description: "Basic tier for growing practices",
					maxPatients: 150,
					maxFaceScans: 400,
				},
				{
					tier: "PREMIUM",
					entityType: "DOCTOR",
					displayName: "Premium Doctor",
					description: "Premium tier for established doctors",
					maxPatients: 300,
					maxFaceScans: 900,
				},
				{
					tier: "ENTERPRISE",
					entityType: "DOCTOR",
					displayName: "Enterprise Doctor",
					description: "Enterprise tier for clinics with large patient loads",
					maxPatients: 600,
					maxFaceScans: 1500,
				},
				{
					tier: "FREE",
					entityType: "PATIENT",
					displayName: "Free Patient",
					description: "Default patient access",
					maxFaceScans: 20,
				},
				{
					tier: "BASIC",
					entityType: "PATIENT",
					displayName: "Basic Patient",
					description: "Basic patient subscription",
					maxFaceScans: 60,
				},
				{
					tier: "PREMIUM",
					entityType: "PATIENT",
					displayName: "Premium Patient",
					description: "Premium patient subscription with more scans",
					maxFaceScans: 150,
				},
				{
					tier: "ENTERPRISE",
					entityType: "PATIENT",
					displayName: "Enterprise Patient",
					description: "Enterprise patient plan for corporate programs",
					maxFaceScans: 300,
				},
			]

		for (const setting of subscriptionTierSettingsData) {
			const existing = await db.query.subscriptionTierSettings.findFirst({
				where: (settings, { and, eq }) =>
					and(eq(settings.tier, setting.tier), eq(settings.entityType, setting.entityType)),
			})
			if (!existing) {
				await db.insert(subscriptionTierSettings).values(setting)
			}
		}
		console.log("✅ Subscription tier settings seeded")

		// Seed doctor categories
		console.log("🏥 Seeding doctor categories...")
		const doctorCategoriesData = [
			{ name: "Cardiologist", description: "Specializes in heart and cardiovascular system" },
			{ name: "Dermatologist", description: "Specializes in skin, hair, and nail conditions" },
			{ name: "Neurologist", description: "Specializes in nervous system disorders" },
			{ name: "Orthopedist", description: "Specializes in bone and joint conditions" },
			{ name: "Pediatrician", description: "Specializes in children's health" },
		]

		for (const category of doctorCategoriesData) {
			const existing = await db.query.doctorCategories.findFirst({
				where: (categories, { eq }) => eq(categories.name, category.name),
			})
			if (!existing) {
				await db.insert(doctorCategories).values(category)
			}
		}
		console.log("✅ Doctor categories seeded")

		// Create organizations
		console.log("🏢 Creating organizations...")
		let quanbyOrg = await db.query.organizations.findFirst({
			where: (orgs, { eq }) => eq(orgs.name, "Quanby Healthcare Center"),
		})

		if (!quanbyOrg) {
			const [org] = await db
				.insert(organizations)
				.values({
					name: "Quanby Healthcare Center",
					description: "Primary healthcare facility providing comprehensive medical services",
					address: "123 Healthcare Blvd, Medical City, MC 12345",
					phone: "+1-555-HEALTH",
					email: "info@quanbyhealthcare.com",
					website: "https://quanbyhealthcare.com",
					isActive: true,
					subscriptionTier: "ENTERPRISE",
					maxDoctors: 25,
					maxPatientsPerDoctor: 150,
					maxFaceScansPerDoctor: 600,
					subscriptionStartDate: new Date("2024-01-01"),
					subscriptionEndDate: new Date("2024-12-31"),
					isSubscriptionActive: true,
					approvalStatus: "APPROVED",
					approvalStatusUpdatedAt: new Date("2024-01-01"),
				})
				.returning()
			quanbyOrg = org
		}

		let metroOrg = await db.query.organizations.findFirst({
			where: (orgs, { eq }) => eq(orgs.name, "Metro General Hospital"),
		})

		if (!metroOrg) {
			const [org] = await db
				.insert(organizations)
				.values({
					name: "Metro General Hospital",
					description: "Large general hospital with specialized departments",
					address: "456 Hospital Ave, Metro City, MC 67890",
					phone: "+1-555-HOSPITAL",
					email: "contact@metrogeneral.com",
					website: "https://metrogeneral.com",
					isActive: true,
					subscriptionTier: "PREMIUM",
					maxDoctors: 15,
					maxPatientsPerDoctor: 60,
					maxFaceScansPerDoctor: 250,
					subscriptionStartDate: new Date("2024-02-01"),
					subscriptionEndDate: new Date("2025-01-31"),
					isSubscriptionActive: true,
					approvalStatus: "APPROVED",
					approvalStatusUpdatedAt: new Date("2024-02-01"),
				})
				.returning()
			metroOrg = org
		}

		const organizationsList = [quanbyOrg, metroOrg].filter(Boolean)
		console.log("✅ Organizations created")

		// Create users
		console.log("👥 Seeding test users...")
		const saltRounds = 10
		const superAdminPassword = await hashPassword("superadmin123", saltRounds)
		const adminPassword = await hashPassword("admin123", saltRounds)
		const doctorPassword = await hashPassword("doctor123", saltRounds)
		const patientPassword = await hashPassword("patient123", saltRounds)

		// Super Admin
		let superAdminUser = await db.query.users.findFirst({
			where: (users, { eq }) => eq(users.email, "superadmin@qhealth.com"),
		})

		if (!superAdminUser) {
			const [user] = await db
				.insert(users)
				.values({
					name: "Super Admin",
					email: "superadmin@qhealth.com",
					password: superAdminPassword,
					emailVerified: true,
					role: "SUPER_ADMIN",
				})
				.returning()
			superAdminUser = user
			if (superAdminUser) {
				await createBetterAuthAccount(db, superAdminUser.id, superAdminUser.email, "superadmin123")
			}
		}
		console.log("👑 Created super admin user")

		// Organization Admin - Quanby
		let quanbyAdmin = await db.query.users.findFirst({
			where: (users, { eq }) => eq(users.email, "admin@quanbyhealthcare.com"),
		})

		if (!quanbyAdmin && quanbyOrg) {
			const [user] = await db
				.insert(users)
				.values({
					name: "Sarah Johnson",
					email: "admin@quanbyhealthcare.com",
					password: adminPassword,
					emailVerified: true,
					role: "ADMIN",
					organizationId: quanbyOrg.id,
				})
				.returning()
			if (user) {
				quanbyAdmin = user
				await createBetterAuthAccount(db, user.id, user.email, "admin123")

				const existingAdminInfo = await db.query.adminInfos.findFirst({
					where: (adminInfos, { eq }) => eq(adminInfos.userId, user.id),
				})
				if (!existingAdminInfo) {
					await db.insert(adminInfos).values({
						userId: user.id,
						firstName: "Sarah",
						middleName: "Elizabeth",
						lastName: "Johnson",
						gender: "FEMALE",
						dateOfBirth: new Date("1985-06-15"),
						contactNumber: "+1-555-0101",
						address: "123 Healthcare Blvd, Medical City, MC 12345",
						bio: "Experienced healthcare administrator",
						department: "Administration",
						position: "Administrative Manager",
						employeeId: "ADM-001",
					})
				}
			}
		}

		// Organization Admin - Metro
		let metroAdmin = await db.query.users.findFirst({
			where: (users, { eq }) => eq(users.email, "admin@metrogeneral.com"),
		})

		if (!metroAdmin && metroOrg) {
			const [user] = await db
				.insert(users)
				.values({
					name: "Michael Williams",
					email: "admin@metrogeneral.com",
					password: adminPassword,
					emailVerified: true,
					role: "ADMIN",
					organizationId: metroOrg.id,
				})
				.returning()
			if (user) {
				metroAdmin = user
				await createBetterAuthAccount(db, user.id, user.email, "admin123")

				const existingAdminInfo = await db.query.adminInfos.findFirst({
					where: (adminInfos, { eq }) => eq(adminInfos.userId, user.id),
				})
				if (!existingAdminInfo) {
					await db.insert(adminInfos).values({
						userId: user.id,
						firstName: "Michael",
						lastName: "Williams",
						gender: "MALE",
						dateOfBirth: new Date("1980-03-20"),
						contactNumber: "+1-555-0202",
						address: "456 Hospital Ave, Metro City, MC 67890",
						bio: "Healthcare operations specialist",
						department: "Administration",
						position: "Administrative Director",
						employeeId: "ADM-002",
					})
				}
			}
		}

		// Get doctor categories for assigning
		const cardiologistCategory = await db.query.doctorCategories.findFirst({
			where: (categories, { eq }) => eq(categories.name, "Cardiologist"),
		})
		const dermatologistCategory = await db.query.doctorCategories.findFirst({
			where: (categories, { eq }) => eq(categories.name, "Dermatologist"),
		})

		// Doctor - Quanby
		let quanbyDoctor = await db.query.users.findFirst({
			where: (users, { eq }) => eq(users.email, "doctor@quanbyhealthcare.com"),
		})

		if (!quanbyDoctor && quanbyOrg && cardiologistCategory) {
			const [user] = await db
				.insert(users)
				.values({
					name: "Dr. John Smith",
					email: "doctor@quanbyhealthcare.com",
					password: doctorPassword,
					emailVerified: true,
					role: "DOCTOR",
					organizationId: quanbyOrg.id,
				})
				.returning()
			if (user) {
				quanbyDoctor = user
				await createBetterAuthAccount(db, user.id, user.email, "doctor123")

				// Assign doctor category
				await db.insert(usersToDoctorCategories).values({
					userId: user.id,
					doctorCategoryId: cardiologistCategory.id,
				})

				// Create doctor info
				const existingDoctorInfo = await db.query.doctorInfos.findFirst({
					where: (doctorInfos, { eq }) => eq(doctorInfos.userId, user.id),
				})
				if (!existingDoctorInfo) {
					await db.insert(doctorInfos).values({
						userId: user.id,
						firstName: "John",
						middleName: "Robert",
						lastName: "Smith",
						gender: "MALE",
						dateOfBirth: new Date("1975-05-10"),
						contactNumber: "+1-555-0303",
						address: "789 Medical St, Medical City, MC 12345",
						bio: "Experienced cardiologist with 15+ years of practice",
						specialization: "Cardiology",
						qualifications: "MD, Cardiology Board Certified",
						experience: 15,
						licenseNumber: "MD-12345",
					})
				}
			}
		}

		// Patient
		let testPatient = await db.query.users.findFirst({
			where: (users, { eq }) => eq(users.email, "patient@example.com"),
		})

		if (!testPatient) {
			const [user] = await db
				.insert(users)
				.values({
					name: "Jane Doe",
					email: "patient@example.com",
					password: patientPassword,
					emailVerified: true,
					role: "PATIENT",
				})
				.returning()
			if (user) {
				testPatient = user
				await createBetterAuthAccount(db, user.id, user.email, "patient123")

				const existingPatientInfo = await db.query.patientInfos.findFirst({
					where: (patientInfos, { eq }) => eq(patientInfos.userId, user.id),
				})
				if (!existingPatientInfo) {
					await db.insert(patientInfos).values({
						userId: user.id,
						firstName: "Jane",
						middleName: "Marie",
						lastName: "Doe",
						gender: "FEMALE",
						dateOfBirth: new Date("1990-08-25"),
						contactNumber: "+1-555-0404",
						address: "321 Patient Ave, Health City, HC 54321",
						weight: 65.5,
						height: 165.0,
						bloodType: "O+",
					})
				}
			}
		}

		console.log("✅ Users seeded successfully")

		// Seed Appointment Requests
		console.log("📅 Seeding appointment requests...")
		if (quanbyOrg && quanbyDoctor && testPatient) {
			// Create multiple patients for more realistic data
			const patients = [testPatient]

			// Create additional patients
			for (let i = 1; i <= 5; i++) {
				const existingPatient = await db.query.users.findFirst({
					where: (users, { eq }) => eq(users.email, `patient${i}@example.com`),
				})

				if (!existingPatient) {
					const [newPatient] = await db
						.insert(users)
						.values({
							name: `Patient ${i}`,
							email: `patient${i}@example.com`,
							password: patientPassword,
							emailVerified: true,
							role: "PATIENT",
							organizationId: quanbyOrg.id,
						})
						.returning()

					if (newPatient) {
						await createBetterAuthAccount(db, newPatient.id, newPatient.email, "patient123")

						const bloodTypes = ["A+", "B+", "O+", "AB+", "A-", "B-", "O-", "AB-"]
						const selectedBloodType = bloodTypes[i % bloodTypes.length] || "O+"

						await db.insert(patientInfos).values({
							userId: newPatient.id,
							firstName: `Patient`,
							lastName: `${i}`,
							gender: i % 2 === 0 ? "FEMALE" : "MALE",
							dateOfBirth: new Date(`199${i}-0${i}-15`),
							contactNumber: `+1-555-050${i}`,
							address: `${100 + i} Patient Lane, Health City, HC 5432${i}`,
							weight: 60 + i * 5,
							height: 160 + i * 2,
							bloodType: selectedBloodType,
						})

						patients.push(newPatient)
					}
				} else {
					patients.push(existingPatient)
				}
			}

			// Create appointments with different statuses across different time periods
			type AppointmentStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "REJECTED" | "RESCHEDULED"
			const appointmentStatuses: AppointmentStatus[] = ["COMPLETED", "COMPLETED", "COMPLETED", "PENDING", "CANCELLED"]
			const now = new Date()

			for (let i = 0; i < 20; i++) {
				const patient = patients[i % patients.length]
				if (!patient) continue
				const status = appointmentStatuses[i % appointmentStatuses.length]

				// Distribute appointments across last 90 days
				const daysAgo = Math.floor(Math.random() * 90)
				const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)

				const existingAppointment = await db.query.appointmentRequests.findFirst({
					where: (appointments, { and, eq }) =>
						and(
							eq(appointments.patientId, patient.id),
							eq(appointments.doctorId, quanbyDoctor.id)
						),
				})

				if (!existingAppointment || i > 0) {
					await db.insert(appointmentRequests).values({
						patientId: patient.id,
						doctorId: quanbyDoctor.id,
						requestedDate: new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
						requestedTime: `${9 + (i % 8)}:00`,
						reason: `Routine checkup ${i + 1}`,
						status,
						createdAt,
						updatedAt: createdAt,
					})
				}
			}
			console.log("✅ Appointment requests seeded")

			// Seed Consultations
			console.log("💬 Seeding consultations...")
			for (let i = 0; i < 15; i++) {
				const patient = patients[i % patients.length]
				if (!patient) continue

				// Distribute consultations across last 60 days
				const daysAgo = Math.floor(Math.random() * 60)
				const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)

				const existingConsultation = await db.query.consultations.findFirst({
					where: (consultations, { and, eq }) =>
						and(
							eq(consultations.patientId, patient.id),
							eq(consultations.doctorId, quanbyDoctor.id)
						),
				})

				if (!existingConsultation || i > 0) {
					await db.insert(consultations).values({
						patientId: patient.id,
						doctorId: quanbyDoctor.id,
						startTime: createdAt,
						endTime: new Date(createdAt.getTime() + 30 * 60 * 1000),
						consultationCode: `CONS-${Date.now()}-${i}`,
						isPublic: false,
						notes: `Medical concern ${i + 1}`,
						diagnosis: `Diagnosis ${i + 1}`,
						treatment: `Treatment plan ${i + 1}`,
						createdAt,
						updatedAt: createdAt,
					})
				}
			}
			console.log("✅ Consultations seeded")
		}

		console.log("✅ Users seeded successfully")
		console.log("🎉 Database seeding completed successfully!")

		console.log("\n📋 Test Credentials:")
		console.log("  Super Admin: superadmin@qhealth.com / superadmin123")
		console.log("  Admin: admin@quanbyhealthcare.com / admin123")
		console.log("  Doctor: doctor@quanbyhealthcare.com / doctor123")
		console.log("  Patient: patient@example.com / patient123")
	} catch (error) {
		console.error("❌ Error seeding database:", error)
		throw error
	} finally {
		await pool.end()
	}
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
	seed()
		.then(() => {
			console.log("✅ Seed script completed")
			process.exit(0)
		})
		.catch((error) => {
			console.error("❌ Seed script failed:", error)
			process.exit(1)
		})
}

export { seed }
