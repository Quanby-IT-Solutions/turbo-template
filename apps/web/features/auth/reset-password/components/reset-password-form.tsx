"use client"

import Link from "next/link"
import { useForm } from "@tanstack/react-form"

import { Button, buttonVariants } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/core/components/ui/field"
import { useRateLimitCountdown } from "@/core/hooks/use-rate-limit-countdown"
import { parseRateLimitError } from "@/core/lib/rate-limit-utils"
import { cn } from "@/core/lib/utils"
import { PasswordInput } from "@/features/auth/components/password-input"
import { RateLimitBanner } from "@/features/auth/components/rate-limit-banner"

import { useResetPasswordMutation } from "../api/reset-password.hooks"
import { ResetPasswordSchema } from "../api/reset-password.schema"

interface ResetPasswordFormProps extends React.ComponentProps<"div"> {
	token: string | null
}

function isTokenError(message: string) {
	const lower = message.toLowerCase()
	return lower.includes("invalid") || lower.includes("expired") || lower.includes("token")
}

export function ResetPasswordForm({ token, className, ...props }: ResetPasswordFormProps) {
	const {
		mutateAsync: resetPassword,
		isPending,
		isError,
		isSuccess,
		error,
	} = useResetPasswordMutation()
	const rateLimit = parseRateLimitError(error)
	const { secondsLeft, isActive } = useRateLimitCountdown(
		rateLimit.isRateLimit ? rateLimit.retryAfter : null
	)

	const form = useForm({
		defaultValues: {
			newPassword: "",
			confirmPassword: "",
		},
		validators: {
			onSubmit: ResetPasswordSchema,
		},
		onSubmit: async ({ value }) => {
			if (!token) return
			await resetPassword({ newPassword: value.newPassword, token })
		},
	})

	// No token in the URL — nothing to reset.
	if (!token) {
		return <InvalidTokenCard className={className} {...props} />
	}

	const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
	const showRecoveryLink = isError && isTokenError(errorMessage)

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardContent className="p-6 md:p-8">
					<form
						onSubmit={e => {
							e.preventDefault()
							form.handleSubmit()
						}}
					>
						<FieldGroup>
							<div className="flex flex-col items-center gap-2 text-center">
								<h1 className="text-2xl font-bold">Reset password</h1>
								<p className="text-muted-foreground text-balance">
									Choose a new password for your account
								</p>
							</div>

							{isSuccess && (
								<div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
									Password reset. Redirecting to login…
								</div>
							)}

							{isError && rateLimit.isRateLimit && (
								<RateLimitBanner message={rateLimit.message} secondsLeft={secondsLeft} />
							)}

							{isError && !rateLimit.isRateLimit && (
								<div className="bg-destructive/10 text-destructive dark:bg-destructive/20 rounded-lg p-3 text-sm">
									{errorMessage}
									{showRecoveryLink && (
										<>
											{" "}
											<Link href="/forgot-password" className="font-medium underline">
												Request a new link
											</Link>
										</>
									)}
								</div>
							)}

							<form.Field
								name="newPassword"
								children={field => {
									const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>New password</FieldLabel>
											<PasswordInput
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={e => field.handleChange(e.target.value)}
												aria-invalid={isInvalid}
												required
												autoComplete="new-password"
												disabled={isPending}
											/>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									)
								}}
							/>

							<form.Field
								name="confirmPassword"
								children={field => {
									const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Confirm password</FieldLabel>
											<PasswordInput
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={e => field.handleChange(e.target.value)}
												aria-invalid={isInvalid}
												required
												autoComplete="new-password"
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
											? "Resetting..."
											: "Reset password"}
								</Button>
							</Field>

							<FieldDescription className="text-center">
								<Link
									className={cn(
										buttonVariants({ variant: "link" }),
										"text-muted-foreground h-auto px-0"
									)}
									href="/login"
								>
									Back to login
								</Link>
							</FieldDescription>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}

function InvalidTokenCard({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardContent className="p-6 md:p-8">
					<FieldGroup className="text-center">
						<h1 className="text-2xl font-bold">Invalid reset link</h1>
						<p className="text-muted-foreground text-balance">
							This password reset link is invalid or has expired. Request a new one to continue.
						</p>
						<Link href="/forgot-password" className={cn(buttonVariants(), "w-full")}>
							Request a new link
						</Link>
					</FieldGroup>
				</CardContent>
			</Card>
		</div>
	)
}
