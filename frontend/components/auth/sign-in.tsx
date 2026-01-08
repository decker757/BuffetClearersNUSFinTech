import { useState } from 'react';
import { Key, AlertCircle, Lock, Database } from 'lucide-react';
import * as xrpl from 'xrpl';
import { sign } from 'ripple-keypairs';
import { toast } from 'sonner';

const BACKEND_URL = 'http://localhost:6767';

interface SignInProps {
  onSignIn: (publicKey: string) => void;
  onNavigateToDemoGenerator?: () => void;
}

export function SignIn({ onSignIn, onNavigateToDemoGenerator }: SignInProps) {
  const [seed, setSeed] = useState('');
  const [keyError, setKeyError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);
    setKeyError('');

    try {
      // Validate seed format
      if (!seed.trim().startsWith('s') || seed.trim().length < 25) {
        setKeyError('Invalid seed format. Seeds should start with "s" and be at least 25 characters.');
        setIsValidating(false);
        return;
      }

      // Create wallet from seed
      const wallet = xrpl.Wallet.fromSeed(seed.trim());

      // Step 1: Request challenge from backend
      const challengeResponse = await fetch(`${BACKEND_URL}/auth/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: wallet.address }),
      });

      if (!challengeResponse.ok) {
        throw new Error('Failed to get authentication challenge');
      }

      const { challenge } = await challengeResponse.json();

      // Step 2: Sign the challenge
      // Convert string to hex using browser APIs
      const encoder = new TextEncoder();
      const messageBytes = encoder.encode(challenge);
      const messageHex = Array.from(messageBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
      const signature = sign(messageHex, wallet.privateKey);

      // Step 3: Verify signature and get JWT token
      const verifyResponse = await fetch(`${BACKEND_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: wallet.address,
          publicKey: wallet.publicKey,
          signature: signature,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error('Authentication failed');
      }

      const { token, address } = await verifyResponse.json();

      // Store token in localStorage
      localStorage.setItem('authToken', token);
      localStorage.setItem('walletAddress', address);

      toast.success('Authentication successful!');

      // Call onSignIn with the wallet's public key (for compatibility with existing flow)
      onSignIn(wallet.publicKey);

    } catch (error) {
      console.error('Sign in error:', error);
      setKeyError(error instanceof Error ? error.message : 'Failed to sign in. Please try again.');
      toast.error('Authentication failed. Please check your seed and try again.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-20">
      {/* Background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl lg:text-5xl mb-4 text-white">
            Sign In to <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">InvoiceNFT</span>
          </h1>
          <p className="text-xl text-gray-400 mb-4">Enter your XRPL wallet seed to continue</p>

          <div className="max-w-2xl mx-auto p-3 bg-yellow-950/30 border border-yellow-900/50 rounded-lg">
            <p className="text-sm text-yellow-400">
              <strong>Testnet Demo:</strong> Using cryptographic wallet authentication. Seed never leaves your browser.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 bg-gray-900 border border-gray-800 rounded-2xl">
          <div className="mb-6">
            <label htmlFor="seed" className="block text-sm text-gray-400 mb-2">
              XRPL Wallet Seed
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Key className="w-5 h-5 text-gray-500" />
              </div>
              <input
                id="seed"
                type="password"
                value={seed}
                onChange={(e) => {
                  setSeed(e.target.value);
                  setKeyError('');
                }}
                placeholder="sEdV... (XRPL testnet seed)"
                className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 transition-colors"
                required
                disabled={isValidating}
              />
            </div>
            {keyError && (
              <div className="mt-2 text-sm text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {keyError}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Seed is used locally to sign authentication challenge. Never sent to the server.
1            </p>
          </div>

          <button
            type="submit"
            disabled={isValidating}
            className="w-full py-3 rounded-lg text-white font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isValidating ? 'Validating...' : 'Sign In'}
          </button>

          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-sm text-gray-400 text-center mb-3">
              New to InvoiceNFT? Your account will be created automatically.
            </p>
            <div className="p-3 bg-blue-950/30 border border-blue-900/50 rounded-lg">
              <p className="text-xs text-blue-400 mb-1">
                <strong>Demo Seeds:</strong> Use generated testnet seeds from your backend
              </p>
              <div className="flex flex-col gap-1 mt-2">
                <code className="text-xs text-gray-400 font-mono">sEdVKBkyJYz1UzRy4o1xnZmsvRLeSFZ (Bakery)</code>
                <code className="text-xs text-gray-400 font-mono">sEdVTLs4jiZh5EpUsvMBTX2yvLMW1M8 (Investor)</code>
              </div>
            </div>
          </div>
        </form>

        {/* Security info */}
        <div className="mt-6 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
          <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-400" />
            Cryptographic Authentication
          </h3>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Challenge-response authentication with cryptographic signatures</li>
            <li>• Seed never leaves your browser - used only to sign challenges</li>
            <li>• Backend verifies signature and issues JWT token (24h expiry)</li>
            <li>• New users complete onboarding, returning users go to dashboard</li>
          </ul>
        </div>

        {/* Demo Data Generator Link */}
        {onNavigateToDemoGenerator && (
          <div className="mt-4">
            <button
              onClick={onNavigateToDemoGenerator}
              className="w-full p-4 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/50 rounded-lg hover:border-green-600/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center group-hover:bg-green-600/30 transition-colors">
                  <Database className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-left flex-1">
                  <h4 className="text-sm font-medium text-white mb-0.5">Need Demo Data?</h4>
                  <p className="text-xs text-gray-400">Generate sample accounts and NFTs for testing</p>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}