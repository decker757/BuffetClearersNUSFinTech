import { supabase } from '../config/supabase.js';
import { hasEnoughRLUSD } from '../services/xrplService.js';
import { finalizeAuction, processExpiredAuctions } from '../services/auctionFinalizationService.js';

// Create a new auction listing
export const createAuction = async (req, res) => {
  try {
    const { nftoken_id, face_value, expiry, min_bid, original_owner } = req.body;
    const { address } = req.user; // From JWT token

    // Validate required fields
    if (!nftoken_id || !face_value || !expiry || !min_bid || !original_owner) {
      return res.status(400).json({
        error: 'Missing required fields: nftoken_id, face_value, expiry, min_bid, original_owner'
      });
    }

    // Verify that authenticated user matches original_owner
    if (address !== original_owner) {
      return res.status(403).json({
        error: 'original_owner must match authenticated wallet address',
        authenticated_user: address,
        provided_owner: original_owner
      });
    }

    // Validate that expiry is in the future
    const expiryDate = new Date(expiry);
    if (expiryDate <= new Date()) {
      return res.status(400).json({
        error: 'Expiry date must be in the future'
      });
    }

    // TODO: Verify platform wallet holds the NFT
    // In production, query XRPL ledger to check NFT ownership
    // For now, we'll trust that user transferred NFT before creating listing
    // const nftOwner = await getNFTOwner(nftoken_id);
    // if (nftOwner !== PLATFORM_WALLET_ADDRESS) {
    //   return res.status(400).json({ error: 'Platform does not hold this NFT' });
    // }

    // Create auction listing
    const { data, error } = await supabase
      .from('AUCTIONLISTING')
      .insert({
        nftoken_id,
        face_value,
        expiry: expiryDate.toISOString(),
        min_bid,
        current_bid: min_bid,
        original_owner: address,
        platform_holds_nft: true,  // Assuming NFT was transferred
        status: 'active'
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
          current_state,
          created_by
        )
      `)
      .gte('expiry', now)
      .order('time_created', { ascending: false });

    if (error) {
      console.error('Error fetching auctions:', error);
      return res.status(500).json({ error: error.message });
    }

    // Fetch usernames for all creators
    const creatorAddresses = [...new Set(
      data
        .filter(auction => auction.NFTOKEN?.created_by)
        .map(auction => auction.NFTOKEN.created_by)
    )];

    let usernameMap = {};
    if (creatorAddresses.length > 0) {
      const { data: users } = await supabase
        .from('USER')
        .select('publicKey, username')
        .in('publicKey', creatorAddresses);

      if (users) {
        usernameMap = Object.fromEntries(
          users.map(user => [user.publicKey, user.username])
        );
      }
    }

    // Add creator_username to each auction's NFTOKEN
    const auctionsWithUsernames = data.map(auction => ({
      ...auction,
      NFTOKEN: auction.NFTOKEN ? {
        ...auction.NFTOKEN,
        creator_username: usernameMap[auction.NFTOKEN.created_by] || 'Unknown'
      } : null
    }));

    res.json({
      success: true,
      auctions: auctionsWithUsernames
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
    const { address } = req.user; // From JWT token

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
            image_link,
            created_by
          )
        )
      `)
      .eq('bid_by', address)
      .eq('check_status', 'active')
      .order('created_at', { ascending: false});

    if (error) {
      console.error('Error fetching user bids:', error);
      return res.status(500).json({ error: error.message });
    }

    // Fetch usernames for all creators
    const creatorAddresses = [...new Set(
      data
        .filter(bid => bid.AUCTIONLISTING?.NFTOKEN?.created_by)
        .map(bid => bid.AUCTIONLISTING.NFTOKEN.created_by)
    )];

    let usernameMap = {};
    if (creatorAddresses.length > 0) {
      const { data: users } = await supabase
        .from('USER')
        .select('publicKey, username')
        .in('publicKey', creatorAddresses);

      if (users) {
        usernameMap = Object.fromEntries(
          users.map(user => [user.publicKey, user.username])
        );
      }
    }

    // Add creator_username to each bid's NFTOKEN
    const bidsWithUsernames = data.map(bid => ({
      ...bid,
      AUCTIONLISTING: bid.AUCTIONLISTING ? {
        ...bid.AUCTIONLISTING,
        NFTOKEN: bid.AUCTIONLISTING.NFTOKEN ? {
          ...bid.AUCTIONLISTING.NFTOKEN,
          creator_username: usernameMap[bid.AUCTIONLISTING.NFTOKEN.created_by] || 'Unknown'
        } : null
      } : null
    }));

    res.json({
      success: true,
      bids: bidsWithUsernames
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
    const { bid_amount, xrpl_check_id, xrpl_check_tx_hash } = req.body;
    const { address } = req.user; // From JWT token

    // Validate required fields
    if (!bid_amount || bid_amount <= 0) {
      return res.status(400).json({
        error: 'Invalid bid amount'
      });
    }

    if (!xrpl_check_id || !xrpl_check_tx_hash) {
      return res.status(400).json({
        error: 'Missing Check information. Please create XRPL Check before placing bid.',
        required_fields: ['xrpl_check_id', 'xrpl_check_tx_hash']
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
        error: `Bid must be at least ${auction.min_bid} RLUSD`,
        min_bid: auction.min_bid
      });
    }

    // Verify bidder has sufficient RLUSD balance
    const hasSufficientBalance = await hasEnoughRLUSD(address, bid_amount);

    if (!hasSufficientBalance) {
      return res.status(400).json({
        error: 'Insufficient RLUSD balance to place this bid',
        bid_amount,
        message: `You need at least ${bid_amount} RLUSD to place this bid`
      });
    }

    // Check if user already has a bid on this auction
    const { data: existingBid } = await supabase
      .from('AUCTIONBIDS')
      .select('bid_id')
      .eq('aid', id)
      .eq('bid_by', address)
      .eq('check_status', 'active')
      .single();

    let bidData;

    if (existingBid) {
      // Update existing bid
      console.log(`Updating existing bid ${existingBid.bid_id} for auction ${id}`);
      const { data, error: bidError } = await supabase
        .from('AUCTIONBIDS')
        .update({
          bid_amount,
          xrpl_check_id,
          xrpl_check_tx_hash,
          created_at: new Date().toISOString() // Update timestamp to reflect new bid time
        })
        .eq('bid_id', existingBid.bid_id)
        .select()
        .single();

      if (bidError) {
        console.error('Error updating bid:', bidError);
        return res.status(500).json({ error: bidError.message });
      }
      bidData = data;
    } else {
      // Create new bid
      console.log(`Creating new bid for auction ${id}`);
      const { data, error: bidError } = await supabase
        .from('AUCTIONBIDS')
        .insert({
          aid: id,
          bid_amount,
          bid_by: address,
          xrpl_check_id,
          xrpl_check_tx_hash,
          check_status: 'active'
        })
        .select()
        .single();

      if (bidError) {
        console.error('Error placing bid:', bidError);
        return res.status(500).json({ error: bidError.message });
      }
      bidData = data;
    }

    // Recalculate current_bid by finding highest active bid
    const { data: allBids, error: bidsError } = await supabase
      .from('AUCTIONBIDS')
      .select('bid_amount')
      .eq('aid', id)
      .eq('check_status', 'active')
      .order('bid_amount', { ascending: false });

    if (bidsError) {
      console.error('Error fetching bids for recalculation:', bidsError);
    }

    // Get the highest bid amount from active bids
    const newCurrentBid = (allBids && allBids.length > 0)
      ? allBids[0].bid_amount
      : auction.min_bid;

    console.log(`Recalculated current_bid for auction ${id}: ${newCurrentBid} (from ${allBids?.length || 0} active bids)`);

    // Update current_bid in auction listing
    const { error: updateError } = await supabase
      .from('AUCTIONLISTING')
      .update({ current_bid: newCurrentBid })
      .eq('aid', id);

    if (updateError) {
      console.error('Error updating auction:', updateError);
      // Rollback: delete the bid we just created
      await supabase.from('AUCTIONBIDS').delete().eq('bid_id', bidData.bid_id);
      return res.status(500).json({ error: 'Failed to update auction' });
    }

    // XRPL Check created and verified
    // Check will be cashed when auction expires (see auctionFinalizationService.js)

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

// Manually finalize a specific auction (admin/testing endpoint)
export const finalizeAuctionManually = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`Manual finalization requested for auction ${id}`);

    const result = await finalizeAuction(id);

    res.json({
      success: result.success,
      status: result.status,
      message: result.message,
      details: result.details
    });
  } catch (error) {
    console.error('Error in finalizeAuctionManually:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

// Process all expired auctions (admin/testing endpoint)
export const processAllExpiredAuctions = async (req, res) => {
  try {
    console.log('Manual processing of all expired auctions requested');

    // Run the background job manually
    await processExpiredAuctions();

    res.json({
      success: true,
      message: 'Expired auctions processing completed. Check server logs for details.'
    });
  } catch (error) {
    console.error('Error in processAllExpiredAuctions:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};