import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import { ClientSession } from "@/features/auth/components/client-session"
import { getSession } from "@/services/better-auth/auth-server"

export default async function SessionPage() {
	const session = await getSession()

	return (
		<section className="flex flex-1 flex-col gap-6">
			<Card>
				<CardHeader>
					<CardTitle>Server Session</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-sm text-muted-foreground">
						Session data fetched on the server via Better Auth. Useful to confirm cookies are
						forwarded correctly when rendering protected routes.
					</p>
					<pre className="rounded-md bg-muted/60 p-4 text-xs">
						{session ? JSON.stringify(session, null, 2) : "No active session"}
					</pre>
				</CardContent>
			</Card>
			<Separator />
			<ClientSession />
		</section>
	)
}
