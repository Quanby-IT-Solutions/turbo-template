export default function SiteLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<div className="container flex min-h-[calc(100vh-4rem)] flex-col gap-8 py-10">
			{children}
		</div>
	)
}
