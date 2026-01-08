import express from 'express';
import {
  forceEndAuction,
  forceNFTMaturity,
  forceCompleteFlow,
  getTestInstructions
} from '../controllers/testController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Test Helper Routes
 * ⚠️ FOR DEVELOPMENT/TESTING ONLY
 *
 * These endpoints let you test time-dependent flows without waiting
 */

// Get instructions
router.get('/test', getTestInstructions);

/**
 * POST /test/auctions/:auctionId/force-end
 * Force an auction to end immediately
 */
router.post('/test/auctions/:auctionId/force-end', authenticateToken, forceEndAuction);

/**
 * POST /test/nft/:nftokenId/force-maturity
 * Force an NFT to reach maturity immediately
 */
router.post('/test/nft/:nftokenId/force-maturity', authenticateToken, forceNFTMaturity);

/**
 * POST /test/auctions/:auctionId/complete-flow
 * Force auction end AND NFT maturity in one call (complete test flow)
 */
router.post('/test/auctions/:auctionId/complete-flow', authenticateToken, forceCompleteFlow);

export default router;
