import express from 'express';
import { mintInvoiceNFT, getNFTDetails, verifyNFTOwnership, listNFTOnAuction } from '../controllers/nftController.js';
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
 * POST /nft/list-on-auction
 * List an owned NFT on auction by transferring to platform wallet
 * Protected route - requires authentication
 */
router.post('/list-on-auction', authenticateToken, listNFTOnAuction);

/**
 * GET /nft/:nftokenId
 * Get details of a specific NFT
 * Protected route - requires authentication
 */
router.get('/:nftokenId', authenticateToken, getNFTDetails);

export default router;
