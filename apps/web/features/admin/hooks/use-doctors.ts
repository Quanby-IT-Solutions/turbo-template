import { useState, useEffect, useCallback } from 'react';
import { doctorsApi } from '@/features/doctors/api/doctors-api';
import type { Doctor, DoctorListResponse } from '@/services/api/types';

export interface GetDoctorsParams {
  page?: number;
  limit?: number;
  search?: string;
  organizationId?: string;
}

export interface CreateDoctorRequest {
  email: string;
  password: string;
  organizationId?: string | null;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: string;
  dateOfBirth?: string;
  contactNumber: string;
  address?: string;
  bio?: string;
  specialization: string;
  qualifications: string;
  experience: number;
  subscriptionTier?: string;
}

export interface UpdateDoctorRequest {
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
}

export function useDoctors(params?: GetDoctorsParams) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await doctorsApi.listDoctors(params);
      if (response.success && response.data) {
        const data = response.data as DoctorListResponse;
        setDoctors(data.items);
        setPagination({
          total: data.total,
          page: data.page,
          limit: data.limit,
          totalPages: data.totalPages,
        });
      } else {
        setError('Failed to fetch doctors');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch doctors');
    } finally {
      setLoading(false);
    }
  }, [params?.page, params?.limit, params?.search, params?.organizationId]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  return { doctors, loading, error, pagination, refetch: fetchDoctors };
}

export function useDoctor(id: string | null) {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setDoctor(null);
      return;
    }

    const fetchDoctor = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await doctorsApi.getDoctorById(id);
        if (response.success && response.data) {
          setDoctor(response.data);
        } else {
          setError('Failed to fetch doctor');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch doctor');
      } finally {
        setLoading(false);
      }
    };

    fetchDoctor();
  }, [id]);

  return { doctor, loading, error };
}

export function useDoctorMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDoctor = async (data: CreateDoctorRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await doctorsApi.createDoctor(data);
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to create doctor');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create doctor';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateDoctor = async (id: string, data: UpdateDoctorRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await doctorsApi.updateDoctor(id, data);
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update doctor');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update doctor';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteDoctor = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await doctorsApi.deleteDoctor(id);
      if (response.success) {
        return true;
      } else {
        throw new Error(response.message || 'Failed to delete doctor');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete doctor';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const approveDoctor = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await doctorsApi.approveDoctor(id);
      if (response.success) {
        return true;
      } else {
        throw new Error(response.message || 'Failed to approve doctor');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve doctor';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const rejectDoctor = async (id: string, reason?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await doctorsApi.rejectDoctor(id, reason);
      if (response.success) {
        return true;
      } else {
        throw new Error(response.message || 'Failed to reject doctor');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject doctor';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    createDoctor,
    updateDoctor,
    deleteDoctor,
    approveDoctor,
    rejectDoctor,
    loading,
    error,
  };
}
