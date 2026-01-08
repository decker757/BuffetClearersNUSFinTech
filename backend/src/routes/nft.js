import express from 'express';
import { mintInvoiceNFT, getNFTDetails, verifyNFTOwnership } from '../controllers/nftController.js';
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
 * POST /nft/verify-ownership
 * Verify NFT ownership transfer and update state to 'owned'
 * Protected route - requires authentication
 */
router.post('/verify-ownership', authenticateToken, verifyNFTOwnership);

/**
 * GET /nft/:nftokenId
 * Get details of a specific NFT
 * Protected route - requires authentication
 */
router.get('/:nftokenId', authenticateToken, getNFTDetails);

export default router;
