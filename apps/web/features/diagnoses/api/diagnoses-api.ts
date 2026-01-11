/**
 * Diagnoses API functions
 */

import { apiRequest } from '@/services/api/client';
import type { ApiResponse } from '@/services/api/types';

export type DiagnosisSeverity = 'MILD' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
export type DiagnosisStatus = 'ACTIVE' | 'RESOLVED' | 'CHRONIC' | 'SUSPECTED' | 'RULED_OUT';

export interface Diagnosis {
  id: string;
  patientId: string;
  doctorId: string;
  consultationId?: string | null;
  diagnosisCode?: string | null;
  diagnosisName: string;
  description?: string | null;
  severity: DiagnosisSeverity;
  status: DiagnosisStatus;
  onsetDate?: string | null;
  diagnosedAt: string;
  resolvedAt?: string | null;
  notes?: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiagnosisRequest {
  patientId: string;
  consultationId?: string | null;
  roomId?: string | null;
  diagnosisCode?: string | null;
  diagnosisName: string;
  description?: string | null;
  severity?: DiagnosisSeverity;
  status?: DiagnosisStatus;
  onsetDate?: string | null;
  resolvedAt?: string | null;
  notes?: string | null;
  isPrimary?: boolean;
}

export const diagnosesApi = {
  createDiagnosis: async (data: CreateDiagnosisRequest): Promise<ApiResponse<Diagnosis>> => {
    return apiRequest<Diagnosis>('/v1/diagnoses/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getPatientDiagnoses: async (patientId: string): Promise<ApiResponse<Diagnosis[]>> => {
    return apiRequest<Diagnosis[]>(`/v1/diagnoses/patient/${patientId}`, { method: 'GET' });
  },
  getDoctorDiagnoses: async (): Promise<ApiResponse<Diagnosis[]>> => {
    return apiRequest<Diagnosis[]>('/v1/diagnoses/doctor', { method: 'GET' });
  },

  /**
   * Get diagnoses for a room/meet
   */
  getRoomDiagnoses: async (roomId: string): Promise<ApiResponse<Diagnosis[]>> => {
    return apiRequest<Diagnosis[]>(`/v1/diagnoses/room/${roomId}`, { method: 'GET' });
  },
};
