"use client"

import { useState } from "react"
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
import { Input } from "@/core/components/ui/input"
import { useRateLimitCountdown } from "@/core/hooks/use-rate-limit-countdown"
import { parseRateLimitError } from "@/core/lib/rate-limit-utils"
import { cn } from "@/core/lib/utils"
import { RateLimitBanner } from "@/features/auth/components/rate-limit-banner"

import { useForgotPasswordMutation } from "../api/forgot-password.hooks"
import { ForgotPasswordSchema } from "../api/forgot-password.schema"

export function ForgotPasswordForm({ className, ...props }: React.ComponentProps<"div">) {
	const [isSubmitted, setIsSubmitted] = useState(false)
	const { mutateAsync: forgotPassword, isPending, isError, error } = useForgotPasswordMutation()
	const rateLimit = parseRateLimitError(error)
	const { secondsLeft, isActive } = useRateLimitCountdown(
		rateLimit.isRateLimit ? rateLimit.retryAfter : null
	)

	const form = useForm({
		defaultValues: {
			email: "",
		},
		validators: {
			onSubmit: ForgotPasswordSchema,
		},
		onSubmit: async ({ value }) => {
			await forgotPassword(value)
			setIsSubmitted(true)
		},
	})

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardContent className="p-6 md:p-8">
					{isSubmitted ? (
						<FieldGroup className="text-center">
							<h1 className="text-2xl font-bold">Check your email</h1>
							<p className="text-muted-foreground text-balance">
								If an account exists for this email, we&apos;ve sent a reset link.
							</p>
							<Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
								Back to login
							</Link>
						</FieldGroup>
					) : (
						<form
							onSubmit={e => {
								e.preventDefault()
								form.handleSubmit()
							}}
						>
							<FieldGroup>
								<div className="flex flex-col items-center gap-2 text-center">
									<h1 className="text-2xl font-bold">Forgot password</h1>
									<p className="text-muted-foreground text-balance">
										Enter your email and we&apos;ll send you a reset link
									</p>
								</div>

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
												: "Send reset link"}
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
					)}
				</CardContent>
			</Card>
		</div>
	)
}
