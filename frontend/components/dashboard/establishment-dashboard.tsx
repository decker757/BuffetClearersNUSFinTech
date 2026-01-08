import { useState, useEffect } from 'react';
import { Plus, FileText, Package, Eye, Settings, X, Shield, Timer, TrendingUp } from 'lucide-react';
import { IssueTokenModal } from './issue-token-modal';
import { ListTokenModal } from './list-token-modal';
import { EstablishmentSettingsModal } from './establishment-settings-modal';
import { AcceptNFTModal } from './accept-nft-modal';
import { getNFTokensByCreator, getNFTokensByOwner, createNFToken, createAuctionListing, getAuctionListingsByCreator, getBidsByAuction } from '../../lib/database';
import { NFToken, AuctionListingWithNFT } from '../../lib/supabase';
import { mintInvoiceNFT, authenticatedFetch } from '../../lib/api';
import { findNFTSellOffers, acceptNFTOffer, createSellOfferToPlatform } from '../../lib/xrpl-nft';
import { toast } from 'sonner';

// Platform wallet address from backend
const PLATFORM_ADDRESS = 'rJoESWx9ZKHpEyNrLWBTA95XLxwoKJj59u';

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
  const [showAcceptModal, setShowAcceptModal] = useState(false);
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
      const counts: Record<string, number> = {};
      for (const listing of listings) {
        const bids = await getBidsByAuction(listing.aid);
        counts[listing.nftoken_id || ''] = bids.length;
      }
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

  const handleIssueToken = async (token: {
    invoiceNumber: string;
    amount: number;
    maturityDate: string;
    buyer: string;
    buyerPublicKey: string;
  }) => {
    try {
      // Show loading toast
      const loadingToast = toast.loading('Minting NFT... This may take a moment.');

      // Call backend to mint NFT with full flow:
      // 1. Save to DB, 2. Generate image (OpenAI), 3. Upload image,
      // 4. Generate metadata, 5. Upload metadata, 6. Mint on XRPL,
      // 7. Transfer to creditor, 8. Update DB with NFTokenID
      const result = await mintInvoiceNFT({
        invoiceNumber: token.invoiceNumber,
        faceValue: token.amount,
        maturityDate: token.maturityDate,
        creditorPublicKey: token.buyerPublicKey,
        debtorPublicKey: publicKey // Current user (debtor)
      });

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (result.success && result.data) {
        toast.success(`Invoice NFT minted successfully! NFTokenID: ${result.data.nftokenId.slice(0, 16)}...`);
        console.log('NFT Minting Result:', result.data);

        setShowIssueModal(false);

        // Reload data to show the new token
        await loadIssuedTokens();
      } else {
        throw new Error(result.message || 'Failed to mint NFT');
      }
    } catch (error) {
      console.error('Failed to issue token:', error);
      toast.error(`Failed to mint NFT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleListToken = async (tokenId: string, minBid: number, auctionExpiry: string, walletSeed: string) => {
    try {
      console.log('🔄 Starting NFT listing process');
      console.log('  NFToken ID:', tokenId);
      console.log('  Min Bid:', minBid);
      console.log('  Expiry:', auctionExpiry);

      const token = ownedTokens.find(t => t.nftoken_id === tokenId);
      if (!token) {
        toast.error('Token not found');
        return;
      }

      // Show loading toast
      const loadingToast = toast.loading('Creating sell offer to platform...');

      // Step 1: Create sell offer to platform (user signs transaction)
      console.log('  Creating sell offer to platform...');
      const offerResult = await createSellOfferToPlatform({
        nftokenId: tokenId,
        walletSeed,
        platformAddress: PLATFORM_ADDRESS
      });

      if (!offerResult.success || !offerResult.offerIndex) {
        toast.dismiss(loadingToast);
        throw new Error(offerResult.error || 'Failed to create sell offer');
      }

      console.log('✅ Sell offer created! Offer Index:', offerResult.offerIndex);
      toast.dismiss(loadingToast);

      // Step 2: Send to backend for platform to accept
      const loadingToast2 = toast.loading('Platform accepting offer and listing on auction...');

      // Convert date string to ISO format with time
      const expiryDate = new Date(auctionExpiry);
      expiryDate.setHours(23, 59, 59, 999); // End of day
      const expiryISO = expiryDate.toISOString();

      const response = await authenticatedFetch('/nft/list-on-auction', {
        method: 'POST',
        body: JSON.stringify({
          nftokenId: tokenId,
          offerIndex: offerResult.offerIndex,
          minBid,
          expiry: expiryISO
        })
      });

      toast.dismiss(loadingToast2);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to list NFT on auction');
      }

      const result = await response.json();
      console.log('✅ NFT listed on auction:', result);

      toast.success('NFT listed on auction successfully! Platform has custody.');
      setShowListModal(false);
      setSelectedToken(null);

      // Reload data to update the UI
      await loadAllData();

    } catch (error) {
      console.error('Failed to list token:', error);
      toast.error(`Failed to list token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleOpenListModal = (token: NFToken) => {
    setSelectedToken(token);
    setShowListModal(true);
  };

  const handleOpenAcceptModal = (token: NFToken) => {
    setSelectedToken(token);
    setShowAcceptModal(true);
  };

  const handleAcceptNFT = async (nftokenId: string, walletSeed: string) => {
    try {
      console.log('🔄 Starting NFT acceptance process');
      console.log('  NFToken ID:', nftokenId);

      // Get the NFT details from our database to see what we have stored
      const nft = ownedTokens.find(t => t.nftoken_id === nftokenId);
      console.log('  NFT from database:', nft);

      // Find sell offers for this NFT
      console.log('  Querying XRPL for sell offers...');
      const offers = await findNFTSellOffers(nftokenId);

      if (!offers || offers.length === 0) {
        throw new Error('No sell offers found for this NFT. The offer may have expired or been cancelled.');
      }

      console.log('📋 Found sell offers:', offers);

      // Use the first offer (should be the one from platform)
      const offer = offers[0];
      const offerIndex = offer.nft_offer_index;

      console.log('✅ Accepting offer:', offerIndex);

      // Accept the offer on-chain
      const result = await acceptNFTOffer({
        nftokenId,
        offerIndex,
        walletSeed
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to accept NFT offer on-chain');
      }

      console.log('✅ NFT accepted on-chain! TX Hash:', result.txHash);

      // Notify backend to verify and update NFT state to 'owned'
      const response = await authenticatedFetch('/nft/verify-ownership', {
        method: 'POST',
        body: JSON.stringify({
          nftokenId,
          txHash: result.txHash
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify ownership with backend');
      }

      toast.success('NFT ownership accepted successfully! You can now list it on auction.');
      setShowAcceptModal(false);
      setSelectedToken(null);

      // Reload data to update the UI
      await loadAllData();

    } catch (error) {
      console.error('Failed to accept NFT:', error);
      throw error; // Re-throw so modal can display error
    }
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
            <div className="text-xs text-gray-500 mt-1">{ownedTokens.length} receivables</div>
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

        {/* Receivables Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl text-white mb-2">Receivables</h2>
                <p className="text-sm text-gray-400">Invoice NFTs from establishments that owe you money. Accept pending NFTs to take ownership, then list on auction for early liquidity.</p>
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

                    {!isListed && token.current_state === 'issued' && (
                      <div className="pt-4 border-t border-gray-700">
                        <div className="p-4 bg-yellow-950/30 border border-yellow-900/50 rounded-lg mb-3">
                          <p className="text-sm text-yellow-400 mb-2">
                            <strong>Pending Acceptance</strong>
                          </p>
                          <p className="text-xs text-gray-400">
                            This NFT has been minted for you. Accept it to take ownership on-chain before you can list it on auction.
                          </p>
                        </div>
                        <button
                          onClick={() => handleOpenAcceptModal(token)}
                          className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
                        >
                          Accept NFT Ownership
                        </button>
                      </div>
                    )}

                    {!isListed && token.current_state === 'owned' && (
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
              <p className="text-gray-400">No receivables yet</p>
              <p className="text-xs text-gray-500 mt-2">Receivables will appear here when other establishments issue invoices to you</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showIssueModal && (
        <IssueTokenModal
          onClose={() => setShowIssueModal(false)}
          onIssue={handleIssueToken}
          currentUserPublicKey={publicKey}
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

      {showAcceptModal && selectedToken && (
        <AcceptNFTModal
          nftokenId={selectedToken.nftoken_id}
          invoiceNumber={selectedToken.invoice_number}
          onClose={() => {
            setShowAcceptModal(false);
            setSelectedToken(null);
          }}
          onAccept={handleAcceptNFT}
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
