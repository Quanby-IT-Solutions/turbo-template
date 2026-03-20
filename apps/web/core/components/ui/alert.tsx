import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/core/lib/utils"

const alertVariants = cva(
	"group/alert has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4 relative grid w-full gap-0.5 rounded-lg border px-2.5 py-2 text-left text-sm has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2",
	{
		variants: {
			variant: {
				default: "bg-card text-card-foreground",
				destructive:
					"text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	}
)

function Alert({
	className,
	variant,
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
	return (
		<div
			data-slot="alert"
			role="alert"
			className={cn(alertVariants({ variant }), className)}
			{...props}
		/>
	)
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="alert-title"
			className={cn(
				"[&_a]:hover:text-foreground [&_a]:underline-offset-3 font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline",
				className
			)}
			{...props}
		/>
	)
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="alert-description"
			className={cn(
				"text-muted-foreground [&_a]:hover:text-foreground [&_a]:underline-offset-3 text-balance text-sm md:text-pretty [&_a]:underline [&_p:not(:last-child)]:mb-4",
				className
			)}
			{...props}
		/>
	)
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div data-slot="alert-action" className={cn("absolute right-2 top-2", className)} {...props} />
	)
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
