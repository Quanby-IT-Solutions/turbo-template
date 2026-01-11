"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { cn } from "@/core/lib/utils"
import { Button } from "@/core/components/ui/button"
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
} from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import { toast } from "sonner"

import { authApi } from "../api/auth-api"
import { getDashboardRoute, type UserRole } from "../lib/auth-utils"
import { setSessionToken, setUser } from "@/services/api/client"

export function LoginForm({
	className,
	...props
}: React.ComponentProps<"form">) {
	const router = useRouter()
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		setError(null)
		setIsLoading(true)

		try {
			const response = await authApi.login(email, password)

			if (response.success && response.data) {
				// Store Better Auth session and user data
				// Try multiple possible token locations from backend response
				const sessionToken =
					response.data.sessionToken ||
					response.data.session?.token ||
					response.data.session?.id ||
					response.data.token ||
					response.data.accessToken

				console.log("🔐 Login response received", {
					hasSessionToken: !!response.data.sessionToken,
					hasSession: !!response.data.session,
					hasToken: !!response.data.token,
					hasAccessToken: !!response.data.accessToken,
					sessionTokenLength: sessionToken?.length,
					sessionTokenPrefix: sessionToken?.substring(0, 30),
					sessionId: response.data.session?.id?.substring(0, 30),
					sessionTokenFromSession: response.data.session?.token?.substring(0, 30),
					responseKeys: Object.keys(response.data),
				})

				if (sessionToken) {
					console.log("💾 Storing session token", {
						tokenLength: sessionToken.length,
						tokenPrefix: sessionToken.substring(0, 30),
					})
					setSessionToken(sessionToken)

					// Verify token was stored correctly
					const storedToken =
						typeof window !== "undefined"
							? localStorage.getItem("sessionToken")
							: null
					console.log("✅ Token storage verified", {
						stored: !!storedToken,
						storedLength: storedToken?.length,
						storedPrefix: storedToken?.substring(0, 30),
					})

					// Store full session object if available
					if (response.data.session && typeof window !== "undefined") {
						localStorage.setItem("session", JSON.stringify(response.data.session))
					}
				} else {
					console.error("❌ No session token in login response", {
						responseData: response.data,
						availableKeys: Object.keys(response.data || {}),
					})
					toast.error("Login successful but no session token received")
				}
				setUser(response.data.user)

				// Show success message
				toast.success("Login successful!")

				// Redirect based on user role
				const dashboardRoute = getDashboardRoute(response.data.user.role as UserRole)
				router.push(dashboardRoute)
			} else {
				setError(response.message || "Login failed. Please check your credentials.")
				toast.error(response.message || "Login failed")
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "An unexpected error occurred"
			setError(errorMessage)
			toast.error(errorMessage)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit} {...props}>
			<FieldGroup>
				<div className="flex flex-col items-center gap-1 text-center">
					<h1 className="text-2xl font-bold">Login to your account</h1>
					<p className="text-muted-foreground text-sm text-balance">
						Enter your email below to login to your account
					</p>
				</div>
				{error && (
					<div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
						{error}
					</div>
				)}
				<Field>
					<FieldLabel htmlFor="email">Email</FieldLabel>
					<Input
						id="email"
						type="email"
						placeholder="m@example.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
						disabled={isLoading}
					/>
				</Field>
				<Field>
					<div className="flex items-center">
						<FieldLabel htmlFor="password">Password</FieldLabel>
						<a
							href="#"
							className="ml-auto text-sm underline-offset-4 hover:underline"
							onClick={(e) => {
								e.preventDefault()
								// TODO: Implement forgot password
								toast.info("Forgot password feature coming soon")
							}}
						>
							Forgot your password?
						</a>
					</div>
					<Input
						id="password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						disabled={isLoading}
					/>
				</Field>
				<Field>
					<Button type="submit" disabled={isLoading}>
						{isLoading ? "Logging in..." : "Login"}
					</Button>
				</Field>
				<FieldSeparator>Or continue with</FieldSeparator>
				<Field>
					<Button
						variant="outline"
						type="button"
						disabled={isLoading}
						onClick={() => {
							toast.info("GitHub login coming soon")
						}}
					>
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
							<path
								d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
								fill="currentColor"
							/>
						</svg>
						Login with GitHub
					</Button>
					<FieldDescription className="text-center">
						Don&apos;t have an account?{" "}
						<Link
							href="/signup"
							className="text-primary underline underline-offset-4 hover:no-underline font-medium transition-all duration-300 hover:opacity-80"
						>
							Sign up
						</Link>
					</FieldDescription>
				</Field>
			</FieldGroup>
		</form>
	)
}
