"use client"

import * as React from "react"
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Calendar } from "@/core/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/core/components/ui/popover"
import type { DoctorAvailability } from "@/services/api/types"

interface DatePickerWithCalendarProps {
	value?: Date
	onChange: (date: Date | undefined) => void
	doctorAvailability: DoctorAvailability[]
	minDate?: Date
	disabled?: boolean
	placeholder?: string
}

export function DatePickerWithCalendar({
	value,
	onChange,
	doctorAvailability,
	minDate,
	disabled = false,
	placeholder = "Pick a date",
}: DatePickerWithCalendarProps) {
	// Create a function to check if a date should be disabled
	const isDateDisabled = React.useCallback(
		(date: Date) => {
			// Get the day of the week
			const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" })

			// Check if doctor is available on this day
			const dayAvailability = doctorAvailability.find(
				(avail) => avail.dayOfWeek === dayOfWeek
			)

			// Disable if doctor is not available on this day
			return !dayAvailability || !dayAvailability.isAvailable
		},
		[doctorAvailability]
	)

	// Build the disabled matcher for react-day-picker
	const disabledMatcher = React.useMemo(() => {
		const matchers: any[] = []

		// Disable dates before minDate
		if (minDate) {
			matchers.push({ before: minDate })
		}

		// Disable dates where doctor is not available
		if (doctorAvailability.length > 0) {
			matchers.push(isDateDisabled)
		}

		return matchers
	}, [minDate, doctorAvailability, isDateDisabled])

	return (
		<Popover>
			<PopoverTrigger
				disabled={disabled}
				className={cn(
					"w-full justify-start text-left font-normal",
					!value && "text-muted-foreground",
					"inline-flex items-center rounded-md border border-input bg-transparent px-3 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
				)}
			>
				<CalendarIcon className="mr-2 h-4 w-4" />
				{value ? format(value, "PPP") : <span>{placeholder}</span>}
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={value}
					onSelect={onChange}
					disabled={disabledMatcher}
					initialFocus
				/>
			</PopoverContent>
		</Popover>
	)
}