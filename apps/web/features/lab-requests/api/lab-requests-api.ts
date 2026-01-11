/**
 * Lab Requests API
 */

import { apiRequest } from '@/services/api/client';
import type { ApiResponse } from '@/services/api/types';

export type LabRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface LabRequest {
  id: string;
  patientId: string;
  organizationId?: string | null;
  doctorId?: string | null;
  roomId?: string | null;
  note?: string | null;
  requestedTests?: string | null;
  instructions?: string | null;
  createdBy: string;
  updatedBy?: string | null;
  status: LabRequestStatus;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLabRequest {
  patientId: string;
  organizationId?: string;
  doctorId?: string; // optional override; backend uses token doctor if not supplied
  note?: string | null;
  priority?: Priority;
  roomId?: string | null;
  requestedTests?: string | null;
  instructions?: string | null;
}

export const labRequestsApi = {
  createLabRequest: async (data: CreateLabRequest): Promise<ApiResponse<LabRequest>> => {
    return apiRequest<LabRequest>('/v1/lab-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getPatientLabRequests: async (patientId: string): Promise<ApiResponse<LabRequest[]>> => {
    return apiRequest<LabRequest[]>(`/v1/lab-requests/patient/${patientId}`, { method: 'GET' });
  },
  getDoctorLabRequests: async (doctorId: string): Promise<ApiResponse<LabRequest[]>> => {
    return apiRequest<LabRequest[]>(`/v1/lab-requests/doctor/${doctorId}`, { method: 'GET' });
  },
  getLabRequestById: async (id: string): Promise<ApiResponse<LabRequest>> => {
    return apiRequest<LabRequest>(`/v1/lab-requests/${id}`, { method: 'GET' });
  },

  /**
   * Get lab requests for a room/meet
   */
  getRoomLabRequests: async (roomId: string): Promise<ApiResponse<LabRequest[]>> => {
    return apiRequest<LabRequest[]>(`/v1/lab-requests/room/${roomId}`, { method: 'GET' });
  },
};
