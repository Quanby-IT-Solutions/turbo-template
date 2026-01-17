/**
 * Medical Records API
 */

import { apiRequest } from "@/services/api/client"
import type { ApiResponse } from "@/services/api/types"

export type MedicalRecordType =
	| "CONSULTATION_NOTES"
	| "DIAGNOSIS"
	| "TREATMENT_PLAN"
	| "MEDICATION"
	| "LAB_RESULTS"
	| "IMAGING_RESULTS"
	| "ALLERGIES"
	| "CHRONIC_CONDITIONS"
	| "SURGICAL_HISTORY"
	| "FAMILY_HISTORY"
	| "LIFESTYLE"
	| "VACCINATIONS"

export interface MedicalRecord {
	id: string
	patientId: string
	consultationId?: string | null
	recordType: string
	title: string
	content: string
	isPublic: boolean
	isSensitive: boolean
	createdBy: string
	createdAt: string
	updatedAt: string
}

export interface MedicalRecordQuery {
	patientId?: string
	recordType?: string
	limit?: number
	offset?: number
}

export const medicalRecordsApi = {
	list: async (query: MedicalRecordQuery): Promise<ApiResponse<MedicalRecord[]>> => {
		const params = new URLSearchParams()
		if (query.patientId) params.set("patientId", query.patientId)
		if (query.recordType) params.set("recordType", query.recordType)
		if (typeof query.limit === "number") params.set("limit", String(query.limit))
		if (typeof query.offset === "number") params.set("offset", String(query.offset))

		const qs = params.toString()
		return apiRequest<MedicalRecord[]>(`/v1/medical-records${qs ? `?${qs}` : ""}`, {
			method: "GET",
		})
	},
}

