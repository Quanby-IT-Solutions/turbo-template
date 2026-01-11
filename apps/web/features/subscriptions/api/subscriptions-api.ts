/**
 * Subscriptions API functions
 */

import { apiRequest } from '@/services/api/client';
import type { ApiResponse } from '@/services/api/types';

export type SubscriptionTier = 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE' | 'T';
export type SubscriptionEntityType = 'ORGANIZATION' | 'DOCTOR' | 'PATIENT';

export interface OrganizationSubscription {
  id: string;
  name: string;
  subscriptionTier: SubscriptionTier;
  maxDoctors: number | null;
  maxPatientsPerDoctor?: number | null;
  maxFaceScansPerDoctor?: number | null;
  currentDoctors: number;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  isSubscriptionActive: boolean;
  _count?: {
    users: number;
  };
}

export interface DoctorSubscription {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  subscriptionTier: SubscriptionTier;
  maxPatients: number | null;
  currentPatients: number;
  maxFaceScans: number | null;
  currentFaceScans: number;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  isSubscriptionActive: boolean;
  user: {
    id: string;
    email: string;
    organizationId: string | null;
    organization: {
      id: string;
      name: string;
    } | null;
  };
}

export interface PatientSubscription {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  subscriptionTier: SubscriptionTier;
  maxFaceScans: number | null;
  currentFaceScans: number;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  isSubscriptionActive: boolean;
  user: {
    id: string;
    email: string;
  };
}

export interface SubscriptionsResponse {
  organizations: OrganizationSubscription[];
  doctors: DoctorSubscription[];
  patients: PatientSubscription[];
}

export interface SubscriptionStatistics {
  organizations: Array<{
    subscriptionTier: SubscriptionTier;
    _count: { id: number };
  }>;
  doctors: Array<{
    subscriptionTier: SubscriptionTier;
    _count: { id: number };
  }>;
  patients: Array<{
    subscriptionTier: SubscriptionTier;
    _count: { id: number };
  }>;
}

export interface SubscriptionTierSetting {
  id: string;
  tier: SubscriptionTier;
  entityType: SubscriptionEntityType;
  displayName: string;
  description?: string | null;
  maxDoctors?: number | null;
  maxPatients?: number | null;
  maxFaceScans?: number | null;
  maxPatientsPerDoctor?: number | null;
  maxFaceScansPerDoctor?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TierSettingsResponse {
  items: SubscriptionTierSetting[];
}

export interface TierSettingRequest {
  tier: SubscriptionTier;
  entityType: SubscriptionEntityType;
  displayName: string;
  description?: string;
  maxDoctors?: number | null;
  maxPatients?: number | null;
  maxFaceScans?: number | null;
  maxPatientsPerDoctor?: number | null;
  maxFaceScansPerDoctor?: number | null;
}

export type TierSettingUpdateRequest = Partial<Omit<TierSettingRequest, 'tier' | 'entityType'>> & {
  displayName?: string;
};

export interface UpdateSubscriptionRequest {
  subscriptionTier: SubscriptionTier;
  maxDoctors?: number | null;
  maxPatientsPerDoctor?: number | null;
  maxFaceScansPerDoctor?: number | null;
  maxPatients?: number | null;
  maxFaceScans?: number | null;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  isSubscriptionActive?: boolean;
}

export const subscriptionsApi = {
  /**
   * Get all subscriptions
   */
  getAllSubscriptions: async (params?: {
    type?: 'organization' | 'doctor' | 'patient';
    tier?: SubscriptionTier;
    activeOnly?: boolean;
  }): Promise<ApiResponse<SubscriptionsResponse>> => {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.tier) queryParams.append('tier', params.tier);
    if (params?.activeOnly !== undefined) queryParams.append('activeOnly', params.activeOnly.toString());
    
    const queryString = queryParams.toString();
    return apiRequest<SubscriptionsResponse>(`/v1/subscriptions${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },

  /**
   * Get subscription statistics
   */
  getSubscriptionStatistics: async (): Promise<ApiResponse<SubscriptionStatistics>> => {
    return apiRequest<SubscriptionStatistics>('/v1/subscriptions/statistics', {
      method: 'GET',
    });
  },

  /**
   * Get subscription by ID
   */
  getSubscriptionById: async (
    type: 'organization' | 'doctor' | 'patient',
    id: string
  ): Promise<ApiResponse<OrganizationSubscription | DoctorSubscription | PatientSubscription>> => {
    return apiRequest(`/v1/subscriptions/${type}/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Update organization subscription
   */
  updateOrganizationSubscription: async (
    organizationId: string,
    data: UpdateSubscriptionRequest
  ): Promise<ApiResponse<OrganizationSubscription>> => {
    return apiRequest(`/v1/subscriptions/organization/${organizationId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update doctor subscription
   */
  updateDoctorSubscription: async (
    doctorId: string,
    data: UpdateSubscriptionRequest
  ): Promise<ApiResponse<DoctorSubscription>> => {
    return apiRequest(`/v1/subscriptions/doctor/${doctorId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update patient subscription
   */
  updatePatientSubscription: async (
    patientId: string,
    data: UpdateSubscriptionRequest
  ): Promise<ApiResponse<PatientSubscription>> => {
    return apiRequest(`/v1/subscriptions/patient/${patientId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * List tier settings
   */
  listTierSettings: async (params?: {
    tier?: SubscriptionTier;
    entityType?: SubscriptionEntityType;
  }): Promise<ApiResponse<SubscriptionTierSetting[]>> => {
    const queryParams = new URLSearchParams();
    if (params?.tier) queryParams.append('tier', params.tier);
    if (params?.entityType) queryParams.append('entityType', params.entityType);
    const queryString = queryParams.toString();
    return apiRequest<SubscriptionTierSetting[]>(`/v1/subscription-tiers${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
    });
  },

  /**
   * List public (unauthenticated) tier settings for signup
   */
  listPublicTierSettings: async (): Promise<ApiResponse<SubscriptionTierSetting[]>> => {
    return apiRequest<SubscriptionTierSetting[]>('/v1/subscription-tiers/public', {
      method: 'GET',
    });
  },

  /**
   * Create a tier setting
   */
  createTierSetting: async (
    data: TierSettingRequest
  ): Promise<ApiResponse<SubscriptionTierSetting>> => {
    return apiRequest('/v1/subscription-tiers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update tier setting
   */
  updateTierSetting: async (
    id: string,
    data: TierSettingUpdateRequest
  ): Promise<ApiResponse<SubscriptionTierSetting>> => {
    return apiRequest(`/v1/subscription-tiers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete tier setting
   */
  deleteTierSetting: async (id: string): Promise<ApiResponse> => {
    return apiRequest(`/v1/subscription-tiers/${id}`, {
      method: 'DELETE',
    });
  },
};
