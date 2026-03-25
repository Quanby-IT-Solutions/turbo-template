import { headers } from "next/headers"

/**
 * Collects the raw Cookie header from the current request.
 * Useful when proxying auth requests to the backend so that Better Auth
 * can read the same cookies that the browser sent to Next.js.
 */
export async function getCookieHeader(): Promise<string> {
	const headerList = await headers()
	return headerList.get("cookie") ?? ""
}
