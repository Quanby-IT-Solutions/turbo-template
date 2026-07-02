"use client"

import { useState } from "react"
import Image from "next/image"
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
	FieldSeparator,
} from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import { useRateLimitCountdown } from "@/core/hooks/use-rate-limit-countdown"
import { parseRateLimitError } from "@/core/lib/rate-limit-utils"
import { cn } from "@/core/lib/utils"
import { PasswordInput } from "@/features/auth/components/password-input"
import { RateLimitBanner } from "@/features/auth/components/rate-limit-banner"
import { SocialLoginButtons } from "@/features/auth/components/social-login-buttons"
import { TermsPrivacyNote } from "@/features/auth/components/terms-privacy-note"
import { ResendVerificationForm } from "@/features/auth/verify-email/components/resend-verification-form"

import { UnverifiedEmailError, useLoginMutation } from "../api/login.hooks"
import { LoginSchema } from "../api/login.schema"

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
	const [showResend, setShowResend] = useState(false)
	const { mutateAsync: login, isPending, isError, error } = useLoginMutation()

	const isUnverified = error instanceof UnverifiedEmailError
	const rateLimit = parseRateLimitError(error)
	const { secondsLeft, isActive } = useRateLimitCountdown(
		rateLimit.isRateLimit ? rateLimit.retryAfter : null
	)

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		validators: {
			onSubmit: LoginSchema,
		},
		onSubmit: async ({ value }) => {
			await login(value)
		},
	})

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card className="overflow-hidden p-0">
				<CardContent className="grid p-0 md:grid-cols-2">
					<form
						className="p-6 md:p-8"
						onSubmit={e => {
							e.preventDefault()
							form.handleSubmit()
						}}
					>
						<FieldGroup>
							<div className="flex flex-col items-center gap-2 text-center">
								<h1 className="text-2xl font-bold">Welcome back</h1>
								<p className="text-muted-foreground text-balance">Login to your account</p>
							</div>

							{isError && isUnverified && (
								<div className="bg-destructive/10 text-destructive dark:bg-destructive/20 flex flex-col items-start gap-1 rounded-lg p-3 text-sm">
									<span>Please verify your email before signing in.</span>
									<Button
										type="button"
										variant="link"
										className="text-destructive h-auto px-0"
										onClick={() => setShowResend(true)}
									>
										Resend verification email
									</Button>
								</div>
							)}

							{isError && !isUnverified && rateLimit.isRateLimit && (
								<RateLimitBanner message={rateLimit.message} secondsLeft={secondsLeft} />
							)}

							{isError && !isUnverified && !rateLimit.isRateLimit && (
								<div className="bg-destructive/10 text-destructive dark:bg-destructive/20 rounded-lg p-3 text-sm">
									{error instanceof Error ? error.message : "An unexpected error occurred"}
								</div>
							)}

							{showResend && isUnverified && (
								<ResendVerificationForm prefillEmail={(error as UnverifiedEmailError).email} />
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

							<form.Field
								name="password"
								children={field => {
									const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
									return (
										<Field data-invalid={isInvalid}>
											<div className="flex items-center">
												<FieldLabel htmlFor={field.name}>Password</FieldLabel>
												<Link
													href="/forgot-password"
													className={cn(
														buttonVariants({ size: "sm", variant: "link" }),
														"text-card-foreground ml-auto h-auto"
													)}
												>
													Forgot your password?
												</Link>
											</div>
											<PasswordInput
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={e => field.handleChange(e.target.value)}
												aria-invalid={isInvalid}
												required
												autoComplete="current-password"
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
											? "Signing in..."
											: "Login"}
								</Button>
							</Field>

							<FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
								Or continue with
							</FieldSeparator>

							<SocialLoginButtons action="login" />

							<FieldDescription className="text-center">
								Don&apos;t have an account?{" "}
								<Link
									className={cn(
										buttonVariants({ variant: "link" }),
										"text-muted-foreground h-auto px-0"
									)}
									href="/register"
								>
									Sign up
								</Link>
							</FieldDescription>
						</FieldGroup>
					</form>
					<div className="bg-muted relative hidden md:block">
						<Image
							src="/placeholder.svg"
							alt="Image"
							fill
							className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
						/>
					</div>
				</CardContent>
			</Card>
			<TermsPrivacyNote />
		</div>
	)
}
