import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { organizationSettingsApi, type UpdateOrganizationSettingsRequest } from '../api/organization-settings-api';

export function useOrganizationSettings(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organization-settings', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('Organization ID is required');
      const response = await organizationSettingsApi.getSettings(organizationId);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to load settings');
      }
      return response.data;
    },
    enabled: !!organizationId,
    retry: false,
  });
}

export function useUpdateOrganizationSettings(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateOrganizationSettingsRequest) => {
      if (!organizationId) throw new Error('Organization ID is required');
      const response = await organizationSettingsApi.upsertSettings(organizationId, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-settings', organizationId] });
      toast.success('Settings updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update settings');
    },
  });
}

export function useDeleteOrganizationSettings(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('Organization ID is required');
      const response = await organizationSettingsApi.deleteSettings(organizationId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-settings', organizationId] });
      toast.success('Settings deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete settings');
    },
  });
}
