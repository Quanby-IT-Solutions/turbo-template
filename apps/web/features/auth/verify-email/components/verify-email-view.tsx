"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { Cancel01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { buttonVariants } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { FieldGroup } from "@/core/components/ui/field"
import { Spinner } from "@/core/components/ui/spinner"
import { useRateLimitCountdown } from "@/core/hooks/use-rate-limit-countdown"
import { parseRateLimitError } from "@/core/lib/rate-limit-utils"
import { cn } from "@/core/lib/utils"
import { RateLimitBanner } from "@/features/auth/components/rate-limit-banner"

import { useVerifyEmailMutation } from "../api/verify-email.hooks"
import { ResendVerificationForm } from "./resend-verification-form"

interface VerifyEmailViewProps {
	token: string | null
}

export function VerifyEmailView({ token }: VerifyEmailViewProps) {
	const { mutateAsync: verify, isSuccess, isError, error } = useVerifyEmailMutation()

	// A 429 must render its own rate-limit state — the token may still be valid
	// after the retry window, so it must NOT fall through to the expired-link UI.
	const rateLimit = parseRateLimitError(error)
	const { secondsLeft } = useRateLimitCountdown(rateLimit.isRateLimit ? rateLimit.retryAfter : null)

	// Single-use tokens must only be submitted once. Strict-mode double mount
	// would otherwise consume the token twice, making valid links look expired.
	const submittedTokenRef = useRef<string | null>(null)

	useEffect(() => {
		if (token && submittedTokenRef.current !== token) {
			submittedTokenRef.current = token
			verify({ token }).catch(() => {
				// Error state handled via isError.
			})
		}
	}, [token, verify])

	// Verifying (in progress or idle before the effect fires — as long as we have a
	// token and it has neither succeeded nor failed yet).
	if (token && !isSuccess && !isError) {
		return (
			<VerifyCard>
				<Spinner className="text-muted-foreground size-10" />
				<Heading>Verifying your email…</Heading>
				<Subtext>Hang tight while we confirm your link.</Subtext>
			</VerifyCard>
		)
	}

	// Success
	if (isSuccess) {
		return (
			<VerifyCard>
				<HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-10 text-emerald-500" />
				<Heading>Email verified</Heading>
				<Subtext>Your email address has been confirmed.</Subtext>
				<Link href="/login" className={cn(buttonVariants(), "w-full")}>
					Continue to login
				</Link>
			</VerifyCard>
		)
	}

	// Rate limited (429) — distinct from an expired link. The token may still be
	// valid; the correct recovery is to wait out the window, not to resend.
	if (isError && rateLimit.isRateLimit) {
		return (
			<VerifyCard>
				<HugeiconsIcon icon={Cancel01Icon} className="text-destructive size-10" />
				<Heading>Too many attempts</Heading>
				<Subtext>
					You&apos;ve tried to verify too many times. Please wait before trying again.
				</Subtext>
				<div className="w-full text-left">
					<RateLimitBanner message={rateLimit.message} secondsLeft={secondsLeft} />
				</div>
			</VerifyCard>
		)
	}

	// Expired / invalid (no token, or verification failed)
	return (
		<VerifyCard>
			<HugeiconsIcon icon={Cancel01Icon} className="text-destructive size-10" />
			<Heading>Link expired</Heading>
			<Subtext>This verification link is invalid or has expired. Request a new one below.</Subtext>
			<div className="w-full text-left">
				<ResendVerificationForm />
			</div>
		</VerifyCard>
	)
}

function VerifyCard({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-6">
			<Card>
				<CardContent className="p-6 md:p-8">
					<FieldGroup className="items-center text-center">{children}</FieldGroup>
				</CardContent>
			</Card>
		</div>
	)
}

function Heading({ children }: { children: React.ReactNode }) {
	return <h1 className="text-2xl font-bold">{children}</h1>
}

function Subtext({ children }: { children: React.ReactNode }) {
	return <p className="text-muted-foreground text-balance">{children}</p>
}
