"use client"

import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { z } from "zod"

import { Button } from "@/core/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import { useRateLimitCountdown } from "@/core/hooks/use-rate-limit-countdown"
import { parseRateLimitError } from "@/core/lib/rate-limit-utils"
import { RateLimitBanner } from "@/features/auth/components/rate-limit-banner"

import { useResendVerificationMutation } from "../api/verify-email.hooks"

const ResendSchema = z.object({
	email: z.email("Please enter a valid email address"),
})

interface ResendVerificationFormProps {
	prefillEmail?: string
}

export function ResendVerificationForm({ prefillEmail }: ResendVerificationFormProps) {
	const [isSubmitted, setIsSubmitted] = useState(false)
	const { mutateAsync: resend, isPending, isError, error } = useResendVerificationMutation()
	const rateLimit = parseRateLimitError(error)
	const { secondsLeft, isActive } = useRateLimitCountdown(
		rateLimit.isRateLimit ? rateLimit.retryAfter : null
	)

	const form = useForm({
		defaultValues: {
			email: prefillEmail ?? "",
		},
		validators: {
			onSubmit: ResendSchema,
		},
		onSubmit: async ({ value }) => {
			await resend(value)
			setIsSubmitted(true)
		},
	})

	if (isSubmitted) {
		return (
			<p className="text-muted-foreground text-sm">
				If that account needs verification, we&apos;ve sent a new link.
			</p>
		)
	}

	return (
		<form
			onSubmit={e => {
				e.preventDefault()
				form.handleSubmit()
			}}
		>
			<FieldGroup>
				{isError && rateLimit.isRateLimit && (
					<RateLimitBanner message={rateLimit.message} secondsLeft={secondsLeft} />
				)}

				{isError && !rateLimit.isRateLimit && (
					<div className="bg-destructive/10 text-destructive dark:bg-destructive/20 rounded-lg p-3 text-sm">
						{error instanceof Error ? error.message : "An unexpected error occurred"}
					</div>
				)}

				<form.Field
					name="email"
					children={field => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Email</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									type="email"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={e => field.handleChange(e.target.value)}
									aria-invalid={isInvalid}
									placeholder="m@example.com"
									autoComplete="email"
									required
									disabled={isPending}
								/>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						)
					}}
				/>

				<Field>
					<Button
						type="submit"
						disabled={isPending || isActive}
						className="w-full hover:cursor-pointer"
					>
						{isActive
							? `Try again in ${secondsLeft}s`
							: isPending
								? "Sending..."
								: "Resend verification email"}
					</Button>
				</Field>
			</FieldGroup>
		</form>
	)
}
