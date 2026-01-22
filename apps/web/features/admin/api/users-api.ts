import { apiRequest } from '@/services/api/client';
import type { ApiResponse } from '@/services/api/types';

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role: 'DOCTOR' | 'PATIENT' | 'ADMIN' | 'SUPER_ADMIN' | 'ORGANIZATION';
  organizationId?: string | null;
  createdAt: string;
  updatedAt: string;
  profilePicture?: string | null;
  profilePictureVerified: boolean;
  profilePictureVerifiedBy?: string | null;
  profilePictureVerifiedAt?: string | null;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: 'DOCTOR' | 'PATIENT' | 'ADMIN' | 'SUPER_ADMIN' | 'ORGANIZATION';
  organizationId?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: 'DOCTOR' | 'PATIENT' | 'ADMIN' | 'SUPER_ADMIN' | 'ORGANIZATION';
  organizationId?: string | null;
  emailVerified?: boolean;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'DOCTOR' | 'PATIENT' | 'ADMIN' | 'SUPER_ADMIN' | 'ORGANIZATION';
}

export const usersApi = {
  /**
   * Get all users
   */
  async getUsers(params?: GetUsersParams): Promise<ApiResponse<User[]>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.role) searchParams.append('role', params.role);
    
    const queryString = searchParams.toString();
    return apiRequest<User[]>(`/v1/users${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<ApiResponse<User>> {
    return apiRequest<User>(`/v1/users/${id}`);
  },

  /**
   * Create a new user
   */
  async createUser(data: CreateUserRequest): Promise<ApiResponse<User>> {
    return apiRequest<User>('/v1/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a user
   */
  async updateUser(id: string, data: UpdateUserRequest): Promise<ApiResponse<User>> {
    return apiRequest<User>(`/v1/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a user
   */
  async deleteUser(id: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/v1/users/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Deactivate a user
   */
  async deactivateUser(id: string): Promise<ApiResponse<User>> {
    return apiRequest<User>(`/v1/users/${id}/deactivate`, {
      method: 'PATCH',
    });
  },

  /**
   * Activate a user
   */
  async activateUser(id: string): Promise<ApiResponse<User>> {
    return apiRequest<User>(`/v1/users/${id}/activate`, {
      method: 'PATCH',
    });
  },

  /**
   * Reset user password
   */
  async resetPassword(id: string, data: ResetPasswordRequest): Promise<ApiResponse<User>> {
    return apiRequest<User>(`/v1/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
