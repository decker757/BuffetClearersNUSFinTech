import { supabase } from '../config/supabase.js';
import { finalizeAuction } from '../services/auctionFinalizationService.js';
import { processMaturedNFTs } from '../services/maturityPaymentService.js';

/**
 * Test Controller
 * Helper endpoints for testing auction and maturity payment flows
 * WITHOUT waiting for real time to pass
 *
 * ⚠️ ONLY USE IN DEVELOPMENT/TESTING - NOT FOR PRODUCTION
 */

/**
 * Force end an auction immediately
 * Sets expiry to past and processes the auction
 */
export const forceEndAuction = async (req, res) => {
  try {
    const { auctionId } = req.params;

    // Step 1: Update expiry to past (1 hour ago)
    const { error: updateError } = await supabase
      .from('AUCTIONLISTING')
      .update({
        expiry: new Date(Date.now() - 3600000).toISOString()
      })
      .eq('aid', auctionId);

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: `Failed to update auction expiry: ${updateError.message}`
      });
    }

    console.log(`✅ Updated auction ${auctionId} expiry to past`);

    // Step 2: Process the auction
    const result = await finalizeAuction(auctionId);

    res.json({
      success: true,
      message: 'Auction forced to end',
      auction_id: auctionId,
      finalization_result: result
    });

  } catch (error) {
    console.error('Error forcing auction end:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Force NFT to reach maturity immediately
 * Sets maturity_date to past and processes maturity payments
 */
export const forceNFTMaturity = async (req, res) => {
  try {
    const { nftokenId } = req.params;

    // Step 1: Get NFT info
    const { data: nft, error: nftError } = await supabase
      .from('NFTOKEN')
      .select('*')
      .eq('nftoken_id', nftokenId)
      .single();

    if (nftError || !nft) {
      return res.status(404).json({
        success: false,
        error: 'NFT not found'
      });
    }

    // Step 2: Update maturity_date to past (1 day ago)
    const { error: updateError } = await supabase
      .from('NFTOKEN')
      .update({
        maturity_date: new Date(Date.now() - 86400000).toISOString()
      })
      .eq('nftoken_id', nftokenId);

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: `Failed to update NFT maturity: ${updateError.message}`
      });
    }

    console.log(`✅ Updated NFT ${nftokenId} maturity to past`);

    // Step 3: Process matured NFTs
    const result = await processMaturedNFTs();

    res.json({
      success: true,
      message: 'NFT forced to maturity',
      nftoken_id: nftokenId,
      original_state: nft.current_state,
      maturity_result: result
    });

  } catch (error) {
    console.error('Error forcing NFT maturity:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Complete end-to-end test scenario
 * Forces auction to end AND NFT to mature in one call
 */
export const forceCompleteFlow = async (req, res) => {
  try {
    const { auctionId } = req.params;

    // Step 1: Get auction info
    const { data: auction, error: auctionError } = await supabase
      .from('AUCTIONLISTING')
      .select(`
        *,
        NFTOKEN(*)
      `)
      .eq('aid', auctionId)
      .single();

    if (auctionError || !auction) {
      return res.status(404).json({
        success: false,
        error: 'Auction not found'
      });
    }

    const nftokenId = auction.nftoken_id;

    console.log(`🚀 Starting complete test flow for auction ${auctionId}`);

    // Step 2: Force auction to end
    const { error: auctionUpdateError } = await supabase
      .from('AUCTIONLISTING')
      .update({
        expiry: new Date(Date.now() - 3600000).toISOString()
      })
      .eq('aid', auctionId);

    if (auctionUpdateError) {
      return res.status(500).json({
        success: false,
        error: `Failed to update auction: ${auctionUpdateError.message}`
      });
    }

    console.log(`✅ Step 1: Auction expiry set to past`);

    // Step 3: Finalize auction
    const auctionResult = await finalizeAuction(auctionId);
    console.log(`✅ Step 2: Auction finalized`, auctionResult);

    // Step 4: Force NFT to maturity (if auction succeeded)
    let maturityResult = null;
    if (auctionResult.success && nftokenId) {
      const { error: nftUpdateError } = await supabase
        .from('NFTOKEN')
        .update({
          maturity_date: new Date(Date.now() - 86400000).toISOString()
        })
        .eq('nftoken_id', nftokenId);

      if (!nftUpdateError) {
        console.log(`✅ Step 3: NFT maturity set to past`);
        maturityResult = await processMaturedNFTs();
        console.log(`✅ Step 4: Maturity payments processed`, maturityResult);
      }
    }

    res.json({
      success: true,
      message: 'Complete flow executed',
      steps: {
        '1_auction_end': auctionResult,
        '2_maturity_payment': maturityResult
      },
      next_steps: [
        '1. Check establishment dashboard - should see payment in "Payments Due"',
        '2. Create payment Check as establishment',
        '3. Check investor dashboard - should see Check in "Collect Payments"',
        '4. Cash Check as investor to complete flow'
      ]
    });

  } catch (error) {
    console.error('Error in complete flow:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get test instructions
 */
export const getTestInstructions = async (req, res) => {
  res.json({
    message: 'Test Helper Endpoints',
    description: 'These endpoints help you test auction and maturity payment flows without waiting for real time',
    endpoints: [
      {
        method: 'POST',
        path: '/test/auctions/:auctionId/force-end',
        description: 'Force an auction to end immediately',
        example: 'POST /test/auctions/123/force-end'
      },
      {
        method: 'POST',
        path: '/test/nft/:nftokenId/force-maturity',
        description: 'Force an NFT to reach maturity',
        example: 'POST /test/nft/ABC123.../force-maturity'
      },
      {
        method: 'POST',
        path: '/test/auctions/:auctionId/complete-flow',
        description: 'Force auction end AND NFT maturity in one call',
        example: 'POST /test/auctions/123/complete-flow'
      }
    ],
    workflow: {
      '1': 'Create auction with any expiry date (doesn\'t matter)',
      '2': 'Place bid on the auction',
      '3': 'Call POST /test/auctions/:id/complete-flow',
      '4': 'Check establishment dashboard for "Payments Due"',
      '5': 'Create payment Check as establishment',
      '6': 'Check investor dashboard for "Collect Payments"',
      '7': 'Cash Check as investor'
    },
    warning: '⚠️ These are TEST endpoints only - do not use in production!'
  });
};
