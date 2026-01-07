/**
 * Utility functions for XRPL key handling
 * In production, use actual xrpl.js library
 */

/**
 * Simulates deriving a public key from a private key
 * In production, use xrpl.Wallet.fromSeed() or similar
 */
export function derivePublicKey(privateKey: string): string {
  // Simple hash function for demo purposes
  // In production: use actual XRPL library to derive the real public key
  let hash = 0;
  for (let i = 0; i < privateKey.length; i++) {
    const char = privateKey.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Format as XRPL-style public key (starts with 'r')
  const hashString = Math.abs(hash).toString(36).toUpperCase();
  return `r${hashString}${privateKey.slice(1, 4).toUpperCase()}${hashString.slice(0, 20)}`;
}

/**
 * Validates XRPL private key format
 */
export function validatePrivateKey(key: string): { valid: boolean; error?: string } {
  if (!key) {
    return { valid: false, error: 'Private key is required' };
  }
  
  if (!key.startsWith('s')) {
    return { valid: false, error: 'XRP private keys typically start with "s"' };
  }
  
  if (key.length < 25) {
    return { valid: false, error: 'Private key appears too short' };
  }
  
  return { valid: true };
}

/**
 * Formats a public key for display (shortened)
 */
export function formatPublicKey(publicKey: string): string {
  if (publicKey.length <= 12) return publicKey;
  return `${publicKey.slice(0, 6)}...${publicKey.slice(-6)}`;
}
