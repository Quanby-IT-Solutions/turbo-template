import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import { Toaster } from "@/core/components/ui/sonner"
import { QueryProvider } from "@/services/query/query-provider"
import "@/core/styles/globals.css"

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
})

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
})

export const metadata: Metadata = {
	title: "QHealth",
	description: "Comprehensive healthcare management platform",
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en">
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<QueryProvider>
					{children}
					<Toaster />
				</QueryProvider>
			</body>
		</html>
	)
}
