/**
 * The session read lives in the child layout. A failed read thrown there
 * reaches this segment's error boundary instead of the login page.
 */
export default function SiteLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return children
}
