import type { Metadata } from "next"
import { Figtree, Geist, Geist_Mono } from "next/font/google"

import { BreakpointIndicator } from "@/core/components/breakpoint-indicator"
import { Toaster } from "@/core/components/ui/sonner"
import { ThemeProvider } from "@/core/context/theme-provider"
import { AuthProvider } from "@/services/better-auth/context/auth-provider"
import { QueryProvider } from "@/services/tanstack-query/provider"

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
	title: "Turbo Template",
	description: "Turborepo monorepo template with Next.js, NestJS, and Flutter",
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en" className={figtree.variable} suppressHydrationWarning>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
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
							<Toaster richColors closeButton />
						</ThemeProvider>
					</QueryProvider>
				</AuthProvider>
			</body>
		</html>
	)
}
