import { useState } from 'react';
import { X, TrendingUp, Key } from 'lucide-react';
import { NFToken } from '../../lib/supabase';

export function ListTokenModal({
  token,
  onClose,
  onList
}: {
  token: NFToken;
  onClose: () => void;
  onList: (tokenId: string, listingPrice: number, auctionExpiry: string, walletSeed: string) => void;
}) {
  const [formData, setFormData] = useState({
    listingPrice: '',
    auctionExpiry: '',
    walletSeed: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onList(token.nftoken_id, parseFloat(formData.listingPrice), formData.auctionExpiry, formData.walletSeed);
  };

  const discountPercentage = formData.listingPrice && token.face_value
    ? ((token.face_value - parseFloat(formData.listingPrice)) / token.face_value * 100).toFixed(2)
    : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-2xl text-white">List on Auction</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Token Info */}
          <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">NFT ID</span>
                <span className="text-white font-mono text-sm">{token.nftoken_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Invoice Number</span>
                <span className="text-white">{token.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Face Value</span>
                <span className="text-white">{token.face_value?.toLocaleString()} RLUSD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Maturity Date</span>
                <span className="text-white">
                  {token.maturity_date ? new Date(token.maturity_date).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="listingPrice" className="block text-sm text-gray-400 mb-2">
                Starting Bid Price (RLUSD) *
              </label>
              <input
                id="listingPrice"
                type="number"
                min="0"
                step="0.01"
                max={token.face_value || undefined}
                value={formData.listingPrice}
                onChange={(e) => setFormData({ ...formData, listingPrice: e.target.value })}
                placeholder="e.g., 8500"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 transition-colors"
                required
              />
              {formData.listingPrice && token.face_value && parseFloat(formData.listingPrice) < token.face_value && (
                <p className="mt-2 text-sm text-green-400">
                  {discountPercentage}% discount for buyers
                </p>
              )}
            </div>

            <div>
              <label htmlFor="auctionExpiry" className="block text-sm text-gray-400 mb-2">
                Auction Expiry Date *
              </label>
              <input
                id="auctionExpiry"
                type="date"
                value={formData.auctionExpiry}
                onChange={(e) => setFormData({ ...formData, auctionExpiry: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                max={token.maturity_date || undefined}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-600 transition-colors"
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                Must be before the maturity date
              </p>
            </div>

            <div>
              <label htmlFor="walletSeed" className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                <Key className="w-4 h-4" />
                Your Wallet Seed *
              </label>
              <input
                id="walletSeed"
                type="password"
                value={formData.walletSeed}
                onChange={(e) => setFormData({ ...formData, walletSeed: e.target.value })}
                placeholder="sEdV..."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 transition-colors font-mono"
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                Required to sign the transaction and transfer NFT custody to platform
              </p>
            </div>

            <div className="p-4 bg-blue-950/30 border border-blue-900/50 rounded-lg">
              <p className="text-sm text-blue-400">
                <strong>Note:</strong> Your NFT will be transferred to the platform wallet for escrow. Once listed, investors can bid to purchase your invoice NFT for immediate liquidity.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              List Token
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}