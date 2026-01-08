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

/**
 * Mint an invoice NFT with image generation and metadata
 */
export async function mintInvoiceNFT(params: {
  invoiceNumber: string;
  faceValue: number;
  maturityDate: string;
  creditorPublicKey: string;
  debtorPublicKey: string;
}): Promise<{
  success: boolean;
  data?: {
    nftokenId: string;
    invoiceNumber: string;
    faceValue: number;
    maturityDate: string;
    imageLink: string;
    metadataUri: string;
    issuer: string;
    recipient: string;
    mintTxHash: string;
    offerIndex: string;
    offerTxHash: string;
  };
  error?: string;
  message?: string;
}> {
  console.log('🔵 Frontend: Calling /nft/mint with params:', params);
  console.log('🔵 Auth token:', localStorage.getItem('authToken')?.slice(0, 20) + '...');

  try {
    const response = await authenticatedFetch('/nft/mint', {
      method: 'POST',
      body: JSON.stringify(params)
    });

    console.log('🔵 Response status:', response.status);

    const data = await response.json();
    console.log('🔵 Response data:', data);

    return data;
  } catch (error) {
    console.error('❌ Frontend API Error:', error);
    throw error;
  }
}
