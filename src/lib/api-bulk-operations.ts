/**
 * Client-side helper functions for calling bulk operation APIs
 * These functions handle authentication and API communication
 */

import { User } from 'firebase/auth';

interface BulkOperationResponse {
  success: boolean;
  processed: number;
  message: string;
  error?: string;
}

/**
 * Get ID token from current user for API authentication
 */
async function getAuthToken(user: User | null): Promise<string> {
  if (!user) {
    throw new Error('User not authenticated');
  }
  return await user.getIdToken();
}

/**
 * Import products via API endpoint
 * @param user - Current authenticated user
 * @param products - Array of products to import
 * @param onProgress - Optional callback for progress updates
 * @returns Promise with operation result
 */
export async function importProductsViaAPI(
  user: User | null,
  products: any[],
  onProgress?: (progress: number) => void
): Promise<BulkOperationResponse> {
  try {
    const token = await getAuthToken(user);

    const response = await fetch('/api/import-products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ products }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Import failed');
    }

    const result = await response.json();
    if (onProgress) {
      onProgress(100); // Mark as complete
    }
    return result;
  } catch (error) {
    console.error('API import error:', error);
    throw error;
  }
}

/**
 * Bulk delete (move to trash) via API endpoint
 * @param user - Current authenticated user
 * @param ids - Array of document IDs to delete
 * @param collection - Collection name
 * @param onProgress - Optional callback for progress updates
 * @returns Promise with operation result
 */
export async function bulkDeleteViaAPI(
  user: User | null,
  ids: string[],
  collection: string,
  onProgress?: (progress: number) => void
): Promise<BulkOperationResponse> {
  try {
    const token = await getAuthToken(user);

    const response = await fetch('/api/bulk-delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ ids, collection }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Delete failed');
    }

    const result = await response.json();
    if (onProgress) {
      onProgress(100); // Mark as complete
    }
    return result;
  } catch (error) {
    console.error('API delete error:', error);
    throw error;
  }
}

/**
 * Bulk restore (from trash) via API endpoint
 * @param user - Current authenticated user
 * @param ids - Array of document IDs to restore
 * @param collection - Collection name
 * @param onProgress - Optional callback for progress updates
 * @returns Promise with operation result
 */
export async function bulkRestoreViaAPI(
  user: User | null,
  ids: string[],
  collection: string,
  onProgress?: (progress: number) => void
): Promise<BulkOperationResponse> {
  try {
    const token = await getAuthToken(user);

    const response = await fetch('/api/bulk-restore', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ ids, collection }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Restore failed');
    }

    const result = await response.json();
    if (onProgress) {
      onProgress(100); // Mark as complete
    }
    return result;
  } catch (error) {
    console.error('API restore error:', error);
    throw error;
  }
}
