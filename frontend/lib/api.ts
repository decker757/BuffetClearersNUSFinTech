const BACKEND_URL = 'http://localhost:6767';

/**
 * Make an authenticated API request to the backend
 */
export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem('authToken');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // If token expired, clear it
  if (response.status === 403 || response.status === 401) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('walletAddress');
  }

  return response;
}

/**
 * Get the current authentication token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

/**
 * Get the current wallet address
 */
export function getWalletAddress(): string | null {
  return localStorage.getItem('walletAddress');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Sign out the user
 */
export function signOut(): void {
  localStorage.removeItem('authToken');
  localStorage.removeItem('walletAddress');
}
