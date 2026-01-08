import { useState, useEffect } from 'react';
import { Plus, FileText, Package, Eye, Settings, X, Shield, Timer, TrendingUp } from 'lucide-react';
import { IssueTokenModal } from './issue-token-modal';
import { ListTokenModal } from './list-token-modal';
import { EstablishmentSettingsModal } from './establishment-settings-modal';
import { getNFTokensByCreator, getNFTokensByOwner, createNFToken, createAuctionListing, getAuctionListingsByCreator, getBidCountsByAuctions } from '../../lib/database';
import { NFToken, AuctionListingWithNFT } from '../../lib/supabase';
import { toast } from 'sonner';

interface EstablishmentInfo {
  name: string;
  registrationNumber: string;
  address: string;
  contact: string;
}

export function EstablishmentDashboard({ 
  username,
  publicKey
}: { 
  username: string;
  publicKey: string;
}) {
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState<NFToken | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  // Data from database
  const [issuedTokens, setIssuedTokens] = useState<NFToken[]>([]);
  const [ownedTokens, setOwnedTokens] = useState<NFToken[]>([]);
  const [auctionListings, setAuctionListings] = useState<AuctionListingWithNFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidCounts, setBidCounts] = useState<Record<string, number>>({});
  
  // Update current time every minute for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, [publicKey]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadIssuedTokens(),
        loadOwnedTokens(),
        loadAuctionListings()
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadIssuedTokens = async () => {
    try {
      const tokens = await getNFTokensByCreator(publicKey);
      setIssuedTokens(tokens);
    } catch (error) {
      console.error('Failed to load issued tokens:', error);
    }
  };

  const loadOwnedTokens = async () => {
    try {
      const tokens = await getNFTokensByOwner(publicKey);
      setOwnedTokens(tokens);
    } catch (error) {
      console.error('Failed to load owned tokens:', error);
    }
  };

  const loadAuctionListings = async () => {
    try {
      const listings = await getAuctionListingsByCreator(publicKey);
      setAuctionListings(listings);

      // Load bid counts for each listing
      const aids = listings.map(l => l.aid);
      const counts = await getBidCountsByAuctions(aids);
      setBidCounts(counts);

    } catch (error) {
      console.error('Failed to load auction listings:', error);
    }
  };

  // Helper function to calculate time remaining
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
  
  const [establishmentInfo, setEstablishmentInfo] = useState<EstablishmentInfo>({
    name: username + ' Corp',
    registrationNumber: 'REG-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    address: '',
    contact: ''
  });

  const handleIssueToken = async (token: { invoiceNumber: string; amount: number; maturityDate: string; buyer: string }) => {
    try {
      // Generate a unique NFT token ID
      const nftokenId = `NFT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create NFToken in database
      await createNFToken({
        nftoken_id: nftokenId,
        created_by: publicKey,
        invoice_number: token.invoiceNumber,
        face_value: token.amount,
        image_link: null,
        maturity_date: token.maturityDate,
        current_owner: token.buyer, // The creditor receives the token
        current_state: 'issued'
      });

      toast.success('Invoice token created successfully!');
      setShowIssueModal(false);
      await loadIssuedTokens();
    } catch (error) {
      console.error('Failed to issue token:', error);
      toast.error('Failed to create token. Please try again.');
    }
  };

  const handleListToken = async (tokenId: string, listingPrice: number, auctionExpiry: string) => {
    try {
      const token = ownedTokens.find(t => t.nftoken_id === tokenId);
      if (!token) {
        toast.error('Token not found');
        return;
      }

      // Create auction listing
      await createAuctionListing({
        nftoken_id: tokenId,
        face_value: token.face_value,
        expiry: auctionExpiry,
        min_bid: listingPrice,
        current_bid: listingPrice
      });

      toast.success('Token listed on auction successfully!');
      setShowListModal(false);
      setSelectedToken(null);
      await loadAllData();
    } catch (error) {
      console.error('Failed to list token:', error);
      toast.error('Failed to list token. Please try again.');
    }
  };

  const handleOpenListModal = (token: NFToken) => {
    setSelectedToken(token);
    setShowListModal(true);
  };

  const handleCancelAuction = async (tokenId: string) => {
    // TODO: Implement cancel auction functionality
    toast.info('Cancel auction feature coming soon');
  };

  // Get current bid for a listing
  const getCurrentBid = (nftokenId: string): number | null => {
    const listing = auctionListings.find(l => l.nftoken_id === nftokenId);
    return listing?.current_bid || null;
  };

  // Get auction expiry for a token
  const getAuctionExpiry = (nftokenId: string): string | null => {
    const listing = auctionListings.find(l => l.nftoken_id === nftokenId);
    return listing?.expiry || null;
  };

  // Check if token is listed
  const isTokenListed = (nftokenId: string): boolean => {
    return auctionListings.some(l => l.nftoken_id === nftokenId);
  };

  const totalIssuedValue = issuedTokens.reduce((sum, token) => sum + (token.face_value || 0), 0);
  const totalOwnedValue = ownedTokens.reduce((sum, token) => sum + (token.face_value || 0), 0);
  const activeAuctionsCount = ownedTokens.filter(t => isTokenListed(t.nftoken_id)).length;

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
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl mb-2 text-white">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{establishmentInfo.name}</span>
            </h1>
            <p className="text-gray-400">Manage your invoice tokens and auctions</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button
              onClick={() => setShowIssueModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Issue Token
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-red-400" />
              </div>
              <div className="text-sm text-gray-400">Total Payables</div>
            </div>
            <div className="text-3xl text-white">{totalIssuedValue.toLocaleString()} RLUSD</div>
            <div className="text-xs text-gray-500 mt-1">{issuedTokens.length} tokens created</div>
          </div>

          <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-sm text-gray-400">Total Receivables</div>
            </div>
            <div className="text-3xl text-white">{totalOwnedValue.toLocaleString()} RLUSD</div>
            <div className="text-xs text-gray-500 mt-1">{ownedTokens.length} tokens owned</div>
          </div>

          <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-sm text-gray-400">Active Auctions</div>
            </div>
            <div className="text-3xl text-white">{activeAuctionsCount}</div>
            <div className="text-xs text-gray-500 mt-1">Receivables listed for sale</div>
          </div>
        </div>

        {/* Issued Tokens Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <div className="mb-6">
            <h2 className="text-2xl text-white mb-2">Tokens Created by Me</h2>
            <p className="text-sm text-gray-400">Debts you owe - invoice NFTs representing your payables to other establishments</p>
          </div>
          
          {issuedTokens.length > 0 ? (
            <div className="space-y-4">
              {issuedTokens.map((token) => (
                <div key={token.nftoken_id} className="p-6 bg-gray-800/50 border border-gray-700 rounded-lg">
                  <div className="mb-3">
                    <span className="text-xs text-gray-500 font-mono">NFT ID: {token.nftoken_id}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                      <div className="text-sm text-gray-400 mb-1">Status</div>
                      <span className={`inline-block px-2 py-1 rounded text-xs ${
                        token.current_state === 'issued' ? 'bg-gray-700 text-gray-300' :
                        token.current_state === 'listed' ? 'bg-green-950/50 text-green-400 border border-green-900/50' :
                        token.current_state === 'sold' ? 'bg-blue-950/50 text-blue-400 border border-blue-900/50' :
                        'bg-gray-700 text-gray-400'
                      }`}>
                        {token.current_state}
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-700">
                    <div className="text-sm text-gray-400 mb-1">Current Owner</div>
                    <div className="text-white font-mono text-sm">{token.current_owner || 'Not transferred yet'}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No tokens issued yet</p>
              <button
                onClick={() => setShowIssueModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Issue Your First Token
              </button>
            </div>
          )}
        </div>

        {/* Owned Tokens Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl text-white mb-2">Tokens I Own</h2>
                <p className="text-sm text-gray-400">Receivables - invoice NFTs from establishments that owe you money (auctionable)</p>
              </div>
            </div>
          </div>

          {ownedTokens.length > 0 ? (
            <div className="space-y-4">
              {ownedTokens.map((token) => {
                const isListed = isTokenListed(token.nftoken_id);
                const currentBid = getCurrentBid(token.nftoken_id);
                const auctionExpiry = getAuctionExpiry(token.nftoken_id);
                const hasBids = (bidCounts[token.nftoken_id] || 0) > 0;

                return (
                  <div key={token.nftoken_id} className="p-6 bg-gray-800/50 border border-gray-700 rounded-lg">
                    <div className="mb-3">
                      <span className="text-xs text-gray-500 font-mono">NFT ID: {token.nftoken_id}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                        <div className="text-sm text-gray-400 mb-1">Status</div>
                        <span className={`inline-block px-2 py-1 rounded text-xs ${
                          !isListed ? 'bg-gray-700 text-gray-300' :
                          'bg-green-950/50 text-green-400 border border-green-900/50'
                        }`}>
                          {isListed ? 'listed' : 'issued'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700 mb-4">
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Original Issuer</div>
                        <div className="text-white font-mono text-sm">{token.created_by}</div>
                      </div>
                    </div>

                    {isListed && (
                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700 mb-4">
                        <div>
                          <div className="text-sm text-gray-400 mb-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Current Bid
                          </div>
                          <div className={`font-medium ${currentBid ? 'text-green-400' : 'text-gray-500'}`}>
                            {currentBid ? `${currentBid.toLocaleString()} RLUSD` : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Total Bids</div>
                          <div className="text-white">{bidCounts[token.nftoken_id] || 0}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400 mb-1 flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            Time Remaining
                          </div>
                          {auctionExpiry && (
                            <div className="text-white font-medium">
                              {getTimeRemaining(auctionExpiry)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {!isListed && (
                      <div className="pt-4 border-t border-gray-700">
                        <button
                          onClick={() => handleOpenListModal(token)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
                        >
                          List on Auction
                        </button>
                      </div>
                    )}

                    {isListed && (
                      <div className="pt-4 border-t border-gray-700">
                        {hasBids ? (
                          <div className="p-3 bg-yellow-950/30 border border-yellow-900/50 rounded-lg">
                            <p className="text-sm text-yellow-400">
                              Auction cannot be cancelled after bids are placed
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleCancelAuction(token.nftoken_id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
                          >
                            Cancel Auction
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400">No tokens owned yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showIssueModal && (
        <IssueTokenModal
          onClose={() => setShowIssueModal(false)}
          onIssue={handleIssueToken}
        />
      )}

      {showListModal && selectedToken && (
        <ListTokenModal
          token={selectedToken}
          onClose={() => {
            setShowListModal(false);
            setSelectedToken(null);
          }}
          onList={handleListToken}
        />
      )}

      {showSettingsModal && (
        <EstablishmentSettingsModal
          establishmentInfo={establishmentInfo}
          onClose={() => setShowSettingsModal(false)}
          onSave={setEstablishmentInfo}
        />
      )}
    </div>
  );
}
