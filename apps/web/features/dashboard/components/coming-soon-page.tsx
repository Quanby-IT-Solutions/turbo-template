import Link from "next/link"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/core/components/ui/empty"

interface ComingSoonPageProps {
	title: string
	description: string
	icon: IconSvgElement
}

export function ComingSoonPage({ title, description, icon }: ComingSoonPageProps) {
	return (
		<section className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-3xl items-center">
			<Empty className="border bg-card/50">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<HugeiconsIcon icon={icon} strokeWidth={2} />
					</EmptyMedia>
					<EmptyTitle>{title}</EmptyTitle>
					<EmptyDescription>{description}</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Link
						href="/dashboard"
						className="border-border bg-background hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-8 shrink-0 items-center justify-center rounded-lg border px-2.5 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px]"
					>
						Back to dashboard
					</Link>
				</EmptyContent>
			</Empty>
		</section>
	)
}
