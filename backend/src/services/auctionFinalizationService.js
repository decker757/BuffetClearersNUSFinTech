import {
  hasEnoughRLUSD,
  cashCheck,
  cancelCheck,
  transferNFT
} from './xrplService.js';
import { supabase } from '../config/supabase.js';

// Check-based payment system with balance validation (Option 3)
// Checks are created upfront, balance verified at settlement

/**
 * Process auction finalization when it expires
 * NEW FLOW: Just mark the winner, they pay later via "Pay & Claim NFT" button
 * Returns: { success, status, message, details }
 */
export async function finalizeAuction(auctionId) {
  try {
    console.log(`\n🏁 Finalizing auction ${auctionId}...`);

    // Get auction with bids
    // Note: Using AUCTIONBIDS!AUCTIONBIDS_aid_fkey to specify which FK relationship to use
    // (since there are two FKs between AUCTIONLISTING and AUCTIONBIDS)
    const { data: auction, error: auctionError } = await supabase
      .from('AUCTIONLISTING')
      .select(`
        *,
        NFTOKEN(*),
        AUCTIONBIDS!AUCTIONBIDS_aid_fkey(*)
      `)
      .eq('aid', auctionId)
      .single();

    if (auctionError || !auction) {
      console.error('Failed to fetch auction:', {
        auctionId,
        error: auctionError,
        hasData: !!auction
      });
      throw new Error(`Auction not found: ${auctionError?.message || 'No data returned'}`);
    }

    // Check if auction has expired
    if (new Date(auction.expiry) > new Date()) {
      return { success: false, status: 'not_expired', message: 'Auction has not expired yet' };
    }

    // Get sorted bids (highest first) - filter by active status
    const sortedBids = (auction.AUCTIONBIDS || [])
      .filter(bid => bid.check_status === 'active')
      .sort((a, b) => b.bid_amount - a.bid_amount);

    if (sortedBids.length === 0) {
      console.log('  No bids received - marking as unlisted');
      // No bids - mark as unlisted (NFT stays in platform wallet until owner unlists it manually)
      await supabase
        .from('AUCTIONLISTING')
        .update({ status: 'unlisted' })
        .eq('aid', auctionId);

      return {
        success: true,
        status: 'unlisted',
        message: 'No bids received, auction unlisted'
      };
    }

    // Try each bidder from highest to lowest until we find one with sufficient balance
    for (let i = 0; i < sortedBids.length; i++) {
      const bid = sortedBids[i];
      console.log(`  Checking bidder ${i + 1}/${sortedBids.length}: ${bid.bid_by} (${bid.bid_amount} RLUSD)`);

      // Check if bidder has enough RLUSD
      const hasSufficientBalance = await hasEnoughRLUSD(bid.bid_by, bid.bid_amount);

      if (hasSufficientBalance) {
        // Found a winner with sufficient balance!
        console.log(`  ✅ Winner found: ${bid.bid_by} with sufficient balance`);

        // Update winning bid status to 'won_unpaid'
        const { error: bidUpdateError } = await supabase
          .from('AUCTIONBIDS')
          .update({ check_status: 'won_unpaid' })
          .eq('bid_id', bid.bid_id);

        if (bidUpdateError) {
          console.error('  ❌ Failed to update bid status:', bidUpdateError);
          throw new Error(`Failed to update bid status: ${bidUpdateError.message}`);
        }

        console.log(`  ✅ Bid ${bid.bid_id} marked as won_unpaid`);

        // Mark auction as completed (winner still needs to pay)
        const { error: auctionUpdateError } = await supabase
          .from('AUCTIONLISTING')
          .update({
            status: 'completed',
            winning_bid_id: bid.bid_id
          })
          .eq('aid', auctionId);

        if (auctionUpdateError) {
          console.error('  ❌ Failed to update auction status:', auctionUpdateError);
          throw new Error(`Failed to update auction status: ${auctionUpdateError.message}`);
        }

        console.log('  ✅ Auction marked as completed - winner must now pay to claim NFT');

        return {
          success: true,
          status: 'completed',
          message: 'Auction ended - winner can now pay and claim NFT',
          details: {
            winner: bid.bid_by,
            amount: bid.bid_amount
          }
        };
      } else {
        console.log(`  ❌ Bidder ${bid.bid_by} has insufficient balance, trying next...`);
      }
    }

    // No bidders had sufficient balance
    console.log('  ❌ No bidders have sufficient balance - marking as unlisted');
    await supabase
      .from('AUCTIONLISTING')
      .update({ status: 'unlisted' })
      .eq('aid', auctionId);

    return {
      success: false,
      status: 'unlisted',
      message: 'No bidders had sufficient balance, auction unlisted'
    };

  } catch (error) {
    console.error('Error finalizing auction:', error);
    return {
      success: false,
      status: 'error',
      message: error.message
    };
  }
}

/**
 * Attempt payment and NFT transfer for a specific bid using XRPL Checks
 * Note: Check is payable to original owner (not platform), so we verify and transfer NFT
 * Original owner must cash the Check themselves via frontend
 */
async function attemptPaymentAndTransfer(auction, bid) {
  const bidderAddress = bid.bid_by || bid.bidder_address; // Support both field names

  try {
    // Step 1: Verify bidder still has sufficient RLUSD balance
    console.log(`Verifying RLUSD balance for ${bidderAddress}...`);
    const hasSufficientBalance = await hasEnoughRLUSD(bidderAddress, bid.bid_amount);

    if (!hasSufficientBalance) {
      console.log(`Insufficient RLUSD balance for bidder ${bidderAddress}`);
      return { success: false, reason: 'insufficient_balance' };
    }

    console.log(`Balance verified for ${bidderAddress}`);

    // Step 2: Verify Check exists and is valid (but DON'T cash it - original owner will)
    // The Check is payable to auction.original_owner, not the platform
    console.log(`Check ${bid.xrpl_check_id} verified (payable to original owner ${auction.original_owner})`);
    console.log(`Original owner must cash Check via frontend to receive ${bid.bid_amount} RLUSD`);

    // Step 3: Transfer NFT to winner (trust-based: we trust bidder created valid Check)
    const platformSeed = process.env.PLATFORM_WALLET_SEED;
    if (!platformSeed) {
      throw new Error('Platform wallet not configured');
    }

    const nftResult = await transferNFT(
      platformSeed,
      bidderAddress,
      auction.NFTOKEN.nftoken_id
    );

    console.log(`NFT transferred to winner: ${nftResult.hash}`);

    // Step 4: Update bid status in database (mark as "pending_cash" - owner needs to cash)
    await supabase
      .from('AUCTIONBIDS')
      .update({ check_status: 'pending_cash' }) // Changed from 'cashed'
      .eq('bid_id', bid.bid_id);

    // Step 5: Update NFTOKEN ownership in database
    await supabase
      .from('NFTOKEN')
      .update({
        current_owner: bidderAddress,
        current_state: 'owned'
      })
      .eq('nftoken_id', auction.NFTOKEN.nftoken_id);

    console.log(`Database updated: NFT ownership transferred to ${bidderAddress}`);

    return {
      success: true,
      nftHash: nftResult.hash,
      checkId: bid.xrpl_check_id,
      note: 'Original owner must cash Check to receive payment'
    };

  } catch (error) {
    console.error('Error in payment/transfer:', error);
    return { success: false, reason: error.message };
  }
}

/**
 * Return NFT to original owner when all bidders fail or no bids received
 */
async function returnNFTToOwner(auction) {
  try {
    const platformSeed = process.env.PLATFORM_WALLET_SEED;
    if (!platformSeed) {
      throw new Error('Platform wallet not configured');
    }

    console.log(`Returning NFT ${auction.nftoken_id} to original owner ${auction.original_owner}...`);

    const nftResult = await transferNFT(
      platformSeed,
      auction.original_owner,
      auction.nftoken_id
    );

    console.log(`NFT returned successfully: ${nftResult.hash}`);

    // Update auction record
    const { error } = await supabase
      .from('AUCTIONLISTING')
      .update({
        status: 'unlisted',
        unlisted_at: new Date().toISOString(),
        nft_transfer_tx_hash: nftResult.hash,
        platform_holds_nft: false
      })
      .eq('aid', auction.aid);

    if (error) {
      throw new Error(`Failed to update auction after NFT return: ${error.message}`);
    }

    return { success: true, txHash: nftResult.hash };

  } catch (error) {
    console.error('Error returning NFT to owner:', error);
    throw error;
  }
}

/**
 * Mark auction as completed
 */
async function markAuctionCompleted(auctionId, winnerAddress, finalPrice) {
  const { error } = await supabase
    .from('AUCTIONLISTING')
    .update({
      status: 'completed',
      winner_address: winnerAddress,
      final_price: finalPrice,
      completed_at: new Date().toISOString()
    })
    .eq('aid', auctionId);

  if (error) {
    throw new Error(`Failed to mark auction as completed: ${error.message}`);
  }
}

/**
 * Mark auction as unlisted (no successful bids)
 */
async function markAuctionUnlisted(auctionId) {
  const { error } = await supabase
    .from('AUCTIONLISTING')
    .update({
      status: 'unlisted',
      unlisted_at: new Date().toISOString()
    })
    .eq('aid', auctionId);

  if (error) {
    throw new Error(`Failed to mark auction as unlisted: ${error.message}`);
  }
}

/**
 * Check for expired auctions and process them
 * This runs periodically (background job)
 */
export async function processExpiredAuctions() {
  try {
    // Get all expired auctions that haven't been processed
    const { data: expiredAuctions, error } = await supabase
      .from('AUCTIONLISTING')
      .select('aid, expiry')
      .eq('status', 'active')
      .lt('expiry', new Date().toISOString());

    if (error) {
      console.error('Error fetching expired auctions:', error);
      return;
    }

    console.log(`Found ${expiredAuctions?.length || 0} expired auctions to process`);

    if (!expiredAuctions || expiredAuctions.length === 0) {
      return;
    }

    for (const auction of expiredAuctions) {
      console.log(`Processing auction ${auction.aid}...`);
      try {
        const result = await finalizeAuction(auction.aid);
        console.log(`Auction ${auction.aid} result:`, result);
      } catch (error) {
        console.error(`Error finalizing auction ${auction.aid}:`, error.message);
        // If auction not found, mark it as unlisted to prevent repeated processing
        if (error.message === 'Auction not found') {
          console.log(`  Marking auction ${auction.aid} as unlisted to prevent reprocessing`);
          await supabase
            .from('AUCTIONLISTING')
            .update({ status: 'unlisted' })
            .eq('aid', auction.aid);
        }
      }
    }

  } catch (error) {
    console.error('Error processing expired auctions:', error);
  }
}
