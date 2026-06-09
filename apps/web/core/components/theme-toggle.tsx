"use client"

import { useSyncExternalStore } from "react"
import { Moon02Icon, Sun01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useTheme } from "next-themes"

import { Button } from "@/core/components/ui/button"

const emptySubscribe = () => () => {}

export function ThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme()
	const mounted = useSyncExternalStore(
		emptySubscribe,
		() => true,
		() => false
	)

	const isDark = resolvedTheme === "dark"

	if (!mounted) {
		return (
			<Button variant="ghost" size="icon-sm" disabled aria-label="Toggle theme">
				<HugeiconsIcon icon={Sun01Icon} strokeWidth={2} />
			</Button>
		)
	}

	return (
		<Button
			variant="ghost"
			size="icon-sm"
			onClick={() => setTheme(isDark ? "light" : "dark")}
			aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
		>
			<HugeiconsIcon icon={isDark ? Sun01Icon : Moon02Icon} strokeWidth={2} />
		</Button>
	)
}
