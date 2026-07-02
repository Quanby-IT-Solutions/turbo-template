"use client"

import Link from "next/link"
import { Mail01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { buttonVariants } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { FieldGroup, FieldSeparator } from "@/core/components/ui/field"
import { cn } from "@/core/lib/utils"
import { ResendVerificationForm } from "@/features/auth/verify-email/components/resend-verification-form"

interface CheckYourEmailViewProps {
	email: string
}

export function CheckYourEmailView({ email }: CheckYourEmailViewProps) {
	return (
		<div className="flex w-128 flex-col gap-6">
			<Card>
				<CardContent className="p-6 md:p-8">
					<FieldGroup className="items-center text-center">
						<HugeiconsIcon icon={Mail01Icon} className="text-primary size-10" />
						<h1 className="text-2xl font-bold">Check your email</h1>
						<p className="text-muted-foreground text-balance">
							We&apos;ve sent a verification link to <span className="font-semibold">{email}</span>.
							Click it to activate your account.
						</p>

						<FieldSeparator>Didn&apos;t get it?</FieldSeparator>

						<div className="w-full text-left">
							<ResendVerificationForm prefillEmail={email} />
						</div>

						<Link
							href="/login"
							className={cn(buttonVariants({ variant: "link" }), "text-muted-foreground h-auto")}
						>
							Back to login
						</Link>
					</FieldGroup>
				</CardContent>
			</Card>
		</div>
	)
}
