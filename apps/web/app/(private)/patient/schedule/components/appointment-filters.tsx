import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/core/components/ui/tabs"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Label } from "@/core/components/ui/label"

interface AppointmentFiltersProps {
	filterStatus: string
	onFilterChange: (status: string) => void
	sortBy: "most-recent" | "appointment-date-asc" | "appointment-date-desc"
	onSortChange: (sort: "most-recent" | "appointment-date-asc" | "appointment-date-desc") => void
	statusCounts: {
		all: number
		pending: number
		confirmed: number
		cancelled: number
		rescheduled: number
	}
	children: React.ReactNode
}

export function AppointmentFilters({
	filterStatus,
	onFilterChange,
	sortBy,
	onSortChange,
	statusCounts,
	children,
}: AppointmentFiltersProps) {
	return (
		<Tabs value={filterStatus} onValueChange={onFilterChange} className="w-full">
			<div className="mb-4 flex items-center justify-between gap-4">
				<TabsList className="grid w-full max-w-2xl grid-cols-5">
					<TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
					<TabsTrigger value="pending">Pending ({statusCounts.pending})</TabsTrigger>
					<TabsTrigger value="confirmed">Confirmed ({statusCounts.confirmed})</TabsTrigger>
					<TabsTrigger value="cancelled">Cancelled ({statusCounts.cancelled})</TabsTrigger>
					<TabsTrigger value="rescheduled">Rescheduled ({statusCounts.rescheduled})</TabsTrigger>
				</TabsList>
				<div className="flex items-center gap-2">
					<Label htmlFor="sort-select" className="text-sm whitespace-nowrap">
						Sort by:
					</Label>
					<Select 
						value={sortBy} 
						onValueChange={(value) => {
							if (value) {
								onSortChange(value as typeof sortBy)
							}
						}}
					>
						<SelectTrigger id="sort-select" className="w-[200px]">
							<SelectValue placeholder="Sort by" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="most-recent">Most Recent</SelectItem>
							<SelectItem value="appointment-date-asc">Appointment Date (Earliest)</SelectItem>
							<SelectItem value="appointment-date-desc">Appointment Date (Latest)</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
			<TabsContent value={filterStatus} className="mt-0">
				{children}
			</TabsContent>
		</Tabs>
	)
}