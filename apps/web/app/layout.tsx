import type { Metadata, Viewport } from "next"
import { Figtree, Geist, Geist_Mono } from "next/font/google"

import { BreakpointIndicator } from "@/core/components/breakpoint-indicator"
import { Toaster } from "@/core/components/ui/sonner"
import { ThemeProvider } from "@/core/context/theme-provider"
import {
	APP_DESCRIPTION,
	APP_NAME,
	VIEWPORT_THEME_COLOR_DARK,
	VIEWPORT_THEME_COLOR_LIGHT,
} from "@/core/lib/app-config"
import { AuthProvider } from "@/services/better-auth/context/auth-provider"
import { QueryProvider } from "@/services/tanstack-query/provider"
import { NetworkStatusIndicator } from "@/features/pwa/components/network-status-indicator"
import { SerwistRegistrationProvider } from "@/features/pwa/components/serwist-provider"

import "@/core/styles/globals.css"
import "@/services/orpc/orpc-server"

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" })

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
})

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
})

export const metadata: Metadata = {
	title: APP_NAME,
	description: APP_DESCRIPTION,
	applicationName: APP_NAME,
	manifest: "/manifest.webmanifest",
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: APP_NAME,
	},
	icons: {
		apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
	},
}

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: VIEWPORT_THEME_COLOR_LIGHT },
		{ media: "(prefers-color-scheme: dark)", color: VIEWPORT_THEME_COLOR_DARK },
	],
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en" className={figtree.variable} suppressHydrationWarning>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<SerwistRegistrationProvider>
					<AuthProvider>
						<QueryProvider>
							<ThemeProvider
								attribute="class"
								defaultTheme="system"
								enableSystem
								disableTransitionOnChange
							>
								<BreakpointIndicator />
								{children}
								<NetworkStatusIndicator />
								<Toaster richColors closeButton />
							</ThemeProvider>
						</QueryProvider>
					</AuthProvider>
				</SerwistRegistrationProvider>
			</body>
		</html>
	)
}
