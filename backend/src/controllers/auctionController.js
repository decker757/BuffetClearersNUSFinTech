import { supabase } from '../config/supabase.js';

// Create a new auction listing
export const createAuction = async (req, res) => {
  try {
    const { nftoken_id, face_value, expiry, min_bid } = req.body;

    // Validate required fields
    if (!nftoken_id || !face_value || !expiry || !min_bid) {
      return res.status(400).json({
        error: 'Missing required fields: nftoken_id, face_value, expiry, min_bid'
      });
    }

    // Validate that expiry is in the future
    const expiryDate = new Date(expiry);
    if (expiryDate <= new Date()) {
      return res.status(400).json({
        error: 'Expiry date must be in the future'
      });
    }

    // Create auction listing
    const { data, error } = await supabase
      .from('AUCTIONLISTING')
      .insert({
        nftoken_id,
        face_value,
        expiry: expiryDate.toISOString(),
        min_bid,
        current_bid: min_bid
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating auction:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({
      success: true,
      auction: data
    });
  } catch (error) {
    console.error('Error in createAuction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all active auctions (not expired)
export const getActiveAuctions = async (req, res) => {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('AUCTIONLISTING')
      .select(`
        *,
        NFTOKEN (
          nftoken_id,
          invoice_number,
          face_value,
          image_link,
          maturity_date,
          current_owner,
          current_state
        )
      `)
      .gte('expiry', now)
      .order('time_created', { ascending: false });

    if (error) {
      console.error('Error fetching auctions:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({
      success: true,
      auctions: data
    });
  } catch (error) {
    console.error('Error in getActiveAuctions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a specific auction by ID
export const getAuctionById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('AUCTIONLISTING')
      .select(`
        *,
        NFTOKEN (
          nftoken_id,
          invoice_number,
          face_value,
          image_link,
          maturity_date,
          current_owner,
          current_state,
          created_by
        )
      `)
      .eq('aid', id)
      .single();

    if (error) {
      console.error('Error fetching auction:', error);
      return res.status(404).json({ error: 'Auction not found' });
    }

    res.json({
      success: true,
      auction: data
    });
  } catch (error) {
    console.error('Error in getAuctionById:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get bids for a specific auction
export const getAuctionBids = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('AUCTIONBIDS')
      .select(`
        bid_id,
        aid,
        bid_amount,
        bid_by,
        created_at
      `)
      .eq('aid', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bids:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({
      success: true,
      bids: data
    });
  } catch (error) {
    console.error('Error in getAuctionBids:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all bids by a specific user
export const getUserBids = async (req, res) => {
  try {
    const { publicKey } = req.user; // From JWT token

    const { data, error } = await supabase
      .from('AUCTIONBIDS')
      .select(`
        *,
        AUCTIONLISTING!inner (
          aid,
          nftoken_id,
          face_value,
          expiry,
          min_bid,
          current_bid,
          NFTOKEN (
            invoice_number,
            image_link
          )
        )
      `)
      .eq('bid_by', publicKey)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user bids:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({
      success: true,
      bids: data
    });
  } catch (error) {
    console.error('Error in getUserBids:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Place a bid on an auction
export const placeBid = async (req, res) => {
  try {
    const { id } = req.params; // auction ID
    const { bid_amount } = req.body;
    const { publicKey } = req.user; // From JWT token

    // Validate bid amount
    if (!bid_amount || bid_amount <= 0) {
      return res.status(400).json({
        error: 'Invalid bid amount'
      });
    }

    // Get auction details
    const { data: auction, error: auctionError } = await supabase
      .from('AUCTIONLISTING')
      .select('*')
      .eq('aid', id)
      .single();

    if (auctionError || !auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Check if auction has expired
    const now = new Date();
    const expiryDate = new Date(auction.expiry);
    if (expiryDate <= now) {
      return res.status(400).json({
        error: 'Auction has expired'
      });
    }

    // Validate bid meets minimum requirements
    if (bid_amount < auction.min_bid) {
      return res.status(400).json({
        error: `Bid must be at least ${auction.min_bid}`,
        min_bid: auction.min_bid
      });
    }

    if (bid_amount <= auction.current_bid) {
      return res.status(400).json({
        error: `Bid must be greater than current bid of ${auction.current_bid}`,
        current_bid: auction.current_bid
      });
    }

    // TODO: Check if user has sufficient RLUSD balance
    // This will be implemented by your friend handling XRPL integration
    // For now, we'll assume the user has sufficient balance

    // Insert bid record
    const { data: bidData, error: bidError } = await supabase
      .from('AUCTIONBIDS')
      .insert({
        aid: id,
        bid_amount,
        bid_by: publicKey
      })
      .select()
      .single();

    if (bidError) {
      console.error('Error placing bid:', bidError);
      return res.status(500).json({ error: bidError.message });
    }

    // Update current_bid in auction listing
    const { error: updateError } = await supabase
      .from('AUCTIONLISTING')
      .update({ current_bid: bid_amount })
      .eq('aid', id);

    if (updateError) {
      console.error('Error updating auction:', updateError);
      // Rollback: delete the bid we just created
      await supabase.from('AUCTIONBIDS').delete().eq('bid_id', bidData.bid_id);
      return res.status(500).json({ error: 'Failed to update auction' });
    }

    // TODO: Trigger XRPL payment (Investor → Bakery)
    // This will be implemented by your friend handling XRPL integration
    // For now, we just return success

    res.status(201).json({
      success: true,
      message: 'Bid placed successfully',
      bid: bidData,
      new_current_bid: bid_amount
    });
  } catch (error) {
    console.error('Error in placeBid:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};