/**
 * Super Admin API functions
 */

import { apiRequest } from '@/services/api/client';
import type { ApiResponse } from '@/services/api/types';

export type PatientVerificationStatusType = 'NOT_VERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED'

export interface PatientListItem {
  id: string;
  email: string;
  createdAt: string;
  patientInfo?: {
    firstName: string;
    middleName?: string | null;
    lastName: string;
    verificationStatus: 'NOT_VERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
    verificationStatusUpdatedAt?: string | null;
    verificationRejectionReason?: string | null;
    philHealthId?: string | null;
    philHealthIdImage?: string | null;
    philHealthIdVerified: boolean;
  };
}

export interface PatientListResponse {
  items: PatientListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateVerificationStatusRequest {
  status: 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
}

export const superAdminApi = {
  /**
   * Get patients pending verification
   */
  getPatientsPendingVerification: async (params?: {
    page?: number;
    limit?: number;
    status?: 'NOT_VERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  }): Promise<ApiResponse<PatientListResponse>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    
    const queryString = queryParams.toString();
    return apiRequest<PatientListResponse>(`/v1/super-admin/patients/pending-verification${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },

  /**
   * Update patient verification status
   */
  updatePatientVerificationStatus: async (
    patientId: string,
    data: UpdateVerificationStatusRequest
  ): Promise<ApiResponse> => {
    return apiRequest(`/v1/super-admin/patients/${patientId}/verification-status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};
