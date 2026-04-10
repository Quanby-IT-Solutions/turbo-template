import { cache } from "react"

import { getApiUrl } from "@/core/lib/utils"

/**
 * Better Auth routes live under `/api/{version}/auth` on the backend.
 * Reuse the shared API URL helper so everything resolves from the same base.
 */
export const getAuthUrl = cache(() => {
	const apiUrl = getApiUrl()
	return `${apiUrl}/auth`
})
