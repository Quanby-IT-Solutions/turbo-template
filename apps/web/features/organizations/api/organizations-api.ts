import { apiRequest } from '@/services/api/client';
import type { ApiResponse } from '@/services/api/types';

export interface Organization {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  isActive: boolean;
  subscriptionTier: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE' | 'T';
  maxDoctors?: number | null;
  maxPatientsPerDoctor?: number | null;
  maxFaceScansPerDoctor?: number | null;
  currentDoctors: number;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  isSubscriptionActive: boolean;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvalStatusUpdatedBy?: string | null;
  approvalStatusUpdatedAt?: string | null;
  approvalRejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  doctorCount?: number;
  patientCount?: number;
}

export interface CreateOrganizationRequest {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  subscriptionTier?: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE' | 'T';
  maxDoctors?: number;
  maxPatientsPerDoctor?: number;
  maxFaceScansPerDoctor?: number;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
}

export interface UpdateOrganizationRequest extends Partial<CreateOrganizationRequest> {
  isActive?: boolean;
}

export interface OrganizationStatistics {
  totalOrganizations: number;
  activeOrganizations: number;
  totalDoctors: number;
  totalPatients: number;
}

export const organizationsApi = {
  /**
   * Get all organizations
   */
  async getOrganizations(activeOnly?: boolean): Promise<ApiResponse<Organization[]>> {
    const params = activeOnly !== undefined ? `?activeOnly=${activeOnly}` : '';
    return apiRequest<Organization[]>(`/v1/organizations${params}`);
  },

  /**
   * Get organization by ID
   */
  async getOrganizationById(id: string): Promise<ApiResponse<Organization>> {
    return apiRequest<Organization>(`/v1/organizations/${id}`);
  },

  /**
   * Create a new organization
   */
  async createOrganization(data: CreateOrganizationRequest): Promise<ApiResponse<Organization>> {
    return apiRequest<Organization>('/v1/organizations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an organization
   */
  async updateOrganization(
    id: string,
    data: UpdateOrganizationRequest
  ): Promise<ApiResponse<Organization>> {
    return apiRequest<Organization>(`/v1/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete an organization
   */
  async deleteOrganization(id: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/v1/organizations/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Toggle organization status
   */
  async toggleOrganizationStatus(
    id: string,
    isActive: boolean
  ): Promise<ApiResponse<Organization>> {
    return apiRequest<Organization>(`/v1/organizations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  /**
   * Get organization statistics
   */
  async getStatistics(): Promise<ApiResponse<OrganizationStatistics>> {
    return apiRequest<OrganizationStatistics>('/v1/organizations/statistics');
  },

  /**
   * Approve an organization (super admin)
   */
  async approveOrganization(id: string): Promise<ApiResponse<Organization>> {
    return apiRequest<Organization>(`/v1/organizations/${id}/approve`, {
      method: 'POST',
    });
  },

  /**
   * Reject an organization (super admin)
   */
  async rejectOrganization(id: string, reason?: string): Promise<ApiResponse<Organization>> {
    return apiRequest<Organization>(`/v1/organizations/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};
