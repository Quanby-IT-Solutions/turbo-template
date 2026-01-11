/**
 * Appointments API functions
 */

import { apiRequest } from '@/services/api/client';
import type {
  ApiResponse,
  AppointmentRequest,
  AppointmentListResponse,
  CreateAppointmentRequest,
  RescheduleRequestInput,
  RescheduleRequest,
  DoctorAvailability,
} from '@/services/api/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

type AppointmentResponsePayload =
  | AppointmentRequest[]
  | {
      data?: AppointmentRequest[];
      pagination?: AppointmentListResponse['pagination'];
    }
  | {
      data?: {
        data?: AppointmentRequest[];
        pagination?: AppointmentListResponse['pagination'];
      };
      pagination?: AppointmentListResponse['pagination'];
    };

const normalizeAppointmentsPayload = (
  payload?: AppointmentResponsePayload
): { appointments: AppointmentRequest[]; pagination?: AppointmentListResponse['pagination'] } => {
  if (!payload) {
    return { appointments: [] };
  }

  if (Array.isArray(payload)) {
    return { appointments: payload };
  }

  if ('data' in payload && payload.data) {
    if (Array.isArray(payload.data)) {
      return {
        appointments: payload.data,
        pagination: payload.pagination,
      };
    }

    if (
      typeof payload.data === 'object' &&
      payload.data !== null &&
      'data' in payload.data &&
      Array.isArray(payload.data.data)
    ) {
      return {
        appointments: payload.data.data,
        pagination: payload.data.pagination || payload.pagination,
      };
    }
  }

  return { appointments: [], pagination: payload.pagination };
};

export const appointmentsApi = {
  /**
   * Create appointment request (patients only)
   */
  createAppointment: async (data: CreateAppointmentRequest): Promise<ApiResponse<AppointmentRequest>> => {
    return apiRequest<AppointmentRequest>('/v1/appointments/request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get user appointments (patients and doctors)
   * Normalizes backend payload into a consistent array
   */
  getMyAppointments: async (params?: { status?: string; page?: number; limit?: number }): Promise<
    ApiResponse<AppointmentRequest[]> & { pagination?: AppointmentListResponse['pagination'] }
  > => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const queryString = queryParams.toString();
    const response = await apiRequest<AppointmentResponsePayload>(`/v1/appointments/my-appointments${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });

    const { appointments, pagination } = normalizeAppointmentsPayload(response.data);

    return {
      ...response,
      data: appointments,
      ...(pagination ? { pagination } : {}),
    };
  },

  /**
   * Update appointment status (doctors only - accept/reject)
   */
  updateAppointmentStatus: async (appointmentId: string, status: 'CONFIRMED' | 'REJECTED', notes?: string): Promise<ApiResponse<AppointmentRequest>> => {
    return apiRequest<AppointmentRequest>(`/v1/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  },

  /**
   * Cancel appointment (patients and doctors)
   */
  cancelAppointment: async (appointmentId: string, reason?: string): Promise<ApiResponse<AppointmentRequest>> => {
    return apiRequest<AppointmentRequest>(`/v1/appointments/${appointmentId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Request reschedule for an appointment
   */
  requestReschedule: async (appointmentId: string, data: RescheduleRequestInput): Promise<ApiResponse<RescheduleRequest>> => {
    return apiRequest<RescheduleRequest>(`/v1/appointments/${appointmentId}/reschedule`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update reschedule request status (approve/reject)
   */
  updateRescheduleStatus: async (rescheduleId: string, status: 'APPROVED' | 'REJECTED', notes?: string): Promise<ApiResponse<RescheduleRequest>> => {
    return apiRequest<RescheduleRequest>(`/v1/appointments/reschedule/${rescheduleId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  },

  /**
   * Get available doctors for booking
   */
  getAvailableDoctors: async (): Promise<ApiResponse<Array<{ id: string; name: string; specialization: string; organizationId?: string }>>> => {
    return apiRequest<Array<{ id: string; name: string; specialization: string; organizationId?: string }>>('/v1/appointments/doctors', {
      method: 'GET',
    });
  },

  /**
   * Get doctor availability by doctor ID
   * Note: This endpoint returns the array directly, not wrapped in success/data
   */
  getDoctorAvailability: async (doctorId: string): Promise<ApiResponse<DoctorAvailability[]>> => {
    const url = `${API_BASE_URL}/v1/appointments/doctor/${doctorId}/availability`;
    const sessionToken = typeof window !== 'undefined' ? localStorage.getItem('sessionToken') : null;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include', // Required for Better Auth session cookies
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: errorData.message || 'Failed to fetch doctor availability',
          error: errorData.error || 'UNKNOWN_ERROR',
        };
      }

      const data = await response.json();
      // Backend returns array directly, not wrapped
      return {
        success: true,
        message: 'Doctor availability fetched successfully',
        data: Array.isArray(data) ? data : [],
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error occurred',
        error: 'NETWORK_ERROR',
      };
    }
  },

  /**
   * Get available time slots for a doctor on a specific date
   * Returns time slots that are available (not already booked)
   */
  getDoctorAvailableTimeSlots: async (doctorId: string, date: string): Promise<ApiResponse<string[]>> => {
    return apiRequest<string[]>(`/v1/appointments/doctor/${doctorId}/available-slots?date=${date}`, {
      method: 'GET',
    });
  },

  /**
   * Get doctor's weekly availability (doctors only)
   */
  getMyWeeklyAvailability: async (): Promise<ApiResponse<Array<{
    id: string | number;
    doctorId: string;
    dayOfWeek: string;
    startTime: Date | string;
    endTime: Date | string;
    isAvailable: boolean;
    hasExistingAppointments?: boolean;
    existingAppointments?: Array<{
      id: string;
      requestedDate: string;
      requestedTime: string;
      patient: {
        id: string;
        patientInfo?: { fullName: string };
      };
    }>;
  }>>> => {
    return apiRequest<Array<{
      id: string | number;
      doctorId: string;
      dayOfWeek: string;
      startTime: Date | string;
      endTime: Date | string;
      isAvailable: boolean;
      hasExistingAppointments?: boolean;
      existingAppointments?: Array<{
        id: string;
        requestedDate: string;
        requestedTime: string;
        patient: {
          id: string;
          patientInfo?: { fullName: string };
        };
      }>;
    }>>('/v1/appointments/my/availability', {
      method: 'GET',
    });
  },

  /**
   * Update doctor's weekly availability (doctors only)
   */
  updateMyWeeklyAvailability: async (days: Array<{ dayOfWeek: string; isAvailable: boolean; startTime?: string; endTime?: string }>): Promise<ApiResponse> => {
    return apiRequest('/v1/appointments/my/availability', {
      method: 'PUT',
      body: JSON.stringify({ days }),
    });
  },

  /**
   * Get all appointments for the organization (org/admin/super-admin)
   */
  getOrganizationAppointments: async (): Promise<ApiResponse<AppointmentRequest[]>> => {
    return apiRequest<AppointmentRequest[]>('/v1/appointments/organization', {
      method: 'GET',
    });
  },
};
