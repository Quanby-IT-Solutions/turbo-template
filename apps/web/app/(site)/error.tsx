"use client"

import { startTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/core/components/ui/button"

/**
 * Shown for any error in the `(site)` subtree.
 * A signed-out visitor is still redirected to `/login` before this can render.
 *
 * `reset()` only re-renders the client boundary, so the button also refreshes
 * the server tree. Otherwise the error screen stays up after the API returns.
 */
export default function SiteError({
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) {
	const router = useRouter()

	return (
		<section
			className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center"
			data-testid="session-unavailable"
			role="alert"
		>
			<h1 className="text-xl font-semibold">Something went wrong loading this page. Try again.</h1>
			<Button
				type="button"
				onClick={() => {
					startTransition(() => {
						router.refresh()
						reset()
					})
				}}
			>
				Try again
			</Button>
		</section>
	)
}
