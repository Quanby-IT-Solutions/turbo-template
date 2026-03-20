import { env } from "@/env"

export function BreakpointIndicator() {
	if (env.NODE_ENV !== "development") {
		return null
	}

	return (
		<div className="bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 border-border fixed bottom-4 left-4 z-9999 flex size-6 items-center justify-center rounded-full border font-mono text-xs shadow-lg backdrop-blur-sm">
			<span className="sm:hidden">xs</span>
			<span className="hidden sm:inline md:hidden">sm</span>
			<span className="hidden md:inline lg:hidden">md</span>
			<span className="hidden lg:inline xl:hidden">lg</span>
			<span className="hidden xl:inline 2xl:hidden">xl</span>
			<span className="hidden 2xl:inline">2xl</span>
			<span className="3xl:inline hidden">3xl</span>
			<span className="4xl:inline hidden">4xl</span>
		</div>
	)
}
