import { useState } from 'react';
import { Building2, TrendingUp, ArrowRight, CheckCircle, Copy, Check, AlertCircle } from 'lucide-react';
import { formatPublicKey } from '../../utils/xrpl-utils';

export type UserRole = 'investor' | 'establishment';

interface OnboardingProps {
  publicKey: string;
  onComplete: (role: UserRole, username: string) => void;
}

export function Onboarding({ publicKey, onComplete }: OnboardingProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [username, setUsername] = useState('');
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [copied, setCopied] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep('details');
  };

  const handleCopyPublicKey = () => {
    navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole && username.trim()) {
      onComplete(selectedRole, username.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-20">
      {/* Background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 'role' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
              }`}>
                {step === 'details' ? <CheckCircle className="w-5 h-5" /> : '1'}
              </div>
              <span className={step === 'role' ? 'text-white' : 'text-green-400'}>Choose Role</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-700"></div>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 'details' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
              }`}>
                2
              </div>
              <span className={step === 'details' ? 'text-white' : 'text-gray-400'}>Your Details</span>
            </div>
          </div>
          
          <h1 className="text-4xl lg:text-5xl mb-4 text-white">
            Welcome to <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">InvoiceNFT</span>
          </h1>
          <p className="text-xl text-gray-400 mb-4">
            {step === 'role' ? 'Choose your account type to get started' : 'Tell us a bit about yourself'}
          </p>

          {/* Public Key Display */}
          <div className="max-w-md mx-auto p-4 bg-gray-900 border border-gray-800 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">Your Public Address</div>
            <div className="flex items-center justify-between gap-2">
              <code className="text-sm text-blue-400 font-mono">{formatPublicKey(publicKey)}</code>
              <button
                onClick={handleCopyPublicKey}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                title="Copy full address"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {step === 'role' ? (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Investor Option */}
            <button
              onClick={() => handleRoleSelect('investor')}
              className="group relative p-8 bg-gray-900 border-2 border-gray-800 rounded-2xl hover:border-blue-600 transition-all duration-300 text-left"
            >
              <div className="flex flex-col items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl mb-2 text-white">Investor</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Browse invoice NFTs in the marketplace, place bids on auctions, and earn fixed returns on your investments.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-blue-400 group-hover:gap-3 transition-all">
                  <span>Continue as Investor</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </button>

            {/* Establishment Option */}
            <button
              onClick={() => handleRoleSelect('establishment')}
              className="group relative p-8 bg-gray-900 border-2 border-gray-800 rounded-2xl hover:border-purple-600 transition-all duration-300 text-left"
            >
              <div className="flex flex-col items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl mb-2 text-white">Establishment</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Acknowledge invoice debts, mint receivables as NFTs, and auction them for immediate liquidity.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-purple-400 group-hover:gap-3 transition-all">
                  <span>Continue as Establishment</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </button>
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="p-8 bg-gray-900 border border-gray-800 rounded-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  selectedRole === 'investor' 
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700' 
                    : 'bg-gradient-to-br from-purple-600 to-purple-700'
                }`}>
                  {selectedRole === 'investor' ? (
                    <TrendingUp className="w-6 h-6 text-white" />
                  ) : (
                    <Building2 className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl text-white capitalize">{selectedRole}</h3>
                  <p className="text-sm text-gray-400">Complete your profile</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="username" className="block text-sm text-gray-400 mb-2">
                    {selectedRole === 'investor' ? 'Display Name' : 'Company Name'}
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={selectedRole === 'investor' ? 'Enter your name' : 'Enter company name'}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 transition-colors"
                    required
                  />
                </div>

                {/* RLUSD Trust Line Requirement */}
                <div className="p-4 bg-amber-950/30 border border-amber-900/50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-400 mb-2">RLUSD Trust Line Required</h4>
                      <p className="text-xs text-amber-200/70 mb-3 leading-relaxed">
                        Before using this platform, you must set up a trust line to RLUSD (Ripple's USD stablecoin) in your XRPL wallet. This allows you to {selectedRole === 'investor' ? 'pay for invoice NFTs and receive returns' : 'receive payment from NFT sales'}.
                      </p>
                      <div className="space-y-2 text-xs text-amber-200/70">
                        <p className="font-medium text-amber-300">Setup Instructions:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Open your XRPL wallet (XUMM, Crossmark, etc.)</li>
                          <li>Navigate to \"Trust Lines\" or \"Assets\"</li>
                          <li>Add a new trust line with these details:</li>
                        </ol>
                        <div className="mt-2 p-2 bg-gray-900/50 rounded border border-amber-900/30 font-mono text-xs">
                          <div className="mb-1"><span className="text-gray-400">Currency:</span> <span className="text-white">RLUSD</span></div>
                          <div className="mb-1"><span className="text-gray-400">Issuer:</span> <span className="text-white break-all">rN7n7otQDd6FczFgLdlqtyMVrn3HMfXo4j</span></div>
                          <div><span className="text-gray-400">Limit:</span> <span className="text-white">1000000</span> (or your preferred max)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Show public key again */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Public Address (Auto-generated)
                  </label>
                  <div className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg">
                    <code className="text-sm text-blue-400 font-mono break-all">{publicKey}</code>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    This is your unique identifier on the XRPL network
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className={`w-full py-3 rounded-lg text-white font-medium transition-opacity hover:opacity-90 ${
                  selectedRole === 'investor'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700'
                    : 'bg-gradient-to-r from-purple-600 to-purple-700'
                }`}
              >
                Complete Setup
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('role');
                  setSelectedRole(null);
                  setUsername('');
                }}
                className="w-full mt-3 py-3 text-gray-400 hover:text-white transition-colors"
              >
                Back to role selection
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}