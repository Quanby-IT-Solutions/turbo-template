export type PatientInfoType = {
	firstName?: string
	middleName?: string | null
	lastName?: string
	gender?: string
	dateOfBirth?: string
	contactNumber?: string
	address?: string
	weight?: number
	height?: number
	bloodType?: string
	medicalHistory?: string | null
	allergies?: string | null
	medications?: string | null
	philHealthId?: string | null
	philHealthStatus?: string
	philHealthCategory?: string
	philHealthExpiry?: string
	philHealthMemberSince?: string
	philHealthIdImage?: string | null
	verificationStatus?: string
	verificationRejectionReason?: string | null
}
