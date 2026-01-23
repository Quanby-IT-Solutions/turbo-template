import { apiRequest } from '@/services/api/client';
import type { ApiResponse } from '@/services/api/types';

export interface DoctorSchedule {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorEmail?: string;
  specialization?: string;
  dayOfWeek: string;
  startTime: string | Date;
  endTime: string | Date;
  isAvailable: boolean;
}

export interface CreateDoctorScheduleRequest {
  doctorId: string;
  dayOfWeek: string;
  startTime: string; // Format: HH:MM or HH:MM:SS
  endTime: string; // Format: HH:MM or HH:MM:SS
  isAvailable: boolean;
}

export interface UpdateDoctorScheduleRequest {
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  isAvailable?: boolean;
}

export interface DoctorScheduleQueryParams {
  doctorId?: string;
  dayOfWeek?: string;
}

export const doctorSchedulesApi = {
  /**
   * Get all doctor schedules (admin only)
   */
  getSchedules: async (params?: DoctorScheduleQueryParams): Promise<ApiResponse<DoctorSchedule[]>> => {
    const queryParams = new URLSearchParams();
    if (params?.doctorId) queryParams.append('doctorId', params.doctorId);
    if (params?.dayOfWeek) queryParams.append('dayOfWeek', params.dayOfWeek);

    const queryString = queryParams.toString();
    return apiRequest<DoctorSchedule[]>(
      `/v1/admin/doctor-schedules${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Get a specific doctor schedule by ID
   */
  getScheduleById: async (id: string): Promise<ApiResponse<DoctorSchedule>> => {
    return apiRequest<DoctorSchedule>(`/v1/admin/doctor-schedules/${id}`);
  },

  /**
   * Create a new doctor schedule
   */
  createSchedule: async (data: CreateDoctorScheduleRequest): Promise<ApiResponse<DoctorSchedule>> => {
    return apiRequest<DoctorSchedule>('/v1/admin/doctor-schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a doctor schedule
   */
  updateSchedule: async (
    id: string,
    data: UpdateDoctorScheduleRequest
  ): Promise<ApiResponse<DoctorSchedule>> => {
    return apiRequest<DoctorSchedule>(`/v1/admin/doctor-schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a doctor schedule
   */
  deleteSchedule: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/v1/admin/doctor-schedules/${id}`, {
      method: 'DELETE',
    });
  },
};
