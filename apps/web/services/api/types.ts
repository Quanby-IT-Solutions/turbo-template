/**
 * Shared types and interfaces for API
 */

export interface ApiResponse<T = unknown> {
	success: boolean
	message: string
	data?: T
	error?: string
	errors?: string[] // Array of validation errors
}

export type SubscriptionTierName = "FREE" | "BASIC" | "PREMIUM" | "ENTERPRISE" | "T"

export interface User {
	id: string
	email: string
	role: string
	firstName?: string
	lastName?: string
	[key: string]: unknown
}

export interface BetterAuthSession {
	id?: string
	token?: string
	userId: string
	expiresAt: string
	[key: string]: unknown
}

export interface AuthResponse {
	user: User
	session: BetterAuthSession
	sessionToken?: string // Session token for API calls (if not using cookies)
}

export interface RegisterRequest {
	email: string
	password: string
	role: string
	subscriptionTier?: SubscriptionTierName
	firstName?: string
	middleName?: string
	lastName?: string
	website?: string
	fullName?: string // Deprecated: Use firstName/lastName for patients
	specialization?: string
	qualifications?: string
	experience?: number
	gender?: string
	dateOfBirth?: string
	contactNumber?: string
	address?: string
	bio?: string
	weight?: number
	height?: number
	bloodType?: string
	prcId?: string
	ptrId?: string
	medicalLicenseLevel?: string
	philHealthAccreditation?: string
	licenseNumber?: string
	licenseExpiry?: string
	prcIdImage?: string
	ptrIdImage?: string
	medicalLicenseImage?: string
	additionalIdImages?: string[]
}

export interface DoctorInfo {
	firstName: string
	middleName?: string
	lastName: string
	specialization: string
	qualifications: string
	experience: number
	contactNumber: string
	approvalStatus: "PENDING" | "APPROVED" | "REJECTED"
	approvalRejectionReason?: string
}

export interface Doctor {
	id: string
	email: string
	organizationId?: string
	doctorInfo: DoctorInfo
}

export interface DoctorListResponse {
	items: Doctor[]
	total: number
	page: number
	limit: number
	totalPages: number
}

export interface AppointmentRequest {
	id: string
	patientId: string
	doctorId: string
	requestedDate: string
	requestedTime: string
	reason: string
	status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "RESCHEDULED"
	priority: "LOW" | "NORMAL" | "HIGH" | "URGENT"
	notes?: string
	createdAt: string
	updatedAt: string
	patient?: {
		id: string
		email: string
		patientInfo?: {
			firstName: string
			middleName?: string | null
			lastName: string
			fullName?: string // Deprecated: computed from firstName/lastName
			contactNumber?: string
		}
	}
	doctor?: {
		id: string
		email: string
		doctorInfo?: {
			firstName: string
			lastName: string
			specialization: string
		}
	}
	consultation?: {
		id: string
		startTime: string
		endTime?: string
	}
	rescheduleRequests?: RescheduleRequest[]
}

export interface AppointmentListResponse {
	data: AppointmentRequest[]
	pagination: {
		page: number
		limit: number
		total: number
		pages: number
	}
}

export interface CreateAppointmentRequest {
	patientId: string
	doctorId: string
	requestedDate: string // ISO date string
	requestedTime: string // HH:MM format
	reason: string
	priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT"
	notes?: string
}

export interface RescheduleRequestInput {
	newDate: string // ISO string
	newTime: string // HH:MM
	reason: string
	notes?: string
}

export interface RescheduleRequest {
	id: string
	appointmentId: string
	requestedBy: string
	requestedByRole: string
	currentDate?: string // Original date before reschedule
	currentTime?: string // Original time before reschedule
	newDate: string
	newTime: string
	reason: string
	notes?: string
	status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"
	createdAt: string
	updatedAt: string
}

export interface DoctorAvailability {
	dayOfWeek: string
	isAvailable: boolean
	startTime: string // HH:MM format
	endTime: string // HH:MM format
}

export interface DocumentUploadResponse {
	path: string
	url: string
	storageType: string
	fileName: string
	fileSize: number
	fileType: string
}
