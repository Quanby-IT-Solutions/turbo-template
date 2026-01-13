/**
 * Patients API functions
 */

import { apiRequest } from '@/services/api/client';
import type { ApiResponse } from '@/services/api/types';

export interface UpdatePatientRequest {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  contactNumber?: string;
  address?: string;
  weight?: number;
  height?: number;
  bloodType?: string;
  medicalHistory?: string;
  allergies?: string;
  medications?: string;
  philHealthId?: string;
  philHealthStatus?: string;
  philHealthCategory?: string;
  philHealthExpiry?: string;
  philHealthMemberSince?: string;
  philHealthIdImage?: string | null;
  profilePicture?: string | null;
}

export interface PatientInfo {
  id: string;
  email: string;
  patientInfo?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    gender?: string;
    dateOfBirth?: string;
    contactNumber?: string;
    address?: string;
    weight?: number;
    height?: number;
    bloodType?: string;
    medicalHistory?: string;
    allergies?: string;
    medications?: string;
    philHealthId?: string;
    philHealthStatus?: string;
    philHealthCategory?: string;
    philHealthExpiry?: string;
    philHealthMemberSince?: string;
    philHealthIdImage?: string | null;
  };
}

export interface ListPatientsResponse {
  items: PatientInfo[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const patientsApi = {
  /**
   * List patients with optional filtering
   */
  listPatients: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    organizationId?: string;
  }): Promise<ApiResponse<ListPatientsResponse>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.organizationId) queryParams.append('organizationId', params.organizationId);
    
    const queryString = queryParams.toString();
    const url = `/v1/patients${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<ListPatientsResponse>(url, {
      method: 'GET',
    });
  },

  /**
   * Get patient information by patient ID
   */
  getPatientById: async (patientId: string): Promise<ApiResponse<PatientInfo>> => {
    return apiRequest<PatientInfo>(`/v1/patients/${patientId}`, {
      method: 'GET',
    });
  },

  /**
   * Get patient ID from room ID (for doctors to get patient in their room)
   */
  getPatientByRoomId: async (roomId: string): Promise<ApiResponse<PatientInfo>> => {
    return apiRequest<PatientInfo>(`/v1/webrtc/room/${roomId}/patient`, {
      method: 'GET',
    });
  },

  /**
   * Update patient information
   */
  updatePatient: async (
    patientId: string,
    data: UpdatePatientRequest
  ): Promise<ApiResponse> => {
    return apiRequest(`/v1/patients/${patientId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete patient
   */
  deletePatient: async (patientId: string): Promise<ApiResponse> => {
    return apiRequest(`/v1/patients/${patientId}`, {
      method: 'DELETE',
    });
  },
};
