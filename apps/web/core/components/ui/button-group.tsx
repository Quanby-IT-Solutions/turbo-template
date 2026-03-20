import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { Separator } from "@/core/components/ui/separator"
import { cn } from "@/core/lib/utils"

const buttonGroupVariants = cva(
	"flex w-fit items-stretch has-[>[data-slot=button-group]]:gap-2 [&>*]:focus-visible:relative [&>*]:focus-visible:z-10 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-lg [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
	{
		variants: {
			orientation: {
				horizontal:
					"[&>[data-slot]:not(:has(~[data-slot]))]:rounded-r-lg! [&>[data-slot]]:rounded-r-none [&>[data-slot]~[data-slot]]:rounded-l-none [&>[data-slot]~[data-slot]]:border-l-0",
				vertical:
					"[&>[data-slot]:not(:has(~[data-slot]))]:rounded-b-lg! flex-col [&>[data-slot]]:rounded-b-none [&>[data-slot]~[data-slot]]:rounded-t-none [&>[data-slot]~[data-slot]]:border-t-0",
			},
		},
		defaultVariants: {
			orientation: "horizontal",
		},
	}
)

function ButtonGroup({
	className,
	orientation,
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
	return (
		<div
			role="group"
			data-slot="button-group"
			data-orientation={orientation}
			className={cn(buttonGroupVariants({ orientation }), className)}
			{...props}
		/>
	)
}

function ButtonGroupText({ className, render, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		props: mergeProps<"div">(
			{
				className: cn(
					"bg-muted flex items-center gap-2 rounded-lg border px-2.5 text-sm font-medium [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none",
					className
				),
			},
			props
		),
		render,
		state: {
			slot: "button-group-text",
		},
	})
}

function ButtonGroupSeparator({
	className,
	orientation = "vertical",
	...props
}: React.ComponentProps<typeof Separator>) {
	return (
		<Separator
			data-slot="button-group-separator"
			orientation={orientation}
			className={cn(
				"bg-input relative self-stretch data-[orientation=horizontal]:mx-px data-[orientation=vertical]:my-px data-[orientation=vertical]:h-auto data-[orientation=horizontal]:w-auto",
				className
			)}
			{...props}
		/>
	)
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants }
