"use client"

import * as React from "react"
import { IconCheck, IconEdit, IconFileText, IconUpload, IconX } from "@tabler/icons-react"
import { toast } from "sonner"
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
import { patientsApi } from "@/features/patients/api/patients-api"
import type { User } from "@/services/api/types"
import type { PatientInfoType } from "@/features/patients/types/patients-types"

type PhilHealthInfoCardProps = {
	user: User | null
	patientInfo: PatientInfoType | null
	onRefresh: () => Promise<void>
}

export function PhilHealthInfoCard({ user, patientInfo, onRefresh }: PhilHealthInfoCardProps) {
	const [isEditing, setIsEditing] = React.useState(false)
	const [saving, setSaving] = React.useState(false)
	const [uploading, setUploading] = React.useState(false)
	const [viewImageDialogOpen, setViewImageDialogOpen] = React.useState(false)

	// Form state
	const [philHealthId, setPhilHealthId] = React.useState("")
	const [philHealthStatus, setPhilHealthStatus] = React.useState("")
	const [philHealthCategory, setPhilHealthCategory] = React.useState("")
	const [philHealthExpiry, setPhilHealthExpiry] = React.useState("")
	const [philHealthMemberSince, setPhilHealthMemberSince] = React.useState("")
	const [philHealthIdImage, setPhilHealthIdImage] = React.useState<string | null>(null)
	const [philHealthIdImageFile, setPhilHealthIdImageFile] = React.useState<File | null>(null)

	// Initialize form when patientInfo changes
	React.useEffect(() => {
		if (patientInfo) {
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
		}
	}, [patientInfo])

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
				setPhilHealthIdImage(base64String)
				setPhilHealthIdImageFile(file)
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
			if (philHealthId.trim()) updateData.philHealthId = philHealthId.trim()
			if (philHealthStatus) updateData.philHealthStatus = philHealthStatus
			if (philHealthCategory) updateData.philHealthCategory = philHealthCategory
			if (philHealthExpiry) updateData.philHealthExpiry = philHealthExpiry
			if (philHealthMemberSince) updateData.philHealthMemberSince = philHealthMemberSince
			if (philHealthIdImage !== null) updateData.philHealthIdImage = philHealthIdImage || null

			const response = await patientsApi.updatePatient(user.id, updateData)
			if (response.success) {
				toast.success("PhilHealth information updated successfully")
				setIsEditing(false)
				setPhilHealthIdImageFile(null)
				await onRefresh()
			} else {
				toast.error(response.message || "Failed to update PhilHealth information")
			}
		} catch (error) {
			toast.error("An error occurred while updating PhilHealth information")
			console.error("Error updating PhilHealth information:", error)
		} finally {
			setSaving(false)
		}
	}

	const handleCancel = () => {
		setIsEditing(false)
		if (patientInfo) {
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

	return (
		<>
			<Card className="mb-6">
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle>PhilHealth Information</CardTitle>
						<CardDescription>Your PhilHealth membership details and identification</CardDescription>
					</div>
					{!isEditing ? (
						<Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
							<IconEdit className="mr-2 h-4 w-4" />
							Edit
						</Button>
					) : (
						<div className="flex gap-2">
							<Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
								<IconX className="mr-2 h-4 w-4" />
								Cancel
							</Button>
							<Button size="sm" onClick={handleSave} disabled={saving}>
								<IconCheck className="mr-2 h-4 w-4" />
								{saving ? "Saving..." : "Save"}
							</Button>
						</div>
					)}
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
						<div>
							<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
								MEMBER SINCE
							</Label>
							{isEditing ? (
								<Input
									type="date"
									value={philHealthMemberSince}
									onChange={e => setPhilHealthMemberSince(e.target.value)}
								/>
							) : (
								<p className="text-sm">
									{patientInfo?.philHealthMemberSince
										? new Date(patientInfo.philHealthMemberSince).toLocaleDateString()
										: "—"}
								</p>
							)}
						</div>
						<div>
							<Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase">
								EXPIRY DATE
							</Label>
							{isEditing ? (
								<Input
									type="date"
									value={philHealthExpiry}
									onChange={e => setPhilHealthExpiry(e.target.value)}
								/>
							) : (
								<p className="text-sm">
									{patientInfo?.philHealthExpiry
										? new Date(patientInfo.philHealthExpiry).toLocaleDateString()
										: "—"}
								</p>
							)}
						</div>
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
									<img
										src={philHealthIdImage}
										alt="PhilHealth ID"
										className="h-full w-full object-cover"
										onError={e => {
											console.error("Failed to load PhilHealth ID image:", e)
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
											<Button variant="outline" size="sm" type="button" disabled={uploading} asChild>
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
													if (file) handleFileUpload(file)
												}}
											/>
										</label>
										{philHealthIdImage && (
											<Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-green-700">
												Uploaded
											</Badge>
										)}
									</div>
								) : (
									<div className="flex items-center gap-2">
										{philHealthIdImage &&
											typeof philHealthIdImage === "string" &&
											philHealthIdImage.startsWith("data:") && (
												<Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-green-700">
													Uploaded
												</Badge>
											)}
									</div>
								)}
								{philHealthIdImageFile && (
									<p className="text-muted-foreground mt-2 text-xs">{philHealthIdImageFile.name}</p>
								)}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

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
						<Button variant="outline" onClick={() => setViewImageDialogOpen(false)}>
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
		</>
	)
}