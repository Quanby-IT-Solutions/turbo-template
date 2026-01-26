/**
 * Reports React Query hooks
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import * as reportsApi from "../api/reports"
import type {
	CreateReportRequest,
	GenerateReportRequest,
	ReportQueryParams,
	UpdateReportRequest,
} from "../api/reports"

/**
 * Query keys
 */
export const reportsKeys = {
	all: ["reports"] as const,
	lists: () => [...reportsKeys.all, "list"] as const,
	list: (params?: ReportQueryParams) => [...reportsKeys.lists(), params] as const,
	details: () => [...reportsKeys.all, "detail"] as const,
	detail: (id: string) => [...reportsKeys.details(), id] as const,
	templates: () => [...reportsKeys.all, "templates"] as const,
	template: (id: string) => [...reportsKeys.templates(), id] as const,
}

/**
 * Hook to get all report templates
 */
export function useReportTemplates() {
	return useQuery({
		queryKey: reportsKeys.templates(),
		queryFn: async () => {
			const response = await reportsApi.getReportTemplates()
			if (!response.success) {
				throw new Error(response.message || "Failed to fetch report templates")
			}
			return response.data || []
		},
	})
}

/**
 * Hook to get a single report template
 */
export function useReportTemplate(id: string) {
	return useQuery({
		queryKey: reportsKeys.template(id),
		queryFn: async () => {
			const response = await reportsApi.getReportTemplateById(id)
			if (!response.success) {
				throw new Error(response.message || "Failed to fetch report template")
			}
			return response.data
		},
		enabled: !!id,
	})
}

/**
 * Hook to get all reports
 */
export function useReports(params?: ReportQueryParams) {
	return useQuery({
		queryKey: reportsKeys.list(params),
		queryFn: async () => {
			const response = await reportsApi.getReports(params)
			if (!response.success) {
				throw new Error(response.message || "Failed to fetch reports")
			}
			return response.data || []
		},
	})
}

/**
 * Hook to get a single report
 */
export function useReport(id: string) {
	return useQuery({
		queryKey: reportsKeys.detail(id),
		queryFn: async () => {
			const response = await reportsApi.getReportById(id)
			if (!response.success) {
				throw new Error(response.message || "Failed to fetch report")
			}
			return response.data
		},
		enabled: !!id,
	})
}

/**
 * Hook to create a report
 */
export function useCreateReport() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (data: CreateReportRequest) => {
			const response = await reportsApi.createReport(data)
			if (!response.success) {
				throw new Error(response.message || "Failed to create report")
			}
			return response.data
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: reportsKeys.lists() })
			toast.success("Report created successfully")
		},
		onError: (error: Error) => {
			toast.error(error.message || "Failed to create report")
		},
	})
}

/**
 * Hook to update a report
 */
export function useUpdateReport() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: UpdateReportRequest }) => {
			const response = await reportsApi.updateReport(id, data)
			if (!response.success) {
				throw new Error(response.message || "Failed to update report")
			}
			return response.data
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: reportsKeys.lists() })
			if (data) {
				queryClient.invalidateQueries({ queryKey: reportsKeys.detail(data.id) })
			}
			toast.success("Report updated successfully")
		},
		onError: (error: Error) => {
			toast.error(error.message || "Failed to update report")
		},
	})
}

/**
 * Hook to delete a report
 */
export function useDeleteReport() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (id: string) => {
			const response = await reportsApi.deleteReport(id)
			if (!response.success) {
				throw new Error(response.message || "Failed to delete report")
			}
			return response.data
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: reportsKeys.lists() })
			toast.success("Report deleted successfully")
		},
		onError: (error: Error) => {
			toast.error(error.message || "Failed to delete report")
		},
	})
}

/**
 * Hook to generate report data
 */
export function useGenerateReport() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (data: GenerateReportRequest) => {
			const response = await reportsApi.generateReport(data)
			if (!response.success) {
				throw new Error(response.message || "Failed to generate report")
			}
			return response.data
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: reportsKeys.lists() })
			if (data) {
				queryClient.invalidateQueries({ queryKey: reportsKeys.detail(data.id) })
			}
			toast.success("Report generated successfully")
		},
		onError: (error: Error) => {
			toast.error(error.message || "Failed to generate report")
		},
	})
}
