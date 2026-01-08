import express from 'express';
import {
  createAuction,
  getActiveAuctions,
  getAuctionById,
  getAuctionBids,
  getUserBids,
  placeBid
} from '../controllers/auctionController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no auth required)
router.get('/auctions', getActiveAuctions);
router.get('/auctions/:id', getAuctionById);
router.get('/auctions/:id/bids', getAuctionBids);

// Protected routes (auth required)
router.post('/auctions', authenticateToken, createAuction);
router.post('/auctions/:id/bids', authenticateToken, placeBid);
router.get('/user/bids', authenticateToken, getUserBids);

export default router;