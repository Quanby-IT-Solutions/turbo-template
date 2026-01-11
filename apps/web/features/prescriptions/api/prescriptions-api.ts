/**
 * Prescriptions API functions
 */

import { apiRequest } from '@/services/api/client';
import type { ApiResponse } from '@/services/api/types';

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  consultationId?: string | null;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string | null;
  quantity?: number | null;
  refills: number;
  isActive: boolean;
  prescribedAt: string;
  expiresAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: {
    id: string;
    email: string;
    patientInfo?: {
      firstName?: string;
      middleName?: string;
      lastName?: string;
    };
  };
  doctor?: {
    id: string;
    email: string;
    doctorInfo?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

export interface CreatePrescriptionRequest {
  patientId: string;
  consultationId?: string | null;
  roomId?: string | null;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string | null;
  quantity?: number | null;
  refills?: number;
  expiresAt?: string | null;
  notes?: string | null;
}

export interface PatientOption {
  id: string;
  email: string;
  patientInfo?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
  };
}

export const prescriptionsApi = {
  /**
   * Get available patients for prescription (doctors only)
   */
  getAvailablePatients: async (): Promise<ApiResponse<PatientOption[]>> => {
    return apiRequest<PatientOption[]>('/v1/prescriptions/patients', {
      method: 'GET',
    });
  },

  /**
   * Create a new prescription
   */
  createPrescription: async (
    data: CreatePrescriptionRequest
  ): Promise<ApiResponse<Prescription>> => {
    return apiRequest<Prescription>('/v1/prescriptions/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get prescriptions for a specific patient
   */
  getPatientPrescriptions: async (
    patientId: string
  ): Promise<ApiResponse<Prescription[]>> => {
    return apiRequest<Prescription[]>(`/v1/prescriptions/patient/${patientId}`, {
      method: 'GET',
    });
  },

  /**
   * Get prescriptions by a specific doctor
   */
  getDoctorPrescriptions: async (
    doctorId: string
  ): Promise<ApiResponse<Prescription[]>> => {
    return apiRequest<Prescription[]>(`/v1/prescriptions/doctor/${doctorId}`, {
      method: 'GET',
    });
  },

  /**
   * Get prescriptions for a room/meet
   */
  getRoomPrescriptions: async (
    roomId: string
  ): Promise<ApiResponse<Prescription[]>> => {
    return apiRequest<Prescription[]>(`/v1/prescriptions/room/${roomId}`, {
      method: 'GET',
    });
  },

  /**
   * Get prescription by ID
   */
  getPrescriptionById: async (
    prescriptionId: string
  ): Promise<ApiResponse<Prescription>> => {
    return apiRequest<Prescription>(`/v1/prescriptions/${prescriptionId}`, {
      method: 'GET',
    });
  },

  /**
   * Get prescriptions for a consultation
   */
  getConsultationPrescriptions: async (
    consultationId: string
  ): Promise<ApiResponse<Prescription[]>> => {
    return apiRequest<Prescription[]>(
      `/v1/prescriptions/consultation/${consultationId}`,
      {
        method: 'GET',
      }
    );
  },
};
