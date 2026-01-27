import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  doctorSchedulesApi,
  type DoctorSchedule,
  type CreateDoctorScheduleRequest,
  type UpdateDoctorScheduleRequest,
  type DoctorScheduleQueryParams,
} from '../api/doctor-schedules-api';

/**
 * Hook to fetch all doctor schedules
 */
export function useDoctorSchedules(params?: DoctorScheduleQueryParams) {
  return useQuery({
    queryKey: ['admin', 'doctor-schedules', params],
    queryFn: async () => {
      const response = await doctorSchedulesApi.getSchedules(params);
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch doctor schedules');
      }
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch a single doctor schedule by ID
 */
export function useDoctorSchedule(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'doctor-schedules', id],
    queryFn: async () => {
      if (!id) throw new Error('Schedule ID is required');
      const response = await doctorSchedulesApi.getScheduleById(id);
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch doctor schedule');
      }
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to create a new doctor schedule
 */
export function useCreateDoctorSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDoctorScheduleRequest) => {
      const response = await doctorSchedulesApi.createSchedule(data);
      if (!response.success) {
        throw new Error(response.message || 'Failed to create doctor schedule');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'doctor-schedules'] });
      toast.success('Doctor schedule created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create doctor schedule');
    },
  });
}

/**
 * Hook to update a doctor schedule
 */
export function useUpdateDoctorSchedule(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateDoctorScheduleRequest) => {
      const response = await doctorSchedulesApi.updateSchedule(id, data);
      if (!response.success) {
        throw new Error(response.message || 'Failed to update doctor schedule');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'doctor-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'doctor-schedules', id] });
      toast.success('Doctor schedule updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update doctor schedule');
    },
  });
}

/**
 * Hook to delete a doctor schedule
 */
export function useDeleteDoctorSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await doctorSchedulesApi.deleteSchedule(id);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete doctor schedule');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'doctor-schedules'] });
      toast.success('Doctor schedule deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete doctor schedule');
    },
  });
}
