"use client"

import { ShieldKeyIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/core/components/ui/badge"
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/core/components/ui/empty"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { useIsQueryLoading } from "@/services/tanstack-query/use-query-loading"
import { useAuditLogQuery } from "@/features/user-management/api/rbac.hooks"

/**
 * Read-only view of the RBAC audit trail (AZ-4 / F-17).
 *
 * Deliberately offers no way to edit or delete an entry: the table is
 * append-only, and a UI affordance suggesting otherwise would misrepresent it.
 */
export function AuditLogPanel() {
	const auditQuery = useAuditLogQuery()
	const isQueryLoading = useIsQueryLoading()

	const entries = auditQuery.data?.entries ?? []

	return (
		<div className="flex flex-col gap-4">
			<div>
				<h2 className="text-lg font-semibold">Audit log</h2>
				<p className="text-muted-foreground text-sm">
					Every role and permission change, newest first. Entries cannot be edited or removed.
				</p>
			</div>

			{isQueryLoading(auditQuery) ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</div>
			) : null}

			{auditQuery.isError ? (
				<p className="text-destructive text-sm">
					{auditQuery.error instanceof Error
						? auditQuery.error.message
						: "Failed to load the audit log"}
				</p>
			) : null}

			{entries.length > 0 ? (
				// Wide content scrolls inside its own container so the page body
				// never scrolls horizontally on a phone.
				<div className="overflow-x-auto rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead scope="col">When</TableHead>
								<TableHead scope="col">Actor</TableHead>
								<TableHead scope="col">Action</TableHead>
								<TableHead scope="col">Target</TableHead>
								<TableHead scope="col">Change</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{entries.map(entry => (
								<TableRow key={entry.id}>
									<TableCell className="align-top whitespace-nowrap">
										<time dateTime={new Date(entry.createdAt).toISOString()}>
											{new Date(entry.createdAt).toLocaleString()}
										</time>
									</TableCell>
									<TableCell className="align-top">
										{entry.actorEmail ?? (
											<span className="text-muted-foreground text-xs">
												{entry.actorId ?? "system"}
											</span>
										)}
									</TableCell>
									<TableCell className="align-top">
										<div className="flex items-center gap-2">
											<span className="font-medium">{entry.action}</span>
											{entry.outcome === "denied" ? (
												<Badge variant="destructive">denied</Badge>
											) : null}
										</div>
										{entry.reason ? (
											<div className="text-muted-foreground text-xs">{entry.reason}</div>
										) : null}
									</TableCell>
									<TableCell className="align-top">
										{entry.targetType ? (
											<span className="text-xs">
												{entry.targetType}
												{entry.targetId ? `: ${entry.targetId}` : ""}
											</span>
										) : (
											<span className="text-muted-foreground text-xs">—</span>
										)}
									</TableCell>
									<TableCell className="align-top">
										<ChangeSummary oldValue={entry.oldValue} newValue={entry.newValue} />
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			) : null}

			{!isQueryLoading(auditQuery) && !auditQuery.isError && entries.length === 0 ? (
				<Empty className="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<HugeiconsIcon icon={ShieldKeyIcon} strokeWidth={2} />
						</EmptyMedia>
						<EmptyTitle>No audit entries yet</EmptyTitle>
						<EmptyDescription>
							Role and permission changes will be recorded here as they happen.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : null}
		</div>
	)
}

/** A JSON null and an absent column both mean "nothing recorded here". */
function isNullish(value: unknown): boolean {
	return value === null || value === undefined
}

function ChangeSummary({ oldValue, newValue }: { oldValue: unknown; newValue: unknown }) {
	if (isNullish(oldValue) && isNullish(newValue)) {
		return <span className="text-muted-foreground text-xs">—</span>
	}

	return (
		<div className="flex flex-col gap-0.5 text-xs">
			{isNullish(oldValue) ? null : (
				<span className="text-muted-foreground">
					<span className="sr-only">Before: </span>− {format(oldValue)}
				</span>
			)}
			{isNullish(newValue) ? null : (
				<span>
					<span className="sr-only">After: </span>+ {format(newValue)}
				</span>
			)}
		</div>
	)
}

function format(value: unknown): string {
	if (typeof value === "string") return value
	try {
		return JSON.stringify(value)
	} catch {
		return String(value)
	}
}
