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

const normalizeAppointmentsPayload = (data: any) => {
  // If data has items (paginated response)
  if (data.items && Array.isArray(data.items)) {
    return {
      appointments: data.items,
      pagination: {
        total: data.total,
        page: data.page,
        limit: data.limit,
        totalPages: data.totalPages,
      }
    }
  }
  
  // If data is directly an array
  if (Array.isArray(data)) {
    return {
      appointments: data,
      pagination: undefined
    }
  }
  
  // Fallback
  return {
    appointments: [],
    pagination: undefined
  }
}

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
  getMyAppointments: async (params?: { status?: string; page?: number; limit?: number }) => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  
  const queryString = queryParams.toString();
  const response = await apiRequest<any>(
    `/v1/appointments/my-appointments${queryString ? `?${queryString}` : ''}`,
    { method: 'GET' }
  );

  console.log('🔵 Full response:', response);

  // Return response as-is, let the frontend handle it
  return response;
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
  return apiRequest<DoctorAvailability[]>(`/v1/appointments/doctor/${doctorId}/availability`, {
    method: 'GET',
  });
},

  /**
   * Get available time slots for a doctor on a specific date
   * Returns time slots that are available (not already booked)
   */
  getDoctorAvailableTimeSlots: async (
  doctorId: string,
  date: string
): Promise<ApiResponse<string[]>> => {
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
