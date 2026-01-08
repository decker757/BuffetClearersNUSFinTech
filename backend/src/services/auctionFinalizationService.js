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
 * Returns: { success, status, message, details }
 */
export async function finalizeAuction(auctionId) {
  try {
    // Get auction with bids
    const { data: auction, error: auctionError } = await supabase
      .from('AUCTIONLISTING')
      .select(`
        *,
        NFTOKEN(*),
        AUCTIONBIDS(*)
      `)
      .eq('aid', auctionId)
      .single();

    if (auctionError || !auction) {
      throw new Error('Auction not found');
    }

    // Check if auction has expired
    if (new Date(auction.expiry) > new Date()) {
      return { success: false, status: 'not_expired', message: 'Auction has not expired yet' };
    }

    // Get sorted bids (highest first)
    const sortedBids = (auction.AUCTIONBIDS || [])
      .sort((a, b) => b.bid_amount - a.bid_amount);

    if (sortedBids.length === 0) {
      // No bids - return NFT to owner
      await returnNFTToOwner(auction);
      return {
        success: true,
        status: 'unlisted',
        message: 'No bids received, NFT returned to owner'
      };
    }

    // Try to process payment with each bidder until one succeeds
    for (let i = 0; i < sortedBids.length; i++) {
      const bid = sortedBids[i];
      const bidderAddress = bid.bid_by || bid.bidder_address; // Support both field names
      const result = await attemptPaymentAndTransfer(auction, bid);

      if (result.success) {
        // Payment successful!
        await markAuctionCompleted(auctionId, bidderAddress, bid.bid_amount);
        return {
          success: true,
          status: 'completed',
          message: 'Auction completed successfully',
          details: {
            winner: bidderAddress,
            amount: bid.bid_amount,
            txHash: result.paymentHash
          }
        };
      }

      // Payment failed, log and try next bidder
      console.log(`Payment failed for bidder ${bidderAddress}, trying next...`);

      // If this was the last bidder, return NFT to owner
      if (i === sortedBids.length - 1) {
        await returnNFTToOwner(auction);
        return {
          success: false,
          status: 'unlisted',
          message: 'All bidders failed payment, NFT returned to owner'
        };
      }
    }

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
 * Validates balance, cashes check, and transfers NFT
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

    // Step 2: Cash the Check (claim RLUSD payment)
    const establishmentSeed = process.env.ESTABLISHMENT_SEED;
    if (!establishmentSeed) {
      throw new Error('Establishment wallet not configured');
    }

    console.log(`Cashing Check ${bid.xrpl_check_id} from ${bidderAddress}...`);

    const cashResult = await cashCheck(
      establishmentSeed,
      bid.xrpl_check_id,
      bid.bid_amount
    );

    console.log(`Check cashed successfully: ${cashResult.hash}`);

    // Step 3: Transfer NFT to winner
    const nftResult = await transferNFT(
      establishmentSeed,
      bidderAddress,
      auction.NFTOKEN.nftoken_id
    );

    console.log(`NFT transferred to winner: ${nftResult.hash}`);

    // Step 4: Update bid status in database
    await supabase
      .from('AUCTIONBIDS')
      .update({ check_status: 'cashed' })
      .eq('bid_id', bid.bid_id);

    return {
      success: true,
      paymentHash: cashResult.hash,
      nftHash: nftResult.hash,
      checkId: bid.xrpl_check_id
    };

  } catch (error) {
    console.error('Error in payment/transfer:', error);

    // If check cashing failed, try to cancel the check
    if (bid.xrpl_check_id) {
      try {
        const establishmentSeed = process.env.ESTABLISHMENT_SEED;
        if (establishmentSeed) {
          console.log(`Attempting to cancel Check ${bid.xrpl_check_id}...`);
          await cancelCheck(establishmentSeed, bid.xrpl_check_id);
          console.log('Check cancelled successfully');
        }
      } catch (cancelError) {
        console.error('Failed to cancel Check:', cancelError);
      }
    }

    return { success: false, reason: error.message };
  }
}

/**
 * Return NFT to original owner when all bidders fail or no bids received
 */
async function returnNFTToOwner(auction) {
  try {
    const establishmentSeed = process.env.ESTABLISHMENT_SEED;
    if (!establishmentSeed) {
      throw new Error('Establishment wallet not configured');
    }

    console.log(`Returning NFT ${auction.nftoken_id} to original owner ${auction.original_owner}...`);

    const nftResult = await transferNFT(
      establishmentSeed,
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
      const result = await finalizeAuction(auction.aid);
      console.log(`Auction ${auction.aid} result:`, result);
    }

  } catch (error) {
    console.error('Error processing expired auctions:', error);
  }
}
