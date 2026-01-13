"use client"

import { Badge } from "@/core/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import type { PatientInfoType } from "@/features/patients/types/patients-types"
import type { User } from "@/services/api/types"

type SystemInfoCardProps = {
	user: User | null
	patientInfo: PatientInfoType | null
}

export function SystemInfoCard({ user, patientInfo }: SystemInfoCardProps) {
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
					<Badge variant="outline" className="border-yellow-500/20 bg-yellow-500/10 text-yellow-700">
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

	return (
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
						<Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-green-700">
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
	)
}