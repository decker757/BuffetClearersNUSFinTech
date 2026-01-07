import { useState } from 'react';
import { CreditCard, X, DollarSign, TrendingUp, CheckCircle, Timer, Calendar } from 'lucide-react';

interface WonAuction {
  id: string;
  nftId: string;
  invoiceNumber: string;
  faceValue: number;
  winningBid: number;
  issuer: string;
  maturityDate: string;
  auctionEndedAt: string;
  profit: number;
}

export function WonAuctionsSection({ publicKey }: { publicKey: string }) {
  const [wonAuctions, setWonAuctions] = useState<WonAuction[]>([]);
  const [paymentModal, setPaymentModal] = useState<WonAuction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // In a real app, this would load from blockchain/backend
  // For now, we'll check if there are expired auctions where user had winning bid
  
  const handleCompletePayment = (auction: WonAuction) => {
    setPaymentModal(auction);
  };

  const handleConfirmPayment = () => {
    if (!paymentModal) return;
    
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      // Remove from won auctions
      setWonAuctions(prev => prev.filter(a => a.id !== paymentModal.id));
      
      // Add to owned NFTs in localStorage
      const OWNED_NFTS_KEY = 'invoicenft_owned_nfts';
      const existingNftsJson = localStorage.getItem(OWNED_NFTS_KEY);
      const existingNfts = existingNftsJson ? JSON.parse(existingNftsJson) : [];
      
      const newNft = {
        id: `TKN-${Date.now()}`,
        nftId: paymentModal.nftId,
        invoiceNumber: paymentModal.invoiceNumber,
        faceValue: paymentModal.faceValue,
        maturityDate: paymentModal.maturityDate,
        purchasePrice: paymentModal.winningBid,
        issuer: paymentModal.issuer,
        daysUntilMaturity: Math.ceil((new Date(paymentModal.maturityDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        profit: paymentModal.profit,
        userPublicKey: publicKey,
        purchasedAt: new Date().toISOString()
      };
      
      existingNfts.push(newNft);
      localStorage.setItem(OWNED_NFTS_KEY, JSON.stringify(existingNfts));
      
      // Show success message
      alert(`Payment completed! NFT ${paymentModal.invoiceNumber} is now in your portfolio.`);
      
      setPaymentModal(null);
      setIsProcessing(false);
      
      // Reload page to update My NFTs section
      window.location.reload();
    }, 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl text-white mb-1">Won Auctions</h2>
          <p className="text-sm text-gray-400">Auctions you won - complete payment to receive NFT</p>
        </div>
      </div>

      {wonAuctions.length > 0 ? (
        <div className="space-y-4">
          {wonAuctions.map((auction) => (
            <div key={auction.id} className="p-6 bg-gray-800/50 border border-yellow-600/50 rounded-lg hover:border-yellow-600 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-600 to-orange-600 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-medium text-white">{auction.invoiceNumber}</div>
                    <div className="text-sm text-gray-400">Issued by {auction.issuer}</div>
                    <div className="text-xs text-gray-500 font-mono">NFT ID: {auction.nftId}</div>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full text-xs bg-yellow-950/50 text-yellow-400 border border-yellow-900/50">
                  🏆 Won Auction
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Face Value</div>
                  <div className="text-white font-medium">{auction.faceValue.toLocaleString()} RLUSD</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Your Winning Bid</div>
                  <div className="text-yellow-400 font-medium">{auction.winningBid.toLocaleString()} RLUSD</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Expected Profit</div>
                  <div className="text-green-400 font-medium">+{auction.profit.toLocaleString()} RLUSD</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Auction Ended</div>
                  <div className="text-white font-medium">{new Date(auction.auctionEndedAt).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-700 flex items-center justify-between">
                <span className="text-xs text-gray-500">Complete payment to receive NFT ownership</span>
                <button 
                  onClick={() => handleCompletePayment(auction)}
                  className="px-6 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-lg hover:from-yellow-700 hover:to-orange-700 transition-colors text-sm font-medium flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Complete Payment
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-800">
          <CheckCircle className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400">No won auctions yet</p>
          <p className="text-sm text-gray-500 mt-2">Keep bidding to win invoice NFTs!</p>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => !isProcessing && setPaymentModal(null)}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {!isProcessing ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-600 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl text-white mb-2">Complete Payment</h3>
                  <p className="text-sm text-gray-400">Finalize the swap: Pay RLUSD → Receive NFT</p>
                </div>

                {/* Transaction Details */}
                <div className="space-y-3 mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                    <span className="text-sm text-gray-400">Invoice NFT</span>
                    <span className="text-sm text-white font-medium">{paymentModal.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                    <span className="text-sm text-gray-400">Issuer</span>
                    <span className="text-sm text-white">{paymentModal.issuer}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                    <span className="text-sm text-gray-400">Face Value</span>
                    <span className="text-sm text-white">{paymentModal.faceValue.toLocaleString()} RLUSD</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                    <span className="text-sm text-gray-400">Maturity Date</span>
                    <span className="text-sm text-white">{new Date(paymentModal.maturityDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Payment Amount</span>
                    <span className="text-xl text-yellow-400 font-bold">{paymentModal.winningBid.toLocaleString()} RLUSD</span>
                  </div>
                </div>

                {/* Profit Display */}
                <div className="mb-6 p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-400 font-medium">Profit at Maturity</span>
                  </div>
                  <p className="text-2xl text-green-400 font-bold">
                    +{paymentModal.profit.toLocaleString()} RLUSD
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    ({((paymentModal.profit / paymentModal.winningBid) * 100).toFixed(2)}% return)
                  </p>
                </div>

                {/* Swap Info */}
                <div className="mb-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <p className="text-xs text-blue-400">
                    ℹ️ You will send {paymentModal.winningBid.toLocaleString()} RLUSD to the establishment and receive the NFT immediately. The NFT will appear in your "My NFTs" portfolio, awaiting maturity.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setPaymentModal(null)}
                    className="flex-1 px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-white transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmPayment}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white rounded-xl transition-all font-medium">
                    Pay & Receive NFT
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-4 border-yellow-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-xl text-white mb-2">Processing Payment...</h3>
                <p className="text-sm text-gray-400">Executing swap on XRPL</p>
                <p className="text-xs text-gray-500 mt-2">RLUSD → NFT</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
