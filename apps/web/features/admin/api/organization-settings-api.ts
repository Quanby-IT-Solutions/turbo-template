import { apiRequest } from '@/services/api/client';
import type { ApiResponse } from '@/services/api/types';

export interface OrganizationSettings {
  id: string;
  organizationId: string;
  clinicStartTime: string;
  clinicEndTime: string;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  appointmentSlotDuration: number;
  maxAppointmentsPerSlot: number;
  bookingWindowDays: number;
  minAdvanceBookingHours: number;
  workingDays: string[];
  additionalSettings?: any;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrganizationSettingsRequest {
  clinicStartTime?: string;
  clinicEndTime?: string;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  appointmentSlotDuration?: number;
  maxAppointmentsPerSlot?: number;
  bookingWindowDays?: number;
  minAdvanceBookingHours?: number;
  workingDays?: string[];
  additionalSettings?: any;
}

export const organizationSettingsApi = {
  /**
   * Get organization settings by organization ID
   */
  getSettings: async (organizationId: string): Promise<ApiResponse<OrganizationSettings>> => {
    return apiRequest<OrganizationSettings>(`/v1/organization-settings/${organizationId}`);
  },

  /**
   * Create or update organization settings
   */
  upsertSettings: async (
    organizationId: string,
    data: UpdateOrganizationSettingsRequest
  ): Promise<ApiResponse<OrganizationSettings>> => {
    return apiRequest<OrganizationSettings>(`/v1/organization-settings/${organizationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete organization settings
   */
  deleteSettings: async (organizationId: string): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/v1/organization-settings/${organizationId}`, {
      method: 'DELETE',
    });
  },
};
