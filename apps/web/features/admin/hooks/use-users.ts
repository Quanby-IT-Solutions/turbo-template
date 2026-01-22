import { useState, useEffect } from 'react';
import { usersApi, type User, type CreateUserRequest, type UpdateUserRequest, type GetUsersParams } from '../api/users-api';

export function useUsers(params?: GetUsersParams) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersApi.getUsers(params);
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        setError('Failed to fetch users');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [params?.page, params?.limit, params?.search, params?.role]);

  return { users, loading, error, refetch: fetchUsers };
}

export function useUser(id: string | null) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setUser(null);
      return;
    }

    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await usersApi.getUserById(id);
        if (response.success && response.data) {
          setUser(response.data);
        } else {
          setError('Failed to fetch user');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  return { user, loading, error };
}

export function useUserMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createUser = async (data: CreateUserRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersApi.createUser(data);
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error('Failed to create user');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (id: string, data: UpdateUserRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersApi.updateUser(id, data);
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error('Failed to update user');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersApi.deleteUser(id);
      if (response.success) {
        return true;
      } else {
        throw new Error('Failed to delete user');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deactivateUser = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersApi.deactivateUser(id);
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error('Failed to deactivate user');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deactivate user';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const activateUser = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersApi.activateUser(id);
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error('Failed to activate user');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to activate user';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (id: string, newPassword: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersApi.resetPassword(id, { newPassword });
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error('Failed to reset password');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    createUser,
    updateUser,
    deleteUser,
    deactivateUser,
    activateUser,
    resetPassword,
    loading,
    error,
  };
}
