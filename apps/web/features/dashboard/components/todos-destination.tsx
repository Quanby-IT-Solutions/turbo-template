import Link from "next/link"
import { Task01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/core/components/ui/badge"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

const todoScaffoldItems = [
	{
		title: "Posts permission target",
		body: "This destination is shown from the sidebar when the current access profile includes posts:read.",
	},
	{
		title: "Backend owned data",
		body: "Real list, create, update, and delete calls should stay behind the protected NestJS todos endpoints.",
	},
	{
		title: "UI ready for data",
		body: "Use the shared oRPC client and TanStack Query hooks when this scaffold becomes an interactive list.",
	},
]

export function TodosDestination() {
	return (
		<section className="flex w-full flex-col gap-6">
			<Card>
				<CardHeader className="gap-3">
					<div className="flex flex-wrap items-center gap-3">
						<div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-md">
							<HugeiconsIcon icon={Task01Icon} strokeWidth={2} className="size-5" />
						</div>
						<div className="min-w-0">
							<CardTitle>Todos / Posts</CardTitle>
							<CardDescription>Authenticated workspace destination</CardDescription>
						</div>
						<Badge variant="secondary" className="ml-0 sm:ml-auto">
							Scaffold
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="space-y-4 text-sm leading-relaxed">
					<p>
						This page gives the dashboard sidebar a live destination for the Todos / Posts item.
						The real todos experience can be wired here without changing the navigation contract.
					</p>
					<div className="flex flex-wrap gap-3">
						<Link
							href="/dashboard"
							className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-transparent px-2.5 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px]"
						>
							Dashboard
						</Link>
						<Link
							href="/submit-ticket"
							className="border-border bg-background hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-8 shrink-0 items-center justify-center rounded-lg border px-2.5 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px]"
						>
							Submit ticket
						</Link>
					</div>
				</CardContent>
			</Card>
			<div className="grid gap-4 md:grid-cols-3">
				{todoScaffoldItems.map(item => (
					<Card key={item.title}>
						<CardHeader>
							<CardTitle className="text-base">{item.title}</CardTitle>
						</CardHeader>
						<CardContent className="text-muted-foreground text-sm">{item.body}</CardContent>
					</Card>
				))}
			</div>
		</section>
	)
}
