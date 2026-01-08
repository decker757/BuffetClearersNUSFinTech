import express from 'express';
import { mintInvoiceNFT, getNFTDetails } from '../controllers/nftController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /nft/mint
 * Mint a new invoice NFT with image generation and metadata
 * Protected route - requires authentication
 */
router.post('/mint', (req, res, next) => {
  console.log('\n🔵 NFT MINT REQUEST RECEIVED');
  console.log('Body:', req.body);
  console.log('Headers:', req.headers);
  next();
}, authenticateToken, mintInvoiceNFT);

/**
 * GET /nft/:nftokenId
 * Get details of a specific NFT
 * Protected route - requires authentication
 */
router.get('/:nftokenId', authenticateToken, getNFTDetails);

export default router;
