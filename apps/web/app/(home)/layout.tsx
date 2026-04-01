export default function HomeLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<div className="container mx-auto flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center pb-16">
			{children}
		</div>
	)
}
