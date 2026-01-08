import { supabase, User, NFToken, AuctionListing, AuctionBid, AuctionListingWithNFT, isSupabaseConfigured } from './supabase';

// Helper function to check if Supabase is configured
function checkSupabaseConfig() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please update /lib/supabase.ts with your credentials.');
  }
}

// ==========================================
// USER OPERATIONS
// ==========================================

export async function createUser(publicKey: string, username: string, role: 'investor' | 'establishment') {
  checkSupabaseConfig();
  const { data, error } = await supabase
    .from('USER')
    .insert([{ publicKey, username, role }])
    .select()
    .single();

  if (error) throw error;
  return data as User;
}

export async function getUserByPublicKey(publicKey: string) {
  checkSupabaseConfig();
  const { data, error } = await supabase
    .from('USER')
    .select('*')
    .eq('publicKey', publicKey)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data as User;
}

export async function getUserByUsername(username: string) {
  checkSupabaseConfig();
  const { data, error } = await supabase
    .from('USER')
    .select('*')
    .eq('username', username)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data as User;
}

export async function getAllUsers() {
  checkSupabaseConfig();
  const { data, error } = await supabase
    .from('USER')
    .select('*')
    .order('username');

  if (error) throw error;
  return data as User[];
}

// ==========================================
// NFTOKEN OPERATIONS
// ==========================================

export async function createNFToken(nftoken: Omit<NFToken, 'current_state'> & { current_state?: string }) {
  checkSupabaseConfig();
  const { data, error } = await supabase
    .from('NFTOKEN')
    .insert([{ ...nftoken, current_state: nftoken.current_state || 'draft' }])
    .select()
    .single();

  if (error) throw error;
  return data as NFToken;
}

export async function getNFTokenById(nftoken_id: string) {
  checkSupabaseConfig();
  const { data, error } = await supabase
    .from('NFTOKEN')
    .select('*')
    .eq('nftoken_id', nftoken_id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data as NFToken;
}

export async function getNFTokensByCreator(publicKey: string) {
  checkSupabaseConfig();
  const { data, error } = await supabase
    .from('NFTOKEN')
    .select('*')
    .eq('created_by', publicKey)
    .eq('current_state', 'issued') // Only show successfully minted NFTs
    .order('nftoken_id', { ascending: false });

  if (error) throw error;
  return data as NFToken[];
}

export async function getNFTokensByOwner(publicKey: string) {
  checkSupabaseConfig();
  const { data, error } = await supabase
    .from('NFTOKEN')
    .select('*')
    .eq('current_owner', publicKey)
    .eq('current_state', 'issued') // CRITICAL: Only show successfully minted NFTs
    .order('nftoken_id', { ascending: false });

  if (error) throw error;
  return data as NFToken[];
}

export async function updateNFToken(nftoken_id: string, updates: Partial<NFToken>) {
  checkSupabaseConfig();
  const { data, error } = await supabase
    .from('NFTOKEN')
    .update(updates)
    .eq('nftoken_id', nftoken_id)
    .select()
    .single();

  if (error) throw error;
  return data as NFToken;
}

export async function getAllNFTokens() {
  checkSupabaseConfig();
  const { data, error } = await supabase
    .from('NFTOKEN')
    .select('*')
    .order('nftoken_id', { ascending: false });

  if (error) throw error;
  return data as NFToken[];
}

// ==========================================
// AUCTIONLISTING OPERATIONS
// ==========================================

export async function createAuctionListing(listing: Omit<AuctionListing, 'aid' | 'time_created' | 'current_bid'> & { current_bid?: number }) {
  checkSupabaseConfig();
  const { data, error } = await supabase
    .from('AUCTIONLISTING')
    .insert([{ ...listing, current_bid: listing.current_bid || listing.min_bid }])
    .select()
    .single();

  if (error) throw error;
  
  // Update NFToken state to 'listed'
  if (listing.nftoken_id) {
    await updateNFToken(listing.nftoken_id, { current_state: 'listed' });
  }
  
  return data as AuctionListing;
}

export async function getAuctionListingById(aid: number) {
  checkSupabaseConfig();
  
  // First get the auction listing
  const { data: listing, error: listingError } = await supabase
    .from('AUCTIONLISTING')
    .select('*')
    .eq('aid', aid)
    .single();

  if (listingError) {
    if (listingError.code === 'PGRST116') return null; // Not found
    throw listingError;
  }
  
  // Then get the NFT data if exists
  if (listing.nftoken_id) {
    const { data: nft } = await supabase
      .from('NFTOKEN')
      .select('*')
      .eq('nftoken_id', listing.nftoken_id)
      .single();
    
    return {
      ...listing,
      NFTOKEN: nft || undefined
    } as AuctionListingWithNFT;
  }
  
  return listing as AuctionListingWithNFT;
}

export async function getAllAuctionListings() {
  checkSupabaseConfig();
  const { data, error } = await supabase
    .from('AUCTIONLISTING')
    .select(`
      *,
      NFTOKEN (*)
    `)
    .order('time_created', { ascending: false });

  if (error) throw error;
  return data as AuctionListingWithNFT[];
}

export async function getActiveAuctionListings() {
  checkSupabaseConfig();
  const now = new Date().toISOString();
  
  // First get auction listings
  const { data: listings, error: listingsError } = await supabase
    .from('AUCTIONLISTING')
    .select('*')
    .gt('expiry', now)
    .order('time_created', { ascending: false });

  if (listingsError) throw listingsError;
  
  // Then fetch NFT data for each listing
  const listingsWithNFTs: AuctionListingWithNFT[] = [];
  
  for (const listing of listings || []) {
    if (listing.nftoken_id) {
      const { data: nft } = await supabase
        .from('NFTOKEN')
        .select('*')
        .eq('nftoken_id', listing.nftoken_id)
        .single();
      
      listingsWithNFTs.push({
        ...listing,
        NFTOKEN: nft || undefined
      });
    } else {
      listingsWithNFTs.push(listing);
    }
  }
  
  return listingsWithNFTs;
}

export async function getAuctionListingsByCreator(publicKey: string) {
  checkSupabaseConfig();
  const { data, error } = await supabase
    .from('AUCTIONLISTING')
    .select(`
      *,
      NFTOKEN!inner (*)
    `)
    .eq('NFTOKEN.created_by', publicKey)
    .order('time_created', { ascending: false });

  if (error) throw error;
  return data as AuctionListingWithNFT[];
}

export async function updateAuctionListing(aid: number, updates: Partial<AuctionListing>) {
  checkSupabaseConfig();
  const { data, error } = await supabase
    .from('AUCTIONLISTING')
    .update(updates)
    .eq('aid', aid)
    .select()
    .single();

  if (error) throw error;
  return data as AuctionListing;
}

// ==========================================
// AUCTIONBIDS OPERATIONS
// ==========================================

export async function placeBid(aid: number, bid_amount: number, bid_by: string) {
  checkSupabaseConfig();
  // Start a transaction-like operation
  // 1. Insert the bid
  const { data: bidData, error: bidError } = await supabase
    .from('AUCTIONBIDS')
    .insert([{ aid, bid_amount, bid_by }])
    .select()
    .single();

  if (bidError) throw bidError;

  // 2. Update the current_bid in AUCTIONLISTING
  const { error: updateError } = await supabase
    .from('AUCTIONLISTING')
    .update({ current_bid: bid_amount })
    .eq('aid', aid);

  if (updateError) throw updateError;

  return bidData as AuctionBid;
}

export async function getBidsByAuction(aid: number) {
  checkSupabaseConfig();
  const { data, error } = await supabase
    .from('AUCTIONBIDS')
    .select('*')
    .eq('aid', aid)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as AuctionBid[];
}

export async function getBidsByUser(publicKey: string) {
  checkSupabaseConfig();
  
  // First get the bids
  const { data: bids, error: bidsError } = await supabase
    .from('AUCTIONBIDS')
    .select('*')
    .eq('bid_by', publicKey)
    .order('created_at', { ascending: false });

  if (bidsError) throw bidsError;
  
  // For now, return bids without nested data
  // The dashboard will fetch additional details if needed
  return bids as AuctionBid[];
}

export async function getHighestBidForAuction(aid: number) {
  checkSupabaseConfig();
  const { data, error } = await supabase
    .from('AUCTIONBIDS')
    .select('*')
    .eq('aid', aid)
    .order('bid_amount', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No bids yet
    throw error;
  }
  return data as AuctionBid;
}

export async function getAllBids() {
  checkSupabaseConfig();
  const { data, error } = await supabase
    .from('AUCTIONBIDS')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as AuctionBid[];
}

// ==========================================
// REAL-TIME SUBSCRIPTIONS
// ==========================================

export function subscribeToAuctionListings(callback: (payload: any) => void) {
  checkSupabaseConfig();
  return supabase
    .channel('auction-listings-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'AUCTIONLISTING' }, callback)
    .subscribe();
}

export function subscribeToAuctionBids(callback: (payload: any) => void) {
  checkSupabaseConfig();
  return supabase
    .channel('auction-bids-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'AUCTIONBIDS' }, callback)
    .subscribe();
}

export function subscribeToNFTokens(callback: (payload: any) => void) {
  checkSupabaseConfig();
  return supabase
    .channel('nftokens-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'NFTOKEN' }, callback)
    .subscribe();
}