import "server-only"

import { cache } from "react"

import { MePermissionsSchema, type MePermissions } from "@repo/contracts"

import { getCookieHeader } from "@/core/lib/cookie-utils"
import { getServerApiUrl } from "@/core/lib/server-utils"

type AccessErrorReason = "request-failed" | "invalid-response"

export type AccessResult =
	| ({ status: "loaded" } & MePermissions)
	| {
			status: "error"
			roles: []
			permissions: []
			error: AccessErrorReason
	  }

function accessError(error: AccessErrorReason): AccessResult {
	return {
		status: "error",
		roles: [],
		permissions: [],
		error,
	}
}

export const getAccess = cache(async (): Promise<AccessResult> => {
	try {
		const cookieHeader = await getCookieHeader()

		const response = await fetch(`${getServerApiUrl()}/me/permissions`, {
			headers: {
				"Content-Type": "application/json",
				"cookie": cookieHeader,
			},
			cache: "no-store",
		})

		if (!response.ok) {
			return accessError("request-failed")
		}

		const parsed = MePermissionsSchema.safeParse(await response.json())

		if (!parsed.success) {
			return accessError("invalid-response")
		}

		return {
			status: "loaded",
			...parsed.data,
		}
	} catch {
		return accessError("request-failed")
	}
})
