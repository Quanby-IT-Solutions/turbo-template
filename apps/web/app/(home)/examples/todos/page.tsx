import Link from "next/link"

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

const instructions = [
	{
		title: "Create todos from the CLI",
		body: "Use the NestJS service in apps/backend/src/modules/v1/examples/todos to insert seed data or wire this API up to your UI.",
	},
	{
		title: "Call the oRPC endpoint",
		body: "Use the @orpc/client helpers in apps/web to fetch from /api/v1/example/todo/* with full type safety provided by @repo/contracts.",
	},
	{
		title: "Render the list",
		body: "Hook the response into TanStack Query via services/tanstack-query and reuse the shared UI components under apps/web/core/components.",
	},
]

export default function TodosExamplePage() {
	return (
		<section className="flex w-full flex-col gap-6">
			<Card>
				<CardHeader>
					<CardTitle>Todos API Example</CardTitle>
					<CardDescription>
						This route mirrors the NestJS todos module and is powered by the shared oRPC contract
						found in <code>packages/contracts</code>.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4 text-sm leading-relaxed">
					<p>
						Use this page as a starting point for experimenting with the example todos feature. The
						backend exposes fully typed endpoints for listing, reading, creating, updating, and
						deleting todos. The same contract is used by both the NestJS controller and the frontend
						so changes stay in sync.
					</p>
					<p>
						The actual UI has intentionally been left minimal so you can wire it up using your
						preferred data fetching strategy (TanStack Query, server components, or server actions).
						The steps below highlight the key files involved.
					</p>
				</CardContent>
			</Card>
			<div className="grid gap-4 md:grid-cols-3">
				{instructions.map(item => (
					<Card key={item.title}>
						<CardHeader>
							<CardTitle className="text-base">{item.title}</CardTitle>
						</CardHeader>
						<CardContent className="text-muted-foreground text-sm">{item.body}</CardContent>
					</Card>
				))}
			</div>
			<div className="flex flex-wrap gap-3">
				<Link
					className="bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:ring-ring inline-flex h-10 items-center justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
					href="/dashboard"
				>
					Go to dashboard
				</Link>
				<Link
					className="border-input text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex h-10 items-center justify-center rounded-md border bg-transparent px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
					href="/"
				>
					Back to home
				</Link>
			</div>
		</section>
	)
}
