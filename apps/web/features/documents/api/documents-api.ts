/**
 * Documents API functions
 */

import type { ApiResponse, DocumentUploadResponse } from '@/services/api/types';

/**
 * Upload a document for a specific ID (e.g., patient ID, doctor ID)
 */
export async function uploadDocument(
  documentId: string,
  file: File
): Promise<ApiResponse<DocumentUploadResponse>> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`/api/documents/${documentId}/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include', // Required for Better Auth session cookies
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error?.message || 'Failed to upload document',
        error: data.error?.code || 'UPLOAD_ERROR',
      };
    }

    return {
      success: true,
      message: 'Document uploaded successfully',
      data: data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Network error occurred',
      error: 'NETWORK_ERROR',
    };
  }
}

export const documentsApi = {
  /**
   * Upload a document
   */
  upload: uploadDocument,
};
