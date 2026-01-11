/**
 * Doctors API functions
 */

import { apiRequest } from '@/services/api/client';
import type { ApiResponse, Doctor, DoctorListResponse } from '@/services/api/types';

export const doctorsApi = {
  /**
   * List all doctors
   */
  listDoctors: async (params?: { page?: number; limit?: number; search?: string; organizationId?: string }): Promise<ApiResponse<DoctorListResponse>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.organizationId) queryParams.append('organizationId', params.organizationId);
    
    const queryString = queryParams.toString();
    return apiRequest<DoctorListResponse>(`/v1/doctors${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },

  /**
   * Get doctor by ID
   */
  getDoctorById: async (id: string): Promise<ApiResponse<Doctor>> => {
    return apiRequest<Doctor>(`/v1/doctors/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Get doctor connected to a specific meeting room
   */
  getDoctorByRoomId: async (roomId: string): Promise<ApiResponse<Doctor>> => {
    return apiRequest<Doctor>(`/v1/webrtc/room/${roomId}/doctor`, {
      method: 'GET',
    });
  },

  /**
   * Approve doctor
   */
  approveDoctor: async (id: string): Promise<ApiResponse> => {
    return apiRequest(`/v1/doctors/${id}/approve`, {
      method: 'POST',
    });
  },

  /**
   * Reject doctor
   */
  rejectDoctor: async (id: string, reason?: string): Promise<ApiResponse> => {
    return apiRequest(`/v1/doctors/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Update doctor (including organization assignment)
   */
  updateDoctor: async (id: string, data: {
    organizationId?: string | null;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    specialization?: string;
    qualifications?: string;
    experience?: number;
    contactNumber?: string;
    address?: string;
    bio?: string;
  }): Promise<ApiResponse<Doctor>> => {
    return apiRequest<Doctor>(`/v1/doctors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Create a new doctor (optionally assign to organization)
   */
  createDoctor: async (data: {
    email: string;
    password: string;
    organizationId?: string | null;
    firstName: string;
    lastName: string;
    specialization: string;
    qualifications: string;
    experience: number;
    contactNumber?: string;
    address?: string;
    bio?: string;
  }): Promise<ApiResponse<Doctor>> => {
    return apiRequest<Doctor>(`/v1/doctors`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
