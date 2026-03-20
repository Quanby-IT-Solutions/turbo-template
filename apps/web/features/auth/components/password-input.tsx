"use client"

import * as React from "react"
import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { cn } from "@/core/lib/utils"

interface PasswordInputProps extends React.ComponentProps<typeof Input> {}

export function PasswordInput({ className, ...props }: PasswordInputProps) {
	const [showPassword, setShowPassword] = React.useState(false)

	return (
		<div className={cn("relative", className)}>
			<Input {...props} type={showPassword ? "text" : "password"} className="pr-9" />
			<Button
				type="button"
				variant="ghost"
				onClick={() => setShowPassword(!showPassword)}
				aria-label={showPassword ? "Hide password" : "Show password"}
				className="absolute right-0 px-2 hover:bg-transparent!"
				tabIndex={-1}
			>
				<HugeiconsIcon icon={showPassword ? ViewOffIcon : ViewIcon} strokeWidth={2} />
			</Button>
		</div>
	)
}
