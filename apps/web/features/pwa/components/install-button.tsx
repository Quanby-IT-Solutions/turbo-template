"use client"

import { Button } from "@/core/components/ui/button"
import { useInstallPrompt } from "@/features/pwa/lib/use-install-prompt"

export function InstallButton() {
	const { canInstall, promptInstall } = useInstallPrompt()

	if (!canInstall) {
		return null
	}

	return <Button onClick={promptInstall}>Install App</Button>
}
