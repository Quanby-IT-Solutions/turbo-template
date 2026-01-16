import {  ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import { and, desc, eq, inArray } from "drizzle-orm"

import { labRequests, organizations, patientInfos, users } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"
import { CreateLabRequestDto, LabRequestQueryDto } from "@repo/contracts"

@Injectable()
export class LabRequestsService {
	constructor(@Inject(DB) private readonly db: DBType) {}
	  private serializeLabRequest(labRequest: any) {
    return {
      ...labRequest,
      createdAt: labRequest.createdAt.toISOString(),
      updatedAt: labRequest.updatedAt.toISOString(),
    };
  }

async findAll() {
		return this.db.select().from(labRequests)
	}

	  async findOne(id: string) {
    const [labRequest] = await this.db
      .select()
      .from(labRequests)
      .where(eq(labRequests.id, id))
      .limit(1);

    if (!labRequest) {
      throw new NotFoundException(`Lab request with ID ${id} not found`);
    }

    return this.serializeLabRequest(labRequest);
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

			return {
				...request,
				patientName: patient
					? `${patient.patientFirstName || ""} ${patient.patientMiddleName || ""} ${patient.patientLastName || ""}`.trim()
					: null,
				organizationName: org?.name || null,
			}
		})
	}

async getPatientLabRequests(patientId: string, query: LabRequestQueryDto) {
  const { organizationId, status, page = 1, limit = 10 } = query;

  const conditions = [eq(labRequests.patientId, patientId)];

  if (organizationId) {
    conditions.push(eq(labRequests.organizationId, organizationId));
  }

  if (status) {
    conditions.push(eq(labRequests.status, status));
  }

  const whereClause = and(...conditions);

  const results = await this.db
    .select()
    .from(labRequests)
    .where(whereClause)
    .orderBy(desc(labRequests.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  // Serialize dates to ISO strings
  return results.map(result => ({
    ...result,
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  }));
}

  async create(data: CreateLabRequestDto, user: any) {
    const userId = user?.userId || user?.id;

    if (!data.organizationId) {
      throw new ForbiddenException('Organization ID is required');
    }

    if (!data.patientId) {
      throw new ForbiddenException('Patient ID is required');
    }

    const [result] = await this.db
      .insert(labRequests)
      .values({
        patientId: data.patientId,
        organizationId: data.organizationId,
        doctorId: data.doctorId || null,
        note: data.note || null,
        requestedTests: data.requestedTests || null,
        instructions: data.instructions || null,
        status: 'PENDING',
        priority: data.priority || 'NORMAL',
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return this.serializeLabRequest(result);
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

    return this.serializeLabRequest(updated);
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.db
      .delete(labRequests)
      .where(eq(labRequests.id, id));
  }
}
