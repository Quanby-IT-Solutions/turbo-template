import { Button } from "@/core/components/ui/button"

interface PaginationProps {
	currentPage: number
	totalPages: number
	startIndex: number
	endIndex: number
	totalItems: number
	onPageChange: (page: number) => void
}

export function Pagination({
	currentPage,
	totalPages,
	startIndex,
	endIndex,
	totalItems,
	onPageChange,
}: PaginationProps) {
	if (totalPages <= 1) return null

	return (
		<div className="mt-6 flex items-center justify-between">
			<div className="text-muted-foreground text-sm">
				Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} appointments
			</div>
			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={() => onPageChange(currentPage - 1)}
					disabled={currentPage === 1}
				>
					Previous
				</Button>
				<div className="flex items-center gap-1">
					{Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
						if (
							page === 1 ||
							page === totalPages ||
							(page >= currentPage - 1 && page <= currentPage + 1)
						) {
							return (
								<Button
									key={page}
									variant={currentPage === page ? "default" : "outline"}
									size="sm"
									onClick={() => onPageChange(page)}
									className={currentPage === page ? "" : "min-w-10"}
								>
									{page}
								</Button>
							)
						} else if (page === currentPage - 2 || page === currentPage + 2) {
							return (
								<span key={page} className="text-muted-foreground px-2">
									...
								</span>
							)
						}
						return null
					})}
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => onPageChange(currentPage + 1)}
					disabled={currentPage === totalPages}
				>
					Next
				</Button>
			</div>
		</div>
	)
}