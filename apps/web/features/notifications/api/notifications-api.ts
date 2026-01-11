import { apiRequest } from '@/services/api/client';
import type { ApiResponse } from '@/services/api/types';

export type NotificationPriority = "LOW" | "MEDIUM" | "HIGH"
export type NotificationType = string

export interface Notification {
  id: string
  title: string
  message: string
  type?: NotificationType
  priority?: NotificationPriority
  isRead: boolean
  isArchived: boolean
  createdAt: string
  updatedAt?: string
  metadata?: Record<string, unknown>
}

export interface NotificationListResponse {
  items: Notification[]
  total: number
}

export const notificationsApi = {
  list: async (params?: { isRead?: boolean; isArchived?: boolean; type?: string; priority?: string; limit?: number; offset?: number }): Promise<ApiResponse<NotificationListResponse>> => {
    const query = new URLSearchParams()
    if (params?.isRead !== undefined) query.append("isRead", String(params.isRead))
    if (params?.isArchived !== undefined) query.append("isArchived", String(params.isArchived))
    if (params?.type) query.append("type", params.type)
    if (params?.priority) query.append("priority", params.priority)
    if (params?.limit) query.append("limit", String(params.limit))
    if (params?.offset) query.append("offset", String(params.offset))
    const qs = query.toString()
    return apiRequest<NotificationListResponse>(`/v1/notifications${qs ? `?${qs}` : ""}`, { method: "GET" })
  },

  unreadCount: async (): Promise<ApiResponse<{ count: number }>> => {
    return apiRequest<{ count: number }>(`/v1/notifications/unread-count`, { method: "GET" })
  },

  markRead: async (id: string): Promise<ApiResponse<Notification>> => {
    return apiRequest<Notification>(`/v1/notifications/${id}/read`, { method: "PATCH" })
  },

  markUnread: async (id: string): Promise<ApiResponse<Notification>> => {
    return apiRequest<Notification>(`/v1/notifications/${id}/unread`, { method: "PATCH" })
  },

  markAllRead: async (): Promise<ApiResponse<{ success: boolean }>> => {
    return apiRequest<{ success: boolean }>(`/v1/notifications/mark-all-read`, { method: "PATCH" })
  },

  archive: async (id: string): Promise<ApiResponse<Notification>> => {
    return apiRequest<Notification>(`/v1/notifications/${id}/archive`, { method: "PATCH" })
  },

  unarchive: async (id: string): Promise<ApiResponse<Notification>> => {
    return apiRequest<Notification>(`/v1/notifications/${id}/unarchive`, { method: "PATCH" })
  },

  delete: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    return apiRequest<{ success: boolean }>(`/v1/notifications/${id}`, { method: "DELETE" })
  },

  deleteAllRead: async (): Promise<ApiResponse<{ success: boolean }>> => {
    return apiRequest<{ success: boolean }>(`/v1/notifications/delete-all-read`, { method: "DELETE" })
  },

  createTest: async (payload: { title?: string; message?: string; type?: string; priority?: NotificationPriority }): Promise<ApiResponse<Notification>> => {
    return apiRequest<Notification>(`/v1/notifications/test`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },
}
