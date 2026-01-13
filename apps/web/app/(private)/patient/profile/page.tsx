"use client"

import * as React from "react"
import { IconCheck, IconEdit, IconFileText, IconUpload, IconUser, IconX } from "@tabler/icons-react"
import { toast } from "sonner"

import { RoleHeader } from "@/core/components/role-header"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { SidebarInset, SidebarProvider } from "@/core/components/ui/sidebar"
import { Textarea } from "@/core/components/ui/textarea"
import type { User } from "@/services/api/types"
import { authApi } from "@/features/auth/api/auth-api"
import { patientsApi } from "@/features/patients/api/patients-api"
import { useEffect } from "react"

type UserProfileType = {
	id: string
	email: string
	name: string
	profilePicture?: string
}

type PatientInfoType = {
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
}

export default function ProfilePage() {
	const [user, setUser] = React.useState<User | null>(null)
	const [loading, setLoading] = React.useState(true)
	const [patientInfo, setPatientInfo] = React.useState<PatientInfoType | null>(null)
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
	const [philHealthId, setPhilHealthId] = React.useState("")
	const [philHealthStatus, setPhilHealthStatus] = React.useState("")
	const [philHealthCategory, setPhilHealthCategory] = React.useState("")
	const [philHealthExpiry, setPhilHealthExpiry] = React.useState("")
	const [philHealthMemberSince, setPhilHealthMemberSince] = React.useState("")
	const [philHealthIdImage, setPhilHealthIdImage] = React.useState<string | null>(null)
	const [philHealthIdImageFile, setPhilHealthIdImageFile] = React.useState<File | null>(null)
	const [profilePicture, setProfilePicture] = React.useState<string | null>(null)
	const [profilePictureFile, setProfilePictureFile] = React.useState<File | null>(null)
	const [viewImageDialogOpen, setViewImageDialogOpen] = React.useState(false)

	useEffect(() => {
  if (patientInfo) {
    setFirstName(patientInfo.firstName || '')
    setLastName(patientInfo.lastName || '')
    setMiddleName(patientInfo.middleName || '')
		setGender(patientInfo.gender || '')
		setDateOfBirth(patientInfo.dateOfBirth || '')
		setContactNumber(patientInfo.contactNumber || '')
		setAddress(patientInfo.address || '')
		setWeight(patientInfo.weight?.toString() || '')
		setHeight(patientInfo.height?.toString() || '')
		setBloodType(patientInfo.bloodType || '')
		setMedicalHistory(patientInfo.medicalHistory || '')
		setAllergies(patientInfo.allergies || '')
		setMedications(patientInfo.medications || '')
		setPhilHealthId(patientInfo.philHealthId || '')
		setPhilHealthStatus(patientInfo.philHealthStatus || '')
		setPhilHealthCategory(patientInfo.philHealthCategory || '')
		setPhilHealthExpiry(patientInfo.philHealthExpiry || '')
		setPhilHealthMemberSince(patientInfo.philHealthMemberSince || '')
		setPhilHealthIdImage(patientInfo.philHealthIdImage || null)
  }
}, [patientInfo])


	// Fetch user profile
	React.useEffect(() => {
		fetchProfile()
	}, [])

	const fetchProfile = async () => {
		setLoading(true)
		try {
			const response = await authApi.getProfile()
			if (response.success && response.data) {
				setUser(response.data)
				setProfilePicture(
					typeof response.data.profilePicture === "string" ? response.data.profilePicture : null
				)

				if (response.data.id) {
					fetchPatientInfo(response.data.id)
				}
			} else {
				toast.error(response.message || "Failed to fetch profile")
			}
		} catch (error) {
			toast.error("An error occurred while fetching profile")
			console.error("Error fetching profile:", error)
		} finally {
			setLoading(false)
		}
	}

	const fetchPatientInfo = async (patientId: string) => {
		setLoading(true)
		try {
			const response = await patientsApi.getPatientById(patientId)
			console.log("Patient info API response:", response)
			if (response.success && response.data) {
				setPatientInfo(response.data.patientInfo ?? null)
			} else {
				toast.error(response.message || "Failed to fetch patient info")
			}
		} catch (error) {
			toast.error("An error occurred while fetching patient info")
			console.error("Error fetching patient info:", error)
		} finally {
			setLoading(false)
		}
	}

	const handleFileUpload = async (file: File, type: "philhealth" | "profile") => {
		if (!file.type.startsWith("image/")) {
			toast.error("Please upload an image file")
			return
		}

		if (file.size > 5 * 1024 * 1024) {
			// 5MB limit
			toast.error("File size must be less than 5MB")
			return
		}

		setUploading(true)
		try {
			const reader = new FileReader()
			reader.onloadend = () => {
				const base64String = reader.result as string
				if (type === "philhealth") {
					setPhilHealthIdImage(base64String)
					setPhilHealthIdImageFile(file)
				} else {
					setProfilePicture(base64String)
					setProfilePictureFile(file)
				}
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
			if (firstName.trim()) updateData.firstName = firstName.trim()
			if (middleName.trim()) updateData.middleName = middleName.trim()
			if (lastName.trim()) updateData.lastName = lastName.trim()
			if (gender) updateData.gender = gender
			if (dateOfBirth) updateData.dateOfBirth = dateOfBirth
			if (contactNumber.trim()) updateData.contactNumber = contactNumber.trim()
			if (address.trim()) updateData.address = address.trim()
			if (weight) updateData.weight = parseFloat(weight)
			if (height) updateData.height = parseFloat(height)
			if (bloodType) updateData.bloodType = bloodType
			if (medicalHistory.trim()) updateData.medicalHistory = medicalHistory.trim()
			if (allergies.trim()) updateData.allergies = allergies.trim()
			if (medications.trim()) updateData.medications = medications.trim()
			if (philHealthId.trim()) updateData.philHealthId = philHealthId.trim()
			if (philHealthStatus) updateData.philHealthStatus = philHealthStatus
			if (philHealthCategory) updateData.philHealthCategory = philHealthCategory
			if (philHealthExpiry) updateData.philHealthExpiry = philHealthExpiry
			if (philHealthMemberSince) updateData.philHealthMemberSince = philHealthMemberSince

			// Include profile picture if it exists
			if (profilePicture !== null && profilePicture !== undefined) {
				updateData.profilePicture = profilePicture || null
			}

			// Always include image if it exists (even if empty string, send null to clear it)
			if (philHealthIdImage !== null && philHealthIdImage !== undefined) {
				updateData.philHealthIdImage = philHealthIdImage || null
			}

			const response = await patientsApi.updatePatient(user.id, updateData)
			if (response.success) {
				toast.success("Profile updated successfully")
				setIsEditing(false)

				// Update user state with response data if available
				if (response.data) {
					const updatedData = response.data as any
					if (updatedData.patientInfo) {
						// Update PhilHealth ID image from response - validate it's a string
						if (updatedData.patientInfo.philHealthIdImage !== undefined) {
							const imageValue = updatedData.patientInfo.philHealthIdImage
							if (
								imageValue &&
								typeof imageValue === "string" &&
								(imageValue.startsWith("data:") || imageValue.startsWith("data:image"))
							) {
								setPhilHealthIdImage(imageValue)
							} else if (imageValue === null || imageValue === "") {
								setPhilHealthIdImage(null)
							} else {
								console.warn("Invalid philHealthIdImage in response:", typeof imageValue)
								setPhilHealthIdImage(null)
							}
						}
					}
					if (updatedData.profilePicture !== undefined) {
						const profilePicValue = updatedData.profilePicture
						if (
							profilePicValue &&
							typeof profilePicValue === "string" &&
							(profilePicValue.startsWith("data:") || profilePicValue.startsWith("data:image"))
						) {
							setProfilePicture(profilePicValue)
						} else if (profilePicValue === null || profilePicValue === "") {
							setProfilePicture(null)
						} else {
							console.warn("Invalid profilePicture in response:", typeof profilePicValue)
							setProfilePicture(null)
						}
					}
					// Update user object
					if (updatedData) {
						setUser(prev => (prev ? { ...prev, ...updatedData } : null))
					}
				}

				// Refresh profile data to ensure everything is in sync
				await fetchProfile()

				// Clear file references after successful save
				setPhilHealthIdImageFile(null)
				setProfilePictureFile(null)
			} else {
				toast.error(response.message || "Failed to update profile")
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
		if (user) {
			// Reset profile picture
			setProfilePicture((user.profilePicture as string | null) || null)
			setProfilePictureFile(null)

			if (user.patientInfo) {
				const patientInfo = user.patientInfo as PatientInfoType
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
				setPhilHealthId(patientInfo.philHealthId || "")
				setPhilHealthStatus(patientInfo.philHealthStatus || "")
				setPhilHealthCategory(patientInfo.philHealthCategory || "")
				setPhilHealthExpiry(
					patientInfo.philHealthExpiry
						? new Date(patientInfo.philHealthExpiry).toISOString().split("T")[0]
						: ""
				)
				setPhilHealthMemberSince(
					patientInfo.philHealthMemberSince
						? new Date(patientInfo.philHealthMemberSince).toISOString().split("T")[0]
						: ""
				)
				setPhilHealthIdImage(patientInfo.philHealthIdImage || null)
				setPhilHealthIdImageFile(null)
			}
		}
	}

	const getStatusBadge = (status: string | undefined) => {
		if (!status) return null

		switch (status.toUpperCase()) {
			case "VERIFIED":
				return (
					<Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-green-700">
						VERIFIED
					</Badge>
				)
			case "PENDING":
				return (
					<Badge
						variant="outline"
						className="border-yellow-500/20 bg-yellow-500/10 text-yellow-700"
					>
						PENDING
					</Badge>
				)
			case "REJECTED":
				return (
					<Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-700">
						REJECTED
					</Badge>
				)
			case "NOT_VERIFIED":
			default:
				return (
					<Badge variant="outline" className="border-gray-500/20 bg-gray-500/10 text-gray-700">
						NOT VERIFIED
					</Badge>
				)
		}
	}

	if (loading) {
		return (
			<SidebarProvider
				style={
					{
						"--sidebar-width": "calc(var(--spacing) * 72)",
						"--header-height": "calc(var(--spacing) * 12)",
					} as React.CSSProperties
				}
			>
				<SidebarWrapper role="patient" variant="inset" />
				<SidebarInset>
					<RoleHeader title="My Profile" description="Manage your personal information" />
					<div className="flex flex-1 flex-col items-center justify-center p-8">
						<p className="text-muted-foreground">Loading profile...</p>
					</div>
				</SidebarInset>
			</SidebarProvider>
		)
	}

	const info = patientInfo as PatientInfoType | undefined

	const fullName = info
		? `${info.firstName || ""} ${info.middleName || ""} ${info.lastName || ""}`.trim()
		: "Patient"

	const age = info?.dateOfBirth
		? Math.floor(
				(new Date().getTime() - new Date(info.dateOfBirth).getTime()) /
					(1000 * 60 * 60 * 24 * 365.25)
			)
		: null

	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "calc(var(--spacing) * 72)",
					"--header-height": "calc(var(--spacing) * 12)",
				} as React.CSSProperties
			}
		>
			<SidebarWrapper role="patient" variant="inset" />
			<SidebarInset>
				<RoleHeader title="My Profile" description="Manage your personal information" />
				<div className="flex flex-1 flex-col">
					<div className="@container/main flex flex-1 flex-col gap-2">
						<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
							<div className="px-4 lg:px-6">
								{/* Header with Edit Profile button */}
								<div className="mb-6 flex items-center justify-between">
									<div>
										<h1 className="mb-2 text-2xl font-bold">My Profile</h1>
										<p className="text-muted-foreground text-sm">
											Manage your personal information
										</p>
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

								{/* Personal Information */}
								<Card className="mb-6">
									<CardHeader>
										<CardTitle>Personal Information</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="mb-6 flex items-start gap-6">
											<div className="relative">
												<div className="bg-muted flex h-24 w-24 items-center justify-center overflow-hidden rounded-full">
													{profilePicture ? (
														// eslint-disable-next-line @next/next/no-img-element
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
																if (file) {
																	handleFileUpload(file, "profile")
																}
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

								{/* PhilHealth Information */}
								<Card className="mb-6">
									<CardHeader>
										<CardTitle>PhilHealth Information</CardTitle>
										<CardDescription>
											Your PhilHealth membership details and identification
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
											<div>
												<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
													PHILHEALTH ID
												</Label>
												{isEditing ? (
													<Input
														value={philHealthId}
														onChange={e => setPhilHealthId(e.target.value)}
														placeholder="PhilHealth ID"
													/>
												) : (
													<p className="text-sm">{patientInfo?.philHealthId || "—"}</p>
												)}
											</div>
											<div>
												<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
													STATUS
												</Label>
												{isEditing ? (
													<Input
														value={philHealthStatus}
														onChange={e => setPhilHealthStatus(e.target.value)}
														placeholder="Status"
													/>
												) : (
													<p className="text-sm">{patientInfo?.philHealthStatus || "—"}</p>
												)}
											</div>
											<div>
												<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
													CATEGORY
												</Label>
												{isEditing ? (
													<Input
														value={philHealthCategory}
														onChange={e => setPhilHealthCategory(e.target.value)}
														placeholder="Category"
													/>
												) : (
													<p className="text-sm">{patientInfo?.philHealthCategory || "—"}</p>
												)}
											</div>
											{isEditing && (
												<>
													<div>
														<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
															MEMBER SINCE
														</Label>
														<Input
															type="date"
															value={philHealthMemberSince}
															onChange={e => setPhilHealthMemberSince(e.target.value)}
														/>
													</div>
													<div>
														<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
															EXPIRY DATE
														</Label>
														<Input
															type="date"
															value={philHealthExpiry}
															onChange={e => setPhilHealthExpiry(e.target.value)}
														/>
													</div>
												</>
											)}
											{!isEditing && (
												<>
													<div>
														<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
															MEMBER SINCE
														</Label>
														<p className="text-sm">
															{patientInfo?.philHealthMemberSince
																? new Date(patientInfo.philHealthMemberSince).toLocaleDateString()
																: "—"}
														</p>
													</div>
													<div>
														<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
															EXPIRY DATE
														</Label>
														<p className="text-sm">
															{patientInfo?.philHealthExpiry
																? new Date(patientInfo.philHealthExpiry).toLocaleDateString()
																: "—"}
														</p>
													</div>
												</>
											)}
										</div>
										<div className="border-t pt-6">
											<Label className="text-muted-foreground mb-4 block text-xs font-semibold uppercase">
												PHILHEALTH ID DOCUMENT
											</Label>
											<div className="flex items-center gap-4">
												<div
													className={`border-muted-foreground/25 bg-muted/50 flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed ${
														!isEditing && philHealthIdImage
															? "cursor-pointer transition-opacity hover:opacity-80"
															: ""
													}`}
													onClick={() => {
														if (!isEditing && philHealthIdImage) {
															setViewImageDialogOpen(true)
														}
													}}
												>
													{philHealthIdImage &&
													typeof philHealthIdImage === "string" &&
													philHealthIdImage.startsWith("data:") ? (
														// eslint-disable-next-line @next/next/no-img-element
														<img
															src={philHealthIdImage}
															alt="PhilHealth ID"
															className="h-full w-full object-cover"
															onError={e => {
																console.error("Failed to load PhilHealth ID image:", e)
																// Reset to null if image fails to load
																setPhilHealthIdImage(null)
															}}
														/>
													) : (
														<IconFileText className="text-muted-foreground h-8 w-8" />
													)}
												</div>
												<div className="flex-1">
													<p className="text-muted-foreground mb-2 text-sm">
														Upload your PhilHealth ID document (Image)
													</p>
													{isEditing ? (
														<div className="flex items-center gap-2">
															<label htmlFor="philhealth-upload">
																<Button
																	variant="outline"
																	size="sm"
																	type="button"
																	disabled={uploading}
																	asChild
																>
																	<span>
																		<IconUpload className="mr-2 h-4 w-4" />
																		{uploading
																			? "Uploading..."
																			: philHealthIdImageFile
																				? "Change Document"
																				: "Upload Document"}
																	</span>
																</Button>
																<input
																	id="philhealth-upload"
																	type="file"
																	accept="image/*"
																	className="hidden"
																	onChange={e => {
																		const file = e.target.files?.[0]
																		if (file) {
																			handleFileUpload(file, "philhealth")
																		}
																	}}
																/>
															</label>
															{philHealthIdImage && (
																<Badge
																	variant="outline"
																	className="border-green-500/20 bg-green-500/10 text-green-700"
																>
																	Uploaded
																</Badge>
															)}
														</div>
													) : (
														<div className="flex items-center gap-2">
															{philHealthIdImage &&
																typeof philHealthIdImage === "string" &&
																philHealthIdImage.startsWith("data:") && (
																	<Badge
																		variant="outline"
																		className="border-green-500/20 bg-green-500/10 text-green-700"
																	>
																		Uploaded
																	</Badge>
																)}
															{patientInfo?.philHealthIdVerified && (
																<Badge
																	variant="outline"
																	className="border-blue-500/20 bg-blue-500/10 text-blue-700"
																>
																	Verified
																</Badge>
															)}
														</div>
													)}
													{philHealthIdImageFile && (
														<p className="text-muted-foreground mt-2 text-xs">
															{philHealthIdImageFile.name}
														</p>
													)}
												</div>
											</div>
										</div>
									</CardContent>
								</Card>

								{/* Medical Information (only in edit mode or if has data) */}
								{(isEditing || medicalHistory || allergies || medications) && (
									<Card className="mb-6">
										<CardHeader>
											<CardTitle>Medical Information</CardTitle>
											<CardDescription>
												Your medical history and related information
											</CardDescription>
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

								{/* System Information */}
								<Card>
									<CardHeader>
										<CardTitle>System Information</CardTitle>
										<CardDescription>Your account status and system details</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
											<div>
												<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
													ACCOUNT STATUS
												</Label>
												<Badge
													variant="outline"
													className="border-green-500/20 bg-green-500/10 text-green-700"
												>
													ACTIVE
												</Badge>
											</div>
											<div>
												<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
													VERIFICATION STATUS
												</Label>
												{getStatusBadge(patientInfo?.verificationStatus)}
												{patientInfo?.verificationStatus === "REJECTED" &&
													patientInfo?.verificationRejectionReason && (
														<p className="mt-1 text-xs text-red-600">
															{patientInfo.verificationRejectionReason}
														</p>
													)}
											</div>
											<div>
												<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
													ACCOUNT CREATED
												</Label>
												<p className="text-sm">
													{user?.createdAt
														? new Date(user.createdAt as string | Date).toLocaleDateString()
														: "—"}
												</p>
											</div>
										</div>
									</CardContent>
								</Card>
							</div>
						</div>
					</div>
				</div>
			</SidebarInset>

			{/* View Image Dialog */}
			<Dialog open={viewImageDialogOpen} onOpenChange={setViewImageDialogOpen}>
				<DialogContent className="max-h-[90vh] max-w-4xl overflow-auto">
					<DialogHeader>
						<DialogTitle>PhilHealth ID Document</DialogTitle>
						<DialogDescription>
							{patientInfo && (
								<span>
									Document for {patientInfo.firstName} {patientInfo.lastName}
								</span>
							)}
						</DialogDescription>
					</DialogHeader>
					<div className="bg-muted/50 flex min-h-[400px] items-center justify-center rounded-lg py-4">
						{philHealthIdImage &&
						typeof philHealthIdImage === "string" &&
						philHealthIdImage.startsWith("data:") ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								src={philHealthIdImage}
								alt="PhilHealth ID Document"
								className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-lg"
								onError={e => {
									console.error("Failed to load PhilHealth ID image in dialog:", e)
								}}
							/>
						) : (
							<div className="text-muted-foreground">No document available</div>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setViewImageDialogOpen(false)
							}}
						>
							Close
						</Button>
						{philHealthIdImage && patientInfo && (
							<Button
								variant="outline"
								onClick={() => {
									if (philHealthIdImage) {
										const link = document.createElement("a")
										link.href = philHealthIdImage
										const fileName = `philhealth-id-${patientInfo.firstName}-${patientInfo.lastName}.png`
										link.download = fileName
										document.body.appendChild(link)
										link.click()
										document.body.removeChild(link)
									}
								}}
							>
								Download
							</Button>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</SidebarProvider>
	)
}
