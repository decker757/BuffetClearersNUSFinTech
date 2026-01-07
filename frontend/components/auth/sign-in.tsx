import { useState } from 'react';
import { Key, AlertCircle, Lock, Database } from 'lucide-react';
import { validatePrivateKey, derivePublicKey } from '../../utils/xrpl-utils';

interface SignInProps {
  onSignIn: (publicKey: string) => void;
  onNavigateToDemoGenerator?: () => void;
}

export function SignIn({ onSignIn, onNavigateToDemoGenerator }: SignInProps) {
  const [privateKey, setPrivateKey] = useState('');
  const [keyError, setKeyError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);
    
    const validation = validatePrivateKey(privateKey.trim());
    
    if (!validation.valid) {
      setKeyError(validation.error || 'Invalid private key');
      setIsValidating(false);
      return;
    }

    // Derive public key from private key
    // In production, use xrpl.js: const wallet = xrpl.Wallet.fromSeed(privateKey)
    const publicKey = derivePublicKey(privateKey.trim());
    
    // Simulate validation delay
    setTimeout(() => {
      onSignIn(publicKey);
      setIsValidating(false);
    }, 500);
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
          <p className="text-xl text-gray-400 mb-4">Enter your XRP private key to continue</p>
          
          <div className="max-w-2xl mx-auto p-3 bg-yellow-950/30 border border-yellow-900/50 rounded-lg">
            <p className="text-sm text-yellow-400">
              <strong>Demo Mode:</strong> This platform uses XRP private keys for demonstration purposes. For production use, implement secure wallet integration and never share private keys.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 bg-gray-900 border border-gray-800 rounded-2xl">
          <div className="mb-6">
            <label htmlFor="privateKey" className="block text-sm text-gray-400 mb-2">
              XRP Private Key
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Key className="w-5 h-5 text-gray-500" />
              </div>
              <input
                id="privateKey"
                type="password"
                value={privateKey}
                onChange={(e) => {
                  setPrivateKey(e.target.value);
                  setKeyError('');
                }}
                placeholder="sXXXXXXXXXXXXXXXXXXXXXXXXXXX"
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
              Your private key is used only to derive your public address and is never stored
            </p>
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
                <strong>Demo Tip:</strong> Use any key starting with 's' (min 25 chars). Examples:
              </p>
              <div className="flex flex-col gap-1 mt-2">
                <code className="text-xs text-gray-400 font-mono">sTestKey123456789INVESTOR</code>
                <code className="text-xs text-gray-400 font-mono">sTestKey123456789ESTABLISHMENT</code>
              </div>
            </div>
          </div>
        </form>

        {/* Security info */}
        <div className="mt-6 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
          <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-400" />
            Secure Authentication
          </h3>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Private key is used to derive your public address</li>
            <li>• Only your public key is stored in the system</li>
            <li>• New users will complete a quick onboarding</li>
            <li>• Returning users go straight to their dashboard</li>
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