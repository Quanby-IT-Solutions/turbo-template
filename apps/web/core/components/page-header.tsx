import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { cn } from "@/core/lib/utils"

interface PageHeaderProps {
	title: string
	description?: string
	icon?: IconSvgElement
	actions?: React.ReactNode
	className?: string
}

export function PageHeader({ title, description, icon, actions, className }: PageHeaderProps) {
	return (
		<div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
			<div className="flex min-w-0 items-center gap-3">
				{icon ? (
					<div className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
						<HugeiconsIcon icon={icon} strokeWidth={2} className="size-5" />
					</div>
				) : null}
				<div className="min-w-0">
					<h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
					{description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
				</div>
			</div>
			{actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
		</div>
	)
}
