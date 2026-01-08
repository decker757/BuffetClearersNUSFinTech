import { useState } from 'react';
import { Key, AlertCircle, X, CheckCircle } from 'lucide-react';
import * as xrpl from 'xrpl';

interface AcceptNFTModalProps {
  nftokenId: string;
  invoiceNumber: string;
  onClose: () => void;
  onAccept: (nftokenId: string, walletSeed: string) => Promise<void>;
}

export function AcceptNFTModal({ nftokenId, invoiceNumber, onClose, onAccept }: AcceptNFTModalProps) {
  const [seed, setSeed] = useState('');
  const [error, setError] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Validate seed format
      if (!seed.trim().startsWith('s') || seed.trim().length < 25) {
        setError('Invalid seed format. Seeds should start with "s" and be at least 25 characters.');
        return;
      }

      // Validate wallet matches logged-in user
      const wallet = xrpl.Wallet.fromSeed(seed.trim());
      const storedAddress = localStorage.getItem('walletAddress');

      console.log('🔐 Validating seed:');
      console.log('  Derived address:', wallet.address);
      console.log('  Stored address: ', storedAddress);
      console.log('  Derived publicKey:', wallet.publicKey);

      if (wallet.address !== storedAddress) {
        setError('Seed does not match your logged-in wallet address.');
        return;
      }

      console.log('✅ Seed validation passed');

      setIsAccepting(true);
      await onAccept(nftokenId, seed.trim());

      // Modal will be closed by parent component on success
    } catch (error) {
      console.error('Error accepting NFT:', error);
      setError(error instanceof Error ? error.message : 'Failed to accept NFT');
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl text-white">Accept NFT Ownership</h2>
            <p className="text-sm text-gray-400">Invoice #{invoiceNumber}</p>
          </div>
        </div>

        <div className="mb-6 p-4 bg-blue-950/30 border border-blue-900/50 rounded-lg">
          <p className="text-sm text-blue-400 mb-2">
            <strong>What's happening?</strong>
          </p>
          <p className="text-xs text-gray-400">
            This NFT was minted by the debtor and a sell offer was created for you.
            To take ownership on-chain, you need to accept the offer by signing a transaction with your wallet.
          </p>
        </div>

        <form onSubmit={handleAccept}>
          <div className="mb-6">
            <label htmlFor="seed" className="block text-sm text-gray-400 mb-2">
              Your Wallet Seed
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
                  setError('');
                }}
                placeholder="sEdV... (your XRPL wallet seed)"
                className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-600 transition-colors"
                required
                disabled={isAccepting}
              />
            </div>
            {error && (
              <div className="mt-2 text-sm text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Seed is used locally to sign the transaction. Never sent to the server.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
              disabled={isAccepting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAccepting || !seed.trim()}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAccepting ? 'Accepting...' : 'Accept NFT'}
            </button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-yellow-950/30 border border-yellow-900/50 rounded-lg">
          <p className="text-xs text-yellow-400">
            <strong>Gas Fees:</strong> This transaction will consume a small amount of XRP (~0.00001 XRP) from your wallet as a network fee.
          </p>
        </div>
      </div>
    </div>
  );
}
