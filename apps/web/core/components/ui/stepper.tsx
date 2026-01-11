"use client"

import * as React from "react"
import { cn } from "@/core/lib/utils"

export interface StepperProps {
	steps: string[]
	currentStep: number
	className?: string
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
	return (
		<div className={cn("flex items-center gap-2", className)}>
			{steps.map((step, index) => {
				const stepNumber = index + 1
				const isActive = stepNumber === currentStep
				const isCompleted = stepNumber < currentStep

				return (
					<React.Fragment key={step}>
						<div className="flex items-center gap-2">
							<div
								className={cn(
									"flex size-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
									isActive
										? "border-primary bg-primary text-primary-foreground"
										: isCompleted
											? "border-primary bg-primary/10 text-primary"
											: "border-muted bg-muted text-muted-foreground"
								)}
							>
								{isCompleted ? (
									<svg
										className="size-4"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M5 13l4 4L19 7"
										/>
									</svg>
								) : (
									stepNumber
								)}
							</div>
							<span
								className={cn(
									"text-sm font-medium",
									isActive
										? "text-foreground"
										: isCompleted
											? "text-muted-foreground"
											: "text-muted-foreground/60"
								)}
							>
								{step}
							</span>
						</div>
						{index < steps.length - 1 && (
							<div
								className={cn(
									"h-0.5 w-8 transition-colors",
									isCompleted ? "bg-primary" : "bg-muted"
								)}
							/>
						)}
					</React.Fragment>
				)
			})}
		</div>
	)
}
