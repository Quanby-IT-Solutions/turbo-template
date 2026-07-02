"use client"

import * as React from "react"

interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>
	userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export function useInstallPrompt() {
	const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null)
	const [isInstalled, setIsInstalled] = React.useState(false)

	React.useEffect(() => {
		const standaloneQuery = window.matchMedia("(display-mode: standalone)")

		setIsInstalled(standaloneQuery.matches)

		const handleDisplayModeChange = (event: MediaQueryListEvent) => {
			setIsInstalled(event.matches)
		}

		const handleBeforeInstallPrompt = (event: Event) => {
			event.preventDefault()
			setDeferredPrompt(event as BeforeInstallPromptEvent)
		}

		const handleAppInstalled = () => {
			setIsInstalled(true)
			setDeferredPrompt(null)
		}

		standaloneQuery.addEventListener("change", handleDisplayModeChange)
		window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
		window.addEventListener("appinstalled", handleAppInstalled)

		return () => {
			standaloneQuery.removeEventListener("change", handleDisplayModeChange)
			window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
			window.removeEventListener("appinstalled", handleAppInstalled)
		}
	}, [])

	const canInstall = deferredPrompt !== null && !isInstalled

	const promptInstall = async () => {
		if (!deferredPrompt) {
			return
		}

		await deferredPrompt.prompt()
		await deferredPrompt.userChoice
		setDeferredPrompt(null)
	}

	return { canInstall, promptInstall }
}
