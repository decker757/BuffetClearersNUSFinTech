import { useState, useEffect } from 'react';
import { Filter, ChevronDown, TrendingUp, Clock, X, Calendar, FileText, Shield, DollarSign, Timer, AlertCircle } from 'lucide-react';
import { UserRole } from './auth/onboarding';
import { getActiveAuctionListings, placeBid, getBidsByUser, getBidsByAuction } from '../lib/database';
import { AuctionListingWithNFT, AuctionBid } from '../lib/supabase';
import { toast } from 'sonner';

const categories = [
  { id: 'all', label: 'All items' },
  { id: 'tech', label: 'Technology' },
  { id: 'manufacturing', label: 'Manufacturing' },
  { id: 'retail', label: 'Retail' },
  { id: 'logistics', label: 'Logistics' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'energy', label: 'Energy' },
  { id: 'construction', label: 'Construction' },
  { id: 'food', label: 'Food' },
];

export function Marketplace({ userPublicKey, userRole }: { userPublicKey: string | null, userRole: UserRole | null }) {
  const [sortBy, setSortBy] = useState('recently-added');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceFilter, setPriceFilter] = useState('lowest');
  const [likesFilter, setLikesFilter] = useState('most-bids');
  const [creatorFilter, setCreatorFilter] = useState('verified');
  const [priceRange, setPriceRange] = useState([0, 30000]);
  const [selectedAuction, setSelectedAuction] = useState<AuctionListingWithNFT | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [userBids, setUserBids] = useState<AuctionBid[]>([]);
  const [confirmationData, setConfirmationData] = useState<{ auction: AuctionListingWithNFT, bidAmount: string } | null>(null);
  const [auctionListings, setAuctionListings] = useState<AuctionListingWithNFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [bidCounts, setBidCounts] = useState<Record<number, number>>({});

  // Update current time every minute for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Load auction listings
  useEffect(() => {
    loadAuctionListings();
  }, []);

  // Load user's bids
  useEffect(() => {
    if (userPublicKey) {
      loadUserBids();
    }
  }, [userPublicKey]);

  const loadAuctionListings = async () => {
    try {
      setLoading(true);
      console.log('Loading auction listings...');
      const listings = await getActiveAuctionListings();
      console.log('Loaded listings:', listings);
      console.log('Number of listings:', listings.length);
      setAuctionListings(listings);

      // Load bid counts for each auction
      const counts: Record<number, number> = {};
      for (const listing of listings) {
        const bids = await getBidsByAuction(listing.aid);
        counts[listing.aid] = bids.length;
      }
      setBidCounts(counts);
    } catch (error) {
      console.error('Failed to load auction listings:', error);
      toast.error('Failed to load auctions. Please check your database connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadUserBids = async () => {
    if (!userPublicKey) return;

    try {
      const bids = await getBidsByUser(userPublicKey);
      setUserBids(bids);
    } catch (error) {
      console.error('Failed to load user bids:', error);
    }
  };

  const handleShowConfirmation = (auction: AuctionListingWithNFT, bidAmount: string) => {
    setConfirmationData({ auction, bidAmount });
  };

  const handleConfirmBid = async () => {
    if (!confirmationData || !userPublicKey) return;

    const { auction, bidAmount } = confirmationData;
    
    try {
      await placeBid(auction.aid, parseFloat(bidAmount), userPublicKey);
      toast.success(`Bid placed successfully for ${bidAmount} RLUSD on ${auction.NFTOKEN?.invoice_number || 'NFT'}!`);
      
      // Reload data
      setConfirmationData(null);
      setSelectedAuction(null);
      await loadAuctionListings();
      await loadUserBids();
    } catch (error) {
      console.error('Failed to place bid:', error);
      toast.error('Failed to place bid. Please try again.');
    }
  };

  // Calculate time remaining
  const getTimeRemaining = (expiryDate: string | null) => {
    if (!expiryDate) return 'No expiry';
    
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

  // Filter and sort auctions
  const filteredAndSortedAuctions = auctionListings
    // Note: We now show ALL auctions, including ones the user has bid on
    // This allows investors to track their bids and place additional bids if desired
    // Filter by category (if we add category to NFTOKEN)
    .filter((auction) => {
      if (selectedCategory === 'all') return true;
      // For now, show all since we don't have categories in the schema
      return true;
    })
    // Filter by price range
    .filter((auction) => {
      const currentBid = auction.current_bid || 0;
      return currentBid <= priceRange[1] && currentBid >= priceRange[0];
    })
    // Sort based on active filters
    .sort((a, b) => {
      // Priority 1: Price filter (from filter panel)
      if (priceFilter === 'highest') {
        const priceDiff = (b.current_bid || 0) - (a.current_bid || 0);
        if (priceDiff !== 0) return priceDiff;
      } else if (priceFilter === 'lowest') {
        const priceDiff = (a.current_bid || 0) - (b.current_bid || 0);
        if (priceDiff !== 0) return priceDiff;
      }

      // Priority 2: Bids filter (from filter panel)
      if (likesFilter === 'most-bids') {
        const bidsDiff = (bidCounts[b.aid] || 0) - (bidCounts[a.aid] || 0);
        if (bidsDiff !== 0) return bidsDiff;
      } else if (likesFilter === 'least-bids') {
        const bidsDiff = (bidCounts[a.aid] || 0) - (bidCounts[b.aid] || 0);
        if (bidsDiff !== 0) return bidsDiff;
      }

      // Priority 3: Main sort dropdown (as tiebreaker)
      if (sortBy === 'recently-added') {
        return new Date(b.time_created).getTime() - new Date(a.time_created).getTime();
      } else if (sortBy === 'ending-soon') {
        const aExpiry = a.expiry ? new Date(a.expiry).getTime() : Infinity;
        const bExpiry = b.expiry ? new Date(b.expiry).getTime() : Infinity;
        return aExpiry - bExpiry;
      } else if (sortBy === 'highest-value') {
        return (b.face_value || 0) - (a.face_value || 0);
      } else if (sortBy === 'best-discount') {
        const aDiscount = a.face_value && a.current_bid ? ((a.face_value - a.current_bid) / a.face_value) * 100 : 0;
        const bDiscount = b.face_value && b.current_bid ? ((b.face_value - b.current_bid) / b.face_value) * 100 : 0;
        return bDiscount - aDiscount;
      }

      return 0;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 pt-16 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pt-16">
      {/* Main Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl lg:text-5xl text-white mb-8">Discover</h1>

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none px-4 py-2.5 pr-10 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-600 transition-colors cursor-pointer"
                >
                  <option value="recently-added">Recently added</option>
                  <option value="ending-soon">Ending soon</option>
                  <option value="highest-value">Highest value</option>
                  <option value="best-discount">Best discount</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                      selectedCategory === category.id
                        ? 'bg-white text-gray-900'
                        : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>

              {/* Filter Button */}
              <button className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="w-4 h-4" />
                Filter
              </button>
            </div>

            {/* Filter Bar */}
            {showFilters && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Price Sort */}
                  <div>
                    <label className="block text-xs text-gray-400 uppercase mb-2 tracking-wide">
                      Price
                    </label>
                    <div className="relative">
                      <select
                        value={priceFilter}
                        onChange={(e) => setPriceFilter(e.target.value)}
                        className="appearance-none w-full px-4 py-2.5 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-600 transition-colors cursor-pointer"
                      >
                        <option value="highest">Highest price</option>
                        <option value="lowest">Lowest price</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Bids Filter */}
                  <div>
                    <label className="block text-xs text-gray-400 uppercase mb-2 tracking-wide">
                      Bids
                    </label>
                    <div className="relative">
                      <select
                        value={likesFilter}
                        onChange={(e) => setLikesFilter(e.target.value)}
                        className="appearance-none w-full px-4 py-2.5 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-600 transition-colors cursor-pointer"
                      >
                        <option value="most-bids">Most bids</option>
                        <option value="least-bids">Least bids</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Creator Filter */}
                  <div>
                    <label className="block text-xs text-gray-400 uppercase mb-2 tracking-wide">
                      Creator
                    </label>
                    <div className="relative">
                      <select
                        value={creatorFilter}
                        onChange={(e) => setCreatorFilter(e.target.value)}
                        className="appearance-none w-full px-4 py-2.5 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-600 transition-colors cursor-pointer"
                      >
                        <option value="verified">Verified only</option>
                        <option value="all">All creators</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Price Range */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs text-gray-400 uppercase tracking-wide">
                        Price Range
                      </label>
                      <span className="text-xs text-white bg-gray-800 px-2 py-1 rounded">
                        RLUSD
                      </span>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="0"
                        max="30000"
                        step="1000"
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>0 RLUSD</span>
                        <span>{priceRange[1].toLocaleString()} RLUSD</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cards Grid */}
          {filteredAndSortedAuctions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No auctions available at the moment.</p>
              <p className="text-gray-500 text-sm mt-2">Check back later for new listings!</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedAuctions.map((auction) => {
                const discount = auction.face_value && auction.current_bid 
                  ? ((auction.face_value - auction.current_bid) / auction.face_value) * 100 
                  : 0;
                const timeRemaining = getTimeRemaining(auction.expiry);
                const isEndingSoon = auction.expiry ? new Date(auction.expiry).getTime() - currentTime < 24 * 60 * 60 * 1000 : false;

                return (
                  <div
                    key={auction.aid}
                    className="group bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all cursor-pointer backdrop-blur-sm"
                    onClick={() => setSelectedAuction(auction)}
                  >
                    {/* NFT Visual */}
                    <div className={`relative h-64 bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center`}>
                      <div className="text-center">
                        <FileText className="w-16 h-16 text-white/80 mx-auto mb-4" />
                        <p className="text-white/60 text-sm px-4">
                          {auction.NFTOKEN?.invoice_number || 'Invoice NFT'}
                        </p>
                      </div>
                      
                      {/* Status Badge */}
                      {isEndingSoon && (
                        <div className="absolute top-4 right-4 px-3 py-1 bg-orange-500/90 text-white text-xs rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Ending Soon
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-white mb-1">{auction.NFTOKEN?.invoice_number || 'Invoice NFT'}</h3>
                          <p className="text-gray-400 text-sm">
                            Issuer: {auction.NFTOKEN?.created_by?.substring(0, 8)}...
                          </p>
                        </div>
                        <Shield className="w-5 h-5 text-blue-400" />
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">Current Bid</span>
                          <span className="text-white">{auction.current_bid?.toLocaleString() || '0'} RLUSD</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">Face Value</span>
                          <span className="text-gray-300 text-sm">{auction.face_value?.toLocaleString() || '0'} RLUSD</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">Discount</span>
                          <span className="text-green-400 text-sm">{discount.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">Time Left</span>
                          <span className="text-white text-sm flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            {timeRemaining}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                        <div className="flex items-center gap-1 text-gray-400 text-sm">
                          <TrendingUp className="w-4 h-4" />
                          <span>{bidCounts[auction.aid] || 0} bids</span>
                        </div>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm group-hover:bg-blue-500">
                          {userRole === 'establishment' ? 'View Details' : 'Place Bid'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Auction Detail Modal */}
      {selectedAuction && (
        <AuctionDetailModal
          auction={selectedAuction}
          userPublicKey={userPublicKey}
          userRole={userRole}
          onClose={() => setSelectedAuction(null)}
          onPlaceBid={handleShowConfirmation}
          bidCount={bidCounts[selectedAuction.aid] || 0}
          timeRemaining={getTimeRemaining(selectedAuction.expiry)}
        />
      )}

      {/* Bid Confirmation Modal */}
      {confirmationData && (
        <BidConfirmationModal
          auction={confirmationData.auction}
          bidAmount={confirmationData.bidAmount}
          onConfirm={handleConfirmBid}
          onCancel={() => setConfirmationData(null)}
        />
      )}
    </div>
  );
}

// Auction Detail Modal Component
function AuctionDetailModal({
  auction,
  userPublicKey,
  userRole,
  onClose,
  onPlaceBid,
  bidCount,
  timeRemaining
}: {
  auction: AuctionListingWithNFT;
  userPublicKey: string | null;
  userRole: UserRole | null;
  onClose: () => void;
  onPlaceBid: (auction: AuctionListingWithNFT, bidAmount: string) => void;
  bidCount: number;
  timeRemaining: string;
}) {
  const [bidAmount, setBidAmount] = useState('');
  const discount = auction.face_value && auction.current_bid 
    ? ((auction.face_value - auction.current_bid) / auction.face_value) * 100 
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(bidAmount);
    
    if (!amount || amount < (auction.min_bid || 0)) {
      toast.error(`Minimum bid is ${auction.min_bid?.toLocaleString()} RLUSD`);
      return;
    }
    
    if (amount <= (auction.current_bid || 0)) {
      toast.error(`Bid must be higher than current bid of ${auction.current_bid?.toLocaleString()} RLUSD`);
      return;
    }
    
    onPlaceBid(auction, bidAmount);
  };

  const maturityDays = auction.NFTOKEN?.maturity_date 
    ? Math.ceil((new Date(auction.NFTOKEN.maturity_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex items-center justify-between z-10">
          <h2 className="text-2xl text-white">Invoice NFT Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* NFT Visual */}
          <div className={`relative h-64 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-6`}>
            <div className="text-center">
              <FileText className="w-20 h-20 text-white/80 mx-auto mb-4" />
              <p className="text-white text-lg">{auction.NFTOKEN?.invoice_number || 'Invoice NFT'}</p>
              <p className="text-white/60 text-sm mt-2">Token ID: {auction.NFTOKEN?.nftoken_id?.substring(0, 16)}...</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Current Bid</span>
              </div>
              <p className="text-2xl text-white">{auction.current_bid?.toLocaleString() || '0'} RLUSD</p>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm">Face Value</span>
              </div>
              <p className="text-2xl text-white">{auction.face_value?.toLocaleString() || '0'} RLUSD</p>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Discount</span>
              </div>
              <p className="text-2xl text-green-400">{discount.toFixed(1)}%</p>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Timer className="w-4 h-4" />
                <span className="text-sm">Time Left</span>
              </div>
              <p className="text-2xl text-white">{timeRemaining}</p>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Maturity</span>
              </div>
              <p className="text-xl text-white">{maturityDays} days</p>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Total Bids</span>
              </div>
              <p className="text-2xl text-white">{bidCount}</p>
            </div>
          </div>

          {/* Issuer Info */}
          <div className="bg-gray-800/50 p-4 rounded-lg mb-6">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Shield className="w-4 h-4" />
              <span className="text-sm">Issuer</span>
            </div>
            <p className="text-white font-mono text-sm">{auction.NFTOKEN?.created_by}</p>
          </div>

          {/* Place Bid Form (only for investors) */}
          {userRole === 'investor' && userPublicKey && (
            <form onSubmit={handleSubmit} className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-6">
              <h3 className="text-white mb-4">Place Your Bid</h3>
              
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">
                  Bid Amount (RLUSD) *
                </label>
                <input
                  type="number"
                  min={auction.min_bid || 0}
                  step="0.01"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={`Minimum: ${auction.min_bid?.toLocaleString() || '0'} RLUSD`}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 transition-colors"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  Must exceed current bid: {auction.current_bid?.toLocaleString() || '0'} RLUSD
                </p>
              </div>

              <button
                type="submit"
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Place Bid
              </button>
            </form>
          )}

          {/* View-only message for establishments */}
          {userRole === 'establishment' && (
            <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-6">
              <div className="flex items-center gap-2 text-amber-400 mb-2">
                <AlertCircle className="w-5 h-5" />
                <h3>View Only</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Establishments can view auction details but cannot place bids. Only investors can participate in bidding.
              </p>
            </div>
          )}

          {/* Login prompt */}
          {!userPublicKey && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
              <p className="text-gray-400">Please sign in to place a bid on this auction.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Bid Confirmation Modal Component
function BidConfirmationModal({
  auction,
  bidAmount,
  onConfirm,
  onCancel
}: {
  auction: AuctionListingWithNFT;
  bidAmount: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-2xl text-white">Confirm Your Bid</h2>
        </div>

        <div className="p-6">
          <div className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-4 mb-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Invoice</span>
                <span className="text-white">{auction.NFTOKEN?.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Your Bid</span>
                <span className="text-white text-xl">{parseFloat(bidAmount).toLocaleString()} RLUSD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Face Value</span>
                <span className="text-gray-300">{auction.face_value?.toLocaleString()} RLUSD</span>
              </div>
            </div>
          </div>

          <p className="text-gray-400 text-sm mb-6">
            By confirming this bid, you agree to purchase this invoice NFT if you win the auction at maturity for the bid amount.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Confirm Bid
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}