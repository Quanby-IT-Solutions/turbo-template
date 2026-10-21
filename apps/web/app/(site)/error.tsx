"use client"

import { startTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/core/components/ui/button"

/**
 * Shown when a protected route cannot check the session.
 * A signed-out visitor never reaches this screen.
 *
 * The failure is thrown by the Server Component layout. `reset()` only
 * re-renders the client boundary, so the button also refreshes the server
 * tree. Otherwise the error screen stays up after the API returns.
 */
export default function SiteSessionError({
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
			<h1 className="text-xl font-semibold">{"We couldn't check your session. Try again."}</h1>
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
