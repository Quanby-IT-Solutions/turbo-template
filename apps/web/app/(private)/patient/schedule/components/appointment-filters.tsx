import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/core/components/ui/tabs"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/core/components/ui/select"
import { Label } from "@/core/components/ui/label"

// Removed Sheet and Button imports as they are no longer needed for the mobile layout
// import { SlidersHorizontal } from "lucide-react"

type SortOption = "most-recent" | "appointment-date-asc" | "appointment-date-desc"
type FilterStatus = "all" | "pending" | "confirmed" | "cancelled" | "rescheduled"

interface AppointmentFiltersProps {
    filterStatus: string
    onFilterChange: (status: string) => void
    sortBy: SortOption
    onSortChange: (sort: SortOption) => void
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
    // isSheetOpen is no longer needed since we are using direct selects
    // const [isSheetOpen, setIsSheetOpen] = useState(false)

    const handleSortChange = (value: string) => {
        onSortChange(value as SortOption)
    }

    return (
        <Tabs value={filterStatus} onValueChange={onFilterChange} className="w-full">
            {/* Mobile: Status and Sort Side-by-Side */}
            <div className="mb-4 flex items-center gap-2 md:hidden">
                {/* Status Filter Select */}
                <Select value={filterStatus} onValueChange={onFilterChange}>
                    <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All ({statusCounts.all})</SelectItem>
                        <SelectItem value="pending">Pending ({statusCounts.pending})</SelectItem>
                        <SelectItem value="confirmed">Confirmed ({statusCounts.confirmed})</SelectItem>
                        <SelectItem value="cancelled">Cancelled ({statusCounts.cancelled})</SelectItem>
                        <SelectItem value="rescheduled">Rescheduled ({statusCounts.rescheduled})</SelectItem>
                    </SelectContent>
                </Select>

                {/* Date/Sort Filter Select */}
                <Select 
                    value={sortBy} 
                    onValueChange={handleSortChange}
                >
                    <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="most-recent">Most Recent</SelectItem>
                        <SelectItem value="appointment-date-asc">Date (Earliest)</SelectItem>
                        <SelectItem value="appointment-date-desc">Date (Latest)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Desktop: Original Layout */}
            <div className="mb-4 hidden md:flex md:items-center md:justify-between md:gap-4">
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
                                onSortChange(value as SortOption)
                            }
                        }}
                    >
                        <SelectTrigger id="sort-select" className="w-[200px]">
                            <SelectValue  />
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