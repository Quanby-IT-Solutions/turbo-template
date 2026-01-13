"use client"

import * as React from "react"
import { IconCheck, IconEdit, IconUpload, IconUser, IconX } from "@tabler/icons-react"
import { toast } from "sonner"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"
import { patientsApi } from "@/features/patients/api/patients-api"
import type { User } from "@/services/api/types"
import type { PatientInfoType } from "@/features/patients/types/patients-types"

type PersonalInfoCardProps = {
	user: User | null
	patientInfo: PatientInfoType | null
	onRefresh: () => Promise<void>
}

export function PersonalInfoCard({ user, patientInfo, onRefresh }: PersonalInfoCardProps) {
	const [isEditing, setIsEditing] = React.useState(false)
	const [saving, setSaving] = React.useState(false)
	const [uploading, setUploading] = React.useState(false)

	// Form state
	const [firstName, setFirstName] = React.useState("")
	const [middleName, setMiddleName] = React.useState("")
	const [lastName, setLastName] = React.useState("")
	const [gender, setGender] = React.useState("")
	const [dateOfBirth, setDateOfBirth] = React.useState("")
	const [contactNumber, setContactNumber] = React.useState("")
	const [address, setAddress] = React.useState("")
	const [weight, setWeight] = React.useState("")
	const [height, setHeight] = React.useState("")
	const [bloodType, setBloodType] = React.useState("")
	const [medicalHistory, setMedicalHistory] = React.useState("")
	const [allergies, setAllergies] = React.useState("")
	const [medications, setMedications] = React.useState("")
	const [profilePicture, setProfilePicture] = React.useState<string | null>(null)
	const [profilePictureFile, setProfilePictureFile] = React.useState<File | null>(null)

	// Initialize form when patientInfo changes
	React.useEffect(() => {
		if (patientInfo) {
			setFirstName(patientInfo.firstName || "")
			setMiddleName(patientInfo.middleName || "")
			setLastName(patientInfo.lastName || "")
			setGender(patientInfo.gender || "")
			setDateOfBirth(
				patientInfo.dateOfBirth
					? new Date(patientInfo.dateOfBirth).toISOString().split("T")[0]
					: ""
			)
			setContactNumber(patientInfo.contactNumber || "")
			setAddress(patientInfo.address || "")
			setWeight(patientInfo.weight?.toString() || "")
			setHeight(patientInfo.height?.toString() || "")
			setBloodType(patientInfo.bloodType || "")
			setMedicalHistory(patientInfo.medicalHistory || "")
			setAllergies(patientInfo.allergies || "")
			setMedications(patientInfo.medications || "")
		}
		if (user?.profilePicture) {
			setProfilePicture(
				typeof user.profilePicture === "string" ? user.profilePicture : null
			)
		}
	}, [patientInfo, user])

	const handleFileUpload = async (file: File) => {
		if (!file.type.startsWith("image/")) {
			toast.error("Please upload an image file")
			return
		}

		if (file.size > 5 * 1024 * 1024) {
			toast.error("File size must be less than 5MB")
			return
		}

		setUploading(true)
		try {
			const reader = new FileReader()
			reader.onloadend = () => {
				const base64String = reader.result as string
				setProfilePicture(base64String)
				setProfilePictureFile(file)
				toast.success("Image uploaded successfully")
			}
			reader.onerror = () => {
				toast.error("Failed to read file")
				setUploading(false)
			}
			reader.readAsDataURL(file)
		} catch (error) {
			toast.error("Failed to upload image")
			console.error("Error uploading image:", error)
		} finally {
			setUploading(false)
		}
	}

	const handleSave = async () => {
		if (!user) return

		setSaving(true)
		try {
			const updateData: Record<string, unknown> = {}
			
			// Only include fields that have values
			if (firstName.trim()) updateData.firstName = firstName.trim()
			if (middleName.trim()) updateData.middleName = middleName.trim()
			if (lastName.trim()) updateData.lastName = lastName.trim()
			if (gender) updateData.gender = gender
			
			// Convert date to ISO datetime format
			if (dateOfBirth) {
				const date = new Date(dateOfBirth)
				updateData.dateOfBirth = date.toISOString()
			}
			
			if (contactNumber.trim()) updateData.contactNumber = contactNumber.trim()
			if (address.trim()) updateData.address = address.trim()
			
			// Parse numbers carefully
			const weightNum = parseFloat(weight)
			if (!isNaN(weightNum) && weightNum > 0) updateData.weight = weightNum
			
			const heightNum = parseFloat(height)
			if (!isNaN(heightNum) && heightNum > 0) updateData.height = heightNum
			
			if (bloodType) updateData.bloodType = bloodType
			if (medicalHistory.trim()) updateData.medicalHistory = medicalHistory.trim()
			if (allergies.trim()) updateData.allergies = allergies.trim()
			if (medications.trim()) updateData.medications = medications.trim()
			
			// Only include profile picture if it was changed
			if (profilePictureFile) {
				updateData.profilePicture = profilePicture
			}

			const response = await patientsApi.updatePatient(user.id, updateData)
			if (response.success) {
				toast.success("Profile updated successfully")
				setIsEditing(false)
				setProfilePictureFile(null)
				await onRefresh()
			} else {
				toast.error(response.message || "Failed to update profile")
				console.error("Update failed:", response)
			}
		} catch (error) {
			toast.error("An error occurred while updating profile")
			console.error("Error updating profile:", error)
		} finally {
			setSaving(false)
		}
	}

	const handleCancel = () => {
		setIsEditing(false)
		if (user && patientInfo) {
			setFirstName(patientInfo.firstName || "")
			setMiddleName(patientInfo.middleName || "")
			setLastName(patientInfo.lastName || "")
			setGender(patientInfo.gender || "")
			setDateOfBirth(
				patientInfo.dateOfBirth
					? new Date(patientInfo.dateOfBirth).toISOString().split("T")[0]
					: ""
			)
			setContactNumber(patientInfo.contactNumber || "")
			setAddress(patientInfo.address || "")
			setWeight(patientInfo.weight?.toString() || "")
			setHeight(patientInfo.height?.toString() || "")
			setBloodType(patientInfo.bloodType || "")
			setMedicalHistory(patientInfo.medicalHistory || "")
			setAllergies(patientInfo.allergies || "")
			setMedications(patientInfo.medications || "")
			setProfilePicture(
				typeof user.profilePicture === "string" ? user.profilePicture : null
			)
			setProfilePictureFile(null)
		}
	}

	const fullName = patientInfo
		? `${patientInfo.firstName || ""} ${patientInfo.middleName || ""} ${patientInfo.lastName || ""}`.trim()
		: "Patient"

	const age = patientInfo?.dateOfBirth
		? Math.floor(
				(new Date().getTime() - new Date(patientInfo.dateOfBirth).getTime()) /
					(1000 * 60 * 60 * 24 * 365.25)
			)
		: null

	return (
		<>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="mb-2 text-2xl font-bold">My Profile</h1>
					<p className="text-muted-foreground text-sm">Manage your personal information</p>
				</div>
				{!isEditing ? (
					<Button onClick={() => setIsEditing(true)}>
						<IconEdit className="mr-2 h-4 w-4" />
						Edit Profile
					</Button>
				) : (
					<div className="flex gap-2">
						<Button variant="outline" onClick={handleCancel} disabled={saving}>
							<IconX className="mr-2 h-4 w-4" />
							Cancel
						</Button>
						<Button onClick={handleSave} disabled={saving}>
							<IconCheck className="mr-2 h-4 w-4" />
							{saving ? "Saving..." : "Save Changes"}
						</Button>
					</div>
				)}
			</div>

			<Card className="mb-6">
				<CardHeader>
					<CardTitle>Personal Information</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="mb-6 flex items-start gap-6">
						<div className="relative">
							<div className="bg-muted flex h-24 w-24 items-center justify-center overflow-hidden rounded-full">
								{profilePicture ? (
									<img
										src={profilePicture}
										alt="Profile"
										className="h-full w-full object-cover"
									/>
								) : (
									<IconUser className="text-muted-foreground h-12 w-12" />
								)}
							</div>
							{isEditing && (
								<label
									htmlFor="profile-picture-upload"
									className="absolute right-0 bottom-0 cursor-pointer"
								>
									<div className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-8 w-8 items-center justify-center rounded-full transition-colors">
										<IconUpload className="h-4 w-4" />
									</div>
									<input
										id="profile-picture-upload"
										type="file"
										accept="image/*"
										className="hidden"
										onChange={e => {
											const file = e.target.files?.[0]
											if (file) handleFileUpload(file)
										}}
									/>
								</label>
							)}
						</div>
						<div className="flex-1">
							<h3 className="mb-1 text-lg font-semibold">{fullName}</h3>
							<p className="text-muted-foreground text-sm">{user?.email}</p>
							{isEditing && profilePictureFile && (
								<p className="text-muted-foreground mt-1 text-xs">
									{profilePictureFile.name}
								</p>
							)}
						</div>
					</div>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div>
							<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
								FIRST NAME
							</Label>
							{isEditing ? (
								<Input
									value={firstName}
									onChange={e => setFirstName(e.target.value)}
									placeholder="First name"
								/>
							) : (
								<p className="text-sm">{patientInfo?.firstName || "—"}</p>
							)}
						</div>
						<div>
							<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
								MIDDLE NAME
							</Label>
							{isEditing ? (
								<Input
									value={middleName}
									onChange={e => setMiddleName(e.target.value)}
									placeholder="Middle name"
								/>
							) : (
								<p className="text-sm">{patientInfo?.middleName || "—"}</p>
							)}
						</div>
						<div>
							<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
								LAST NAME
							</Label>
							{isEditing ? (
								<Input
									value={lastName}
									onChange={e => setLastName(e.target.value)}
									placeholder="Last name"
								/>
							) : (
								<p className="text-sm">{patientInfo?.lastName || "—"}</p>
							)}
						</div>
						<div>
							<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
								EMAIL
							</Label>
							<p className="text-sm">{user?.email || "—"}</p>
						</div>
						<div>
							<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
								PHONE
							</Label>
							{isEditing ? (
								<Input
									value={contactNumber}
									onChange={e => setContactNumber(e.target.value)}
									placeholder="Contact number"
								/>
							) : (
								<p className="text-sm">{patientInfo?.contactNumber || "—"}</p>
							)}
						</div>
						<div>
							<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
								DATE OF BIRTH
							</Label>
							{isEditing ? (
								<Input
									type="date"
									value={dateOfBirth}
									onChange={e => setDateOfBirth(e.target.value)}
								/>
							) : (
								<p className="text-sm">
									{patientInfo?.dateOfBirth
										? `${new Date(patientInfo.dateOfBirth).toLocaleDateString()}${age ? ` (${age} years old)` : ""}`
										: "—"}
								</p>
							)}
						</div>
						{isEditing && (
							<>
								<div>
									<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
										GENDER
									</Label>
									<Select value={gender} onValueChange={setGender}>
										<SelectTrigger>
											<SelectValue placeholder="Select gender" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="MALE">Male</SelectItem>
											<SelectItem value="FEMALE">Female</SelectItem>
											<SelectItem value="OTHER">Other</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
										ADDRESS
									</Label>
									<Input
										value={address}
										onChange={e => setAddress(e.target.value)}
										placeholder="Address"
									/>
								</div>
								<div>
									<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
										WEIGHT (kg)
									</Label>
									<Input
										type="number"
										value={weight}
										onChange={e => setWeight(e.target.value)}
										placeholder="Weight"
									/>
								</div>
								<div>
									<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
										HEIGHT (cm)
									</Label>
									<Input
										type="number"
										value={height}
										onChange={e => setHeight(e.target.value)}
										placeholder="Height"
									/>
								</div>
								<div>
									<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
										BLOOD TYPE
									</Label>
									<Select value={bloodType} onValueChange={setBloodType}>
										<SelectTrigger>
											<SelectValue placeholder="Select blood type" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="O+">O+</SelectItem>
											<SelectItem value="O-">O-</SelectItem>
											<SelectItem value="A+">A+</SelectItem>
											<SelectItem value="A-">A-</SelectItem>
											<SelectItem value="B+">B+</SelectItem>
											<SelectItem value="B-">B-</SelectItem>
											<SelectItem value="AB+">AB+</SelectItem>
											<SelectItem value="AB-">AB-</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</>
						)}
					</div>
				</CardContent>
			</Card>

			{(isEditing || medicalHistory || allergies || medications) && (
				<Card className="mb-6">
					<CardHeader>
						<CardTitle>Medical Information</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 gap-4">
							<div>
								<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
									MEDICAL HISTORY
								</Label>
								{isEditing ? (
									<Textarea
										value={medicalHistory}
										onChange={e => setMedicalHistory(e.target.value)}
										placeholder="Medical history"
										rows={4}
									/>
								) : (
									<p className="text-sm whitespace-pre-wrap">
										{patientInfo?.medicalHistory || "—"}
									</p>
								)}
							</div>
							<div>
								<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
									ALLERGIES
								</Label>
								{isEditing ? (
									<Textarea
										value={allergies}
										onChange={e => setAllergies(e.target.value)}
										placeholder="Allergies"
										rows={3}
									/>
								) : (
									<p className="text-sm whitespace-pre-wrap">
										{patientInfo?.allergies || "—"}
									</p>
								)}
							</div>
							<div>
								<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
									MEDICATIONS
								</Label>
								{isEditing ? (
									<Textarea
										value={medications}
										onChange={e => setMedications(e.target.value)}
										placeholder="Current medications"
										rows={3}
									/>
								) : (
									<p className="text-sm whitespace-pre-wrap">
										{patientInfo?.medications || "—"}
									</p>
								)}
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</>
	)
}