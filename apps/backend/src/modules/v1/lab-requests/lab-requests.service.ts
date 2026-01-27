import { Inject, Injectable, InternalServerErrorException } from "@nestjs/common"
import { eq, inArray } from "drizzle-orm"

import { labRequests, organizations, patientInfos, patientMedicalHistories, users } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"
import { CreateLabRequestDto, LabRequestQueryDto } from "@repo/contracts"

@Injectable()
export class LabRequestsService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	private serialize(r: any) {
		if (!r) return r;
		const toIso = (v: any) => (v instanceof Date ? v.toISOString() : v);
		return {
			...r,
			requestedTests: r.requestedTests ?? "",
			createdAt: toIso(r.createdAt),
			updatedAt: toIso(r.updatedAt),
		};
	}

	async findAll() {
		const rows = await this.db.select().from(labRequests)
		return rows.map(r => this.serialize(r))
	}

	async findOne(id: string) {
		const [result] = await this.db
			.select()
			.from(labRequests)
			.where(eq(labRequests.id, id))
			.limit(1)
		return this.serialize(result)
	}

	async getDoctorLabRequests(doctorId: string) {
		const requests = await this.db
			.select()
			.from(labRequests)
			.where(eq(labRequests.doctorId, doctorId))

		// Get patient and organization info for each request
		const patientIds = [
			...new Set(requests.map(r => r.patientId).filter((id): id is string => id !== null)),
		]
		const orgIds = [
			...new Set(requests.map(r => r.organizationId).filter((id): id is string => id !== null)),
		]

		// Fetch patients and organizations in parallel
		const [patientsData, orgsData] = await Promise.all([
			patientIds.length > 0
				? this.db
						.select({
							userId: users.id,
							patientFirstName: patientInfos.firstName,
							patientMiddleName: patientInfos.middleName,
							patientLastName: patientInfos.lastName,
						})
						.from(users)
						.innerJoin(patientInfos, eq(users.id, patientInfos.userId))
						.where(inArray(users.id, patientIds))
				: [],
			orgIds.length > 0
				? this.db
						.select({
							id: organizations.id,
							name: organizations.name,
						})
						.from(organizations)
						.where(inArray(organizations.id, orgIds))
				: [],
		])

		type PatientData = {
			userId: string
			patientFirstName: string | null
			patientMiddleName: string | null
			patientLastName: string | null
		}
		type OrgData = {
			id: string
			name: string
		}

		const patientsMap = new Map<string, PatientData>(
			patientsData.map((p): [string, PatientData] => [p.userId, p])
		)
		const orgsMap = new Map<string, OrgData>(orgsData.map((o): [string, OrgData] => [o.id, o]))

		// Format requests with patient and organization names
		return requests.map(request => {
			const patient = request.patientId ? patientsMap.get(request.patientId) : undefined
			const org = request.organizationId ? orgsMap.get(request.organizationId) : undefined

			return this.serialize({
				...request,
				patientName: patient
					? `${patient.patientFirstName || ""} ${patient.patientMiddleName || ""} ${patient.patientLastName || ""}`.trim()
					: null,
				organizationName: org?.name || null,
			})
		})
	}

	async getPatientLabRequests(patientId: string) {
		const requests = await this.db
			.select()
			.from(labRequests)
			.where(eq(labRequests.patientId, patientId))

		return requests.map(r => this.serialize(r))
	}

	async getRoomLabRequests(roomId: string) {
		const rows = await this.db
			.select()
			.from(labRequests)
			.where(eq(labRequests.roomId, roomId))
		return rows.map(r => this.serialize(r))
	}

	async create(data: any) {
		const [result] = await this.db
			.insert(labRequests)
			.values({
				patientId: data.patientId,
				organizationId: data.organizationId,
				doctorId: data.doctorId || null,
				roomId: data.roomId || null,
				note: data.note || null,
				status: data.status || "PENDING",
				priority: data.priority || "NORMAL",
				requestedTests: data.requestedTests || null,
				instructions: data.instructions || null,
				createdBy: data.createdBy || data.doctorId,
				updatedBy: data.updatedBy || data.doctorId || null,
			})
			.returning()

		if (!result) {
			throw new InternalServerErrorException("Failed to create lab request")
		}

		// Populate patient medical records (for patient history screens)
		// We use recordType "LAB_RESULTS" as the closest bucket for lab-related entries.
		try {
			await this.db.insert(patientMedicalHistories).values({
				patientId: result.patientId,
				consultationId: null,
				recordType: "LAB_RESULTS",
				title: "Lab Request",
				content: JSON.stringify({
					roomId: result.roomId,
					labRequestId: result.id,
					priority: result.priority,
					status: result.status,
					requestedTests: result.requestedTests,
					instructions: result.instructions,
					note: result.note,
					organizationId: result.organizationId,
					doctorId: result.doctorId,
				}),
				isPublic: false,
				isSensitive: false,
				createdBy: result.createdBy ?? result.doctorId ?? data.createdBy,
			})
		} catch {
			// If medical record insert fails, don't block lab request creation.
		}

		return this.serialize(result)
	}

	async update(id: string, updateDto: Partial<CreateLabRequestDto>, user: any) {
		const userId = user?.userId || user?.id;
		
		await this.findOne(id);

		const [updated] = await this.db
			.update(labRequests)
			.set({
				...updateDto,
				updatedBy: userId,
				updatedAt: new Date(),
			})
			.where(eq(labRequests.id, id))
			.returning();

		return this.serialize(updated);
	}

	async remove(id: string) {
		await this.findOne(id);

		await this.db
			.delete(labRequests)
			.where(eq(labRequests.id, id));
	}
}
