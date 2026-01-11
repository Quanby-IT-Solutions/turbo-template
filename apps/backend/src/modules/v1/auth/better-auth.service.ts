import { Inject, Injectable } from "@nestjs/common"

import { auth } from "@repo/auth"
import { adminInfos, doctorInfos, patientInfos, users } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"
import { eq } from "drizzle-orm"

@Injectable()
export class BetterAuthService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	getAuthInstance() {
		return auth
	}

	async handleRequest(req: any, res: any) {
		// Better Auth handler is async and handles Express request/response
		const handler = auth.handler as any
		if (handler.length === 1) {
			return handler(req)
		} else {
			return handler(req, res)
		}
	}

	// Helper method to get user with related info (compatible with existing code)
	async getUserWithInfo(userId: string) {
		const [user] = await this.db
			.select()
			.from(users)
			.where(eq(users.id, userId))
			.limit(1)

		if (!user) {
			return null
		}

		// Get related info
		const [doctorInfo] =
			user.role === "DOCTOR"
				? await this.db.select().from(doctorInfos).where(eq(doctorInfos.userId, userId)).limit(1)
				: [null]

		const [patientInfo] =
			user.role === "PATIENT"
				? await this.db.select().from(patientInfos).where(eq(patientInfos.userId, userId)).limit(1)
				: [null]

		const [adminInfo] =
			user.role === "ADMIN"
				? await this.db.select().from(adminInfos).where(eq(adminInfos.userId, userId)).limit(1)
				: [null]

		return {
			userId: user.id,
			id: user.id,
			email: user.email,
			role: user.role,
			organizationId: user.organizationId,
			doctorInfo: doctorInfo || null,
			patientInfo: patientInfo || null,
			adminInfo: adminInfo || null,
		}
	}
}
