import { CacheIdentity } from "@/services/tanstack-query/cache-identity"

export default function HomeLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<div className="container mx-auto flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center pb-16">
			{/* WC-1: scope the persisted cache to this user before anything reads it.
			    Both routes under this layout already resolve a session of their own,
			    so this adds no request and costs no static route. */}
			<CacheIdentity />
			{children}
		</div>
	)
}
