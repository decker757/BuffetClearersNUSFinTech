import express from 'express';
import {
  createAuction,
  getActiveAuctions,
  getAuctionById,
  getAuctionBids,
  getUserBids,
  getUserBidsHistory,
  getWonAuctions,
  placeBid,
  payAndClaimNFT,
  finalizeAuctionManually,
  processAllExpiredAuctions
} from '../controllers/auctionController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no auth required)
router.get('/auctions', getActiveAuctions);

// Protected routes (auth required) - must come before :id routes to avoid conflicts
router.get('/auctions/user/bids', authenticateToken, getUserBids);
router.get('/auctions/user/bids/history', authenticateToken, getUserBidsHistory);
router.get('/auctions/user/won', authenticateToken, getWonAuctions);
router.post('/auctions', authenticateToken, createAuction);

// Public and protected routes with :id parameter - must come after specific paths
router.get('/auctions/:id', getAuctionById);
router.get('/auctions/:id/bids', getAuctionBids);
router.post('/auctions/:id/bids', authenticateToken, placeBid);
router.post('/auctions/:id/pay', authenticateToken, payAndClaimNFT);

// Admin/testing routes for manual finalization
// In production, these should have additional admin authentication
router.post('/auctions/:id/finalize', authenticateToken, finalizeAuctionManually);
router.post('/auctions/process-expired', authenticateToken, processAllExpiredAuctions);

export default router;