import xrpl from 'xrpl';
import { connectXRPL } from '../config/xrplClient.js';

/**
 * Mint an NFT on XRPL and transfer to recipient
 * @param {Object} params - Minting parameters
 * @param {string} params.metadataUri - URI pointing to the metadata JSON
 * @param {string} params.recipientAddress - XRPL address of the recipient (creditor)
 * @param {Object} params.issuerWallet - XRPL wallet that will mint the NFT (platform wallet)
 * @param {number} params.transferFee - Transfer fee in basis points (0-50000, i.e., 0-50%)
 * @returns {Promise<Object>} - Contains nftokenId and transaction hash
 */
export async function mintAndTransferNFT(params) {
  const {
    metadataUri,
    recipientAddress,
    issuerWallet,
    transferFee = 0 // Default 0% transfer fee
  } = params;

  try {
    console.log('Connecting to XRPL...');

    // Ensure client is connected
    const client = await connectXRPL();

    // Step 1: Mint NFToken
    console.log('Minting NFToken...');
    const mintTx = {
      TransactionType: 'NFTokenMint',
      Account: issuerWallet.address,
      URI: xrpl.convertStringToHex(metadataUri), // Convert URI to hex
      Flags: 8, // tfTransferable flag - NFT can be transferred
      TransferFee: transferFee, // Transfer fee (0 = no fee)
      NFTokenTaxon: 0 // Taxon for categorization (0 is fine for our use case)
    };

    console.log('Preparing mint transaction:', mintTx);

    // Sign and submit the mint transaction
    const mintResult = await client.submitAndWait(mintTx, { wallet: issuerWallet });

    console.log('Mint transaction result:', mintResult);

    if (mintResult.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Mint transaction failed: ${mintResult.result.meta.TransactionResult}`);
    }

    // Extract NFTokenID from transaction metadata
    const nftokenId = extractNFTokenID(mintResult.result.meta);

    if (!nftokenId) {
      throw new Error('Failed to extract NFTokenID from mint transaction');
    }

    console.log('NFToken minted successfully. NFTokenID:', nftokenId);

    // Step 2: Create sell offer to transfer NFT to recipient for free (0 XRP)
    console.log(`Creating sell offer to transfer NFT to ${recipientAddress}...`);

    const sellOfferTx = {
      TransactionType: 'NFTokenCreateOffer',
      Account: issuerWallet.address,
      NFTokenID: nftokenId,
      Amount: '0', // 0 XRP - free transfer
      Destination: recipientAddress, // Only this address can accept
      Flags: 1 // tfSellNFToken
    };

    const offerResult = await client.submitAndWait(sellOfferTx, { wallet: issuerWallet });

    console.log('Sell offer result:', offerResult);

    if (offerResult.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Sell offer transaction failed: ${offerResult.result.meta.TransactionResult}`);
    }

    // Extract offer index
    const offerIndex = extractOfferIndex(offerResult.result.meta);

    console.log('Sell offer created successfully. Offer Index:', offerIndex);

    return {
      nftokenId,
      mintTxHash: mintResult.result.hash,
      offerIndex,
      offerTxHash: offerResult.result.hash,
      issuer: issuerWallet.address,
      recipient: recipientAddress,
      metadataUri
    };

  } catch (error) {
    console.error('NFT minting error:', error);
    throw new Error(`Failed to mint NFT: ${error.message}`);
  }
}

/**
 * Extract NFTokenID from transaction metadata
 * @param {Object} meta - Transaction metadata
 * @returns {string|null} - NFTokenID or null if not found
 */
function extractNFTokenID(meta) {
  try {
    if (meta.AffectedNodes) {
      for (const node of meta.AffectedNodes) {
        if (node.CreatedNode && node.CreatedNode.LedgerEntryType === 'NFTokenPage') {
          const nfTokens = node.CreatedNode.NewFields?.NFTokens ||
                          node.ModifiedNode?.FinalFields?.NFTokens;

          if (nfTokens && nfTokens.length > 0) {
            return nfTokens[0].NFToken.NFTokenID;
          }
        }

        if (node.ModifiedNode && node.ModifiedNode.LedgerEntryType === 'NFTokenPage') {
          const nfTokens = node.ModifiedNode.FinalFields?.NFTokens;
          const prevTokens = node.ModifiedNode.PreviousFields?.NFTokens || [];

          if (nfTokens && nfTokens.length > prevTokens.length) {
            // Find the new token
            const newToken = nfTokens.find(
              token => !prevTokens.some(prev => prev.NFToken.NFTokenID === token.NFToken.NFTokenID)
            );
            if (newToken) {
              return newToken.NFToken.NFTokenID;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error extracting NFTokenID:', error);
  }

  return null;
}

/**
 * Extract offer index from transaction metadata
 * @param {Object} meta - Transaction metadata
 * @returns {string|null} - Offer index or null if not found
 */
function extractOfferIndex(meta) {
  try {
    if (meta.AffectedNodes) {
      for (const node of meta.AffectedNodes) {
        if (node.CreatedNode && node.CreatedNode.LedgerEntryType === 'NFTokenOffer') {
          return node.CreatedNode.LedgerIndex;
        }
      }
    }
  } catch (error) {
    console.error('Error extracting offer index:', error);
  }

  return null;
}

/**
 * Get NFToken offers for a specific NFTokenID
 * @param {string} nftokenId - The NFTokenID
 * @returns {Promise<Array>} - Array of offers
 */
export async function getNFTOffers(nftokenId) {
  try {
    const client = await connectXRPL();

    const response = await client.request({
      command: 'nft_sell_offers',
      nft_id: nftokenId
    });

    return response.result.offers || [];
  } catch (error) {
    console.error('Error fetching NFT offers:', error);
    return [];
  }
}
