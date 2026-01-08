import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, Package, Gavel, CheckCircle, History, Timer, DollarSign } from 'lucide-react';
import { getBidsByUser, getNFTokensByOwner } from '../../lib/database';
import { AuctionBid, NFToken } from '../../lib/supabase';
import { toast } from 'sonner';
import { fetchPaymentsToCollect, cashMaturityPaymentCheck, MaturityPayment } from '../../utils/maturityPayment';

export function CustomerDashboard({ 
  username,
  publicKey,
  onViewMarketplace 
}: { 
  username: string;
  publicKey: string;
  onViewMarketplace: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'won' | 'bidding' | 'past' | 'payments'>('bidding');
  const [ownedTokens, setOwnedTokens] = useState<NFToken[]>([]);
  const [activeBids, setActiveBids] = useState<AuctionBid[]>([]);
  const [historicalBids, setHistoricalBids] = useState<AuctionBid[]>([]);
  const [paymentsToCollect, setPaymentsToCollect] = useState<MaturityPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [cashingCheckFor, setCashingCheckFor] = useState<number | null>(null);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Load data on mount
  useEffect(() => {
    loadDashboardData();
  }, [publicKey]);

  // Listen for bid updates
  useEffect(() => {
    const handleBidsUpdated = () => {
      console.log('Bids updated event received, refreshing dashboard...');
      loadDashboardData();
    };

    window.addEventListener('bidsUpdated', handleBidsUpdated);

    return () => {
      window.removeEventListener('bidsUpdated', handleBidsUpdated);
    };
  }, [publicKey]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [bids, history, tokens, payments] = await Promise.all([
        getBidsByUser(publicKey),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:6767'}/auctions/user/bids/history`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }).then(res => res.json()).then(data => data.bids || []).catch(() => []),
        getNFTokensByOwner(publicKey),
        fetchPaymentsToCollect().catch(() => []) // Don't fail if payments fetch fails
      ]);

      // Backend now returns only active bids (superseded bids are filtered out)
      setActiveBids(bids);
      setHistoricalBids(history);
      setOwnedTokens(tokens);
      setPaymentsToCollect(payments);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Handler for cashing maturity payment Checks
  const handleCashCheck = async (payment: MaturityPayment) => {
    try {
      setCashingCheckFor(payment.payment_id);
      toast.loading('Cashing Check on XRPL...', { id: 'cash-check' });

      const result = await cashMaturityPaymentCheck(
        payment.payment_id,
        payment.xrpl_check_id!,
        payment.payment_amount
      );

      if (result.success) {
        toast.success(result.message, { id: 'cash-check' });
        // Reload data to update payments list
        await loadDashboardData();
      } else {
        toast.error(result.message, { id: 'cash-check' });
      }
    } catch (error) {
      console.error('Error cashing Check:', error);
      toast.error('Failed to cash Check', { id: 'cash-check' });
    } finally {
      setCashingCheckFor(null);
    }
  };

  // Calculate stats
  const totalInvested = ownedTokens.reduce((sum, token) => sum + (token.face_value || 0), 0);
  const potentialReturn = ownedTokens.reduce((sum, token) => {
    // Assuming we track purchase_price somewhere, for now use face_value
    return sum + (token.face_value || 0);
  }, 0);
  const activeBidsCount = activeBids.length;

  // Calculate time remaining for auctions
  const getTimeRemaining = (expiryDate: string) => {
    const now = currentTime;
    const expiry = new Date(expiryDate).getTime();
    const diff = expiry - now;

    if (diff <= 0) {
      return 'Expired';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 pt-24 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl mb-2 text-white">
            Welcome back, <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{username}</span>
          </h1>
          <p className="text-gray-400">Manage your portfolio and track your investments</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-sm text-gray-400">Total Invested</div>
            </div>
            <div className="text-3xl text-white">{totalInvested.toLocaleString()} RLUSD</div>
            <div className="text-xs text-gray-500 mt-1">{ownedTokens.length} tokens owned</div>
          </div>

          <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-sm text-gray-400">Potential Return</div>
            </div>
            <div className="text-3xl text-white">{potentialReturn.toLocaleString()} RLUSD</div>
            <div className="text-xs text-gray-500 mt-1">At maturity</div>
          </div>

          <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <Gavel className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-sm text-gray-400">Active Bids</div>
            </div>
            <div className="text-3xl text-white">{activeBidsCount}</div>
            <div className="text-xs text-gray-500 mt-1">In progress</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-white text-xl mb-1">Discover New Opportunities</h3>
              <p className="text-blue-100 text-sm">Browse the marketplace for new invoice NFTs</p>
            </div>
            <button 
              onClick={onViewMarketplace}
              className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
            >
              View Marketplace
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="border-b border-gray-800 flex">
            <button
              onClick={() => setActiveTab('bidding')}
              className={`flex-1 px-6 py-4 text-sm transition-colors ${
                activeTab === 'bidding'
                  ? 'bg-gray-800 text-white border-b-2 border-blue-600'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Gavel className="w-4 h-4" />
                Active Bids ({activeBidsCount})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('won')}
              className={`flex-1 px-6 py-4 text-sm transition-colors ${
                activeTab === 'won'
                  ? 'bg-gray-800 text-white border-b-2 border-blue-600'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Won Auctions ({ownedTokens.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex-1 px-6 py-4 text-sm transition-colors ${
                activeTab === 'payments'
                  ? 'bg-gray-800 text-white border-b-2 border-blue-600'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <DollarSign className="w-4 h-4" />
                Collect Payments ({paymentsToCollect.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`flex-1 px-6 py-4 text-sm transition-colors ${
                activeTab === 'past'
                  ? 'bg-gray-800 text-white border-b-2 border-blue-600'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <History className="w-4 h-4" />
                History ({historicalBids.length})
              </div>
            </button>
          </div>

          <div className="p-6">
            {/* Won Auctions Tab */}
            {activeTab === 'won' && (
              ownedTokens.length > 0 ? (
                <div className="space-y-4">
                  {ownedTokens.map((token) => {
                    const daysUntilMaturity = token.maturity_date 
                      ? Math.max(0, Math.ceil((new Date(token.maturity_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                      : 0;
                    
                    return (
                      <div key={token.nftoken_id} className="p-6 bg-gray-800/50 border border-gray-700 rounded-lg">
                        <div className="mb-3">
                          <span className="text-xs text-gray-500 font-mono">NFT ID: {token.nftoken_id}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Invoice Number</div>
                            <div className="text-white font-medium">{token.invoice_number}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Face Value</div>
                            <div className="text-white">{token.face_value?.toLocaleString()} RLUSD</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Maturity Date</div>
                            <div className="text-white">
                              {token.maturity_date ? new Date(token.maturity_date).toLocaleDateString() : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Days Until Maturity</div>
                            <div className="text-white">{daysUntilMaturity} days</div>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-gray-700 mt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm text-gray-400 mb-1">Issuer</div>
                              <div className="text-white font-mono text-sm">{token.created_by}</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-400 mb-1">Status</div>
                              <span className="inline-block px-2 py-1 bg-green-950/50 text-green-400 border border-green-900/50 rounded text-xs">
                                {token.current_state}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No won auctions yet</p>
                  <button
                    onClick={onViewMarketplace}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Browse Marketplace
                  </button>
                </div>
              )
            )}

            {/* Active Bids Tab */}
            {activeTab === 'bidding' && (
              activeBids.length > 0 ? (
                <div className="space-y-4">
                  {activeBids.map((bid: any) => {
                    const listing = bid.AUCTIONLISTING;
                    const nftoken = listing?.NFTOKEN;
                    const isWinning = bid.bid_amount === listing?.current_bid;
                    const timeRemaining = listing?.expiry ? getTimeRemaining(listing.expiry) : 'N/A';

                    return (
                      <div key={bid.bid_id} className="p-6 bg-gray-800/50 border border-gray-700 rounded-lg">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="text-white font-medium mb-1">
                              {nftoken?.invoice_number || 'Invoice NFT'} <span className="text-gray-500 text-sm font-normal">(Auction #{listing?.aid})</span>
                            </div>
                            <div className="text-sm text-gray-400">
                              Face Value: {nftoken?.face_value?.toLocaleString()} RLUSD
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs ${
                            isWinning
                              ? 'bg-green-950/50 text-green-400 border border-green-900/50'
                              : 'bg-yellow-950/50 text-yellow-400 border border-yellow-900/50'
                          }`}>
                            {isWinning ? 'Winning' : 'Outbid'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Your Bid</div>
                            <div className="text-white">{bid.bid_amount?.toLocaleString()} RLUSD</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Current Highest</div>
                            <div className="text-white">{listing?.current_bid?.toLocaleString()} RLUSD</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-1 flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              Auction Ends
                            </div>
                            <div className="text-white">{timeRemaining}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Issuer</div>
                            <div className="text-white text-sm">
                              {nftoken?.creator_username || 'Unknown'}
                            </div>
                          </div>
                        </div>

                        {!isWinning && (
                          <div className="mt-4 pt-4 border-t border-gray-700">
                            <button
                              onClick={onViewMarketplace}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              Increase Bid
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Gavel className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No active bids</p>
                  <button
                    onClick={onViewMarketplace}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Start Bidding
                  </button>
                </div>
              )
            )}

            {/* Collect Payments Tab */}
            {activeTab === 'payments' && (
              paymentsToCollect.length > 0 ? (
                <div className="space-y-4">
                  {paymentsToCollect.map((payment) => {
                    const checkCreatedDate = new Date(payment.check_created_at || '');

                    return (
                      <div key={payment.payment_id} className="p-6 bg-gray-800/50 border border-gray-700 rounded-lg">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="text-white font-medium mb-1">
                              {payment.NFTOKEN?.invoice_number || 'Invoice NFT'}
                            </div>
                            <div className="text-sm text-gray-400">
                              Payment from: {payment.debtor_address.substring(0, 15)}...
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs bg-green-950/50 text-green-400 border border-green-900/50">
                            Ready to Collect
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Payment Amount</div>
                            <div className="text-white text-lg font-medium">
                              {payment.payment_amount.toLocaleString()} RLUSD
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Check Created</div>
                            <div className="text-white">
                              {checkCreatedDate.toLocaleDateString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Check ID</div>
                            <div className="text-white text-sm font-mono">
                              {payment.xrpl_check_id?.substring(0, 20)}...
                            </div>
                          </div>
                        </div>

                        <div className="mb-4 p-3 bg-green-950/30 border border-green-900/50 rounded-lg">
                          <p className="text-sm text-green-400">
                            <strong>Payment Ready:</strong> The debtor has created a Check for {payment.payment_amount.toLocaleString()} RLUSD. Cash it to receive your payment.
                          </p>
                        </div>

                        <div className="pt-4 border-t border-gray-700">
                          <button
                            onClick={() => handleCashCheck(payment)}
                            disabled={cashingCheckFor === payment.payment_id}
                            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {cashingCheckFor === payment.payment_id
                              ? 'Cashing Check...'
                              : `Cash Check (${payment.payment_amount.toLocaleString()} RLUSD)`}
                          </button>
                          <p className="text-xs text-gray-500 mt-2">
                            This will cash the XRPL Check and transfer {payment.payment_amount.toLocaleString()} RLUSD to your wallet.
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No payments to collect</p>
                  <p className="text-xs text-gray-500">
                    Payments will appear here when NFTs you own reach maturity and debtors create payment Checks
                  </p>
                </div>
              )
            )}

            {/* Past Tab */}
            {activeTab === 'past' && (
              historicalBids.length > 0 ? (
                <div className="space-y-4">
                  {historicalBids.map((bid: any) => {
                    const listing = bid.AUCTIONLISTING;
                    const nftoken = listing?.NFTOKEN;
                    const wasWinning = bid.bid_amount === listing?.current_bid;
                    const status = listing?.status || 'unknown';

                    return (
                      <div key={bid.bid_id} className="p-6 bg-gray-800/50 border border-gray-700 rounded-lg">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg text-white mb-1">
                              {nftoken?.invoice_number || 'Unknown Invoice'} (Auction #{listing?.aid})
                            </h3>
                            <p className="text-sm text-gray-400">Face Value: {listing?.face_value?.toLocaleString()} RLUSD</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs ${
                            wasWinning && status === 'completed'
                              ? 'bg-green-900/50 text-green-400 border border-green-800'
                              : 'bg-gray-700 text-gray-400'
                          }`}>
                            {wasWinning && status === 'completed' ? 'Won' : 'Lost/Expired'}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 mb-1">Your Bid</p>
                            <p className="text-white">{bid.bid_amount?.toLocaleString()} RLUSD</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">Final Price</p>
                            <p className="text-white">{listing?.current_bid?.toLocaleString()} RLUSD</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">Issuer</p>
                            <p className="text-white text-sm">{nftoken?.creator_username || 'Unknown'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <History className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-400">No past transactions yet</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
