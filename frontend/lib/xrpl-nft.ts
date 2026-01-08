import * as xrpl from 'xrpl';

const XRPL_NETWORK = 'wss://s.altnet.rippletest.net:51233';

/**
 * Find sell offers for a specific NFT
 */
export async function findNFTSellOffers(nftokenId: string): Promise<any[]> {
  const client = new xrpl.Client(XRPL_NETWORK);

  try {
    await client.connect();
    console.log('📡 Requesting sell offers for NFT:', nftokenId);

    const response = await client.request({
      command: 'nft_sell_offers',
      nft_id: nftokenId,
    });

    console.log('📋 XRPL Response:', response);

    const offers = response.result.offers || [];
    console.log(`✅ Found ${offers.length} sell offer(s)`);

    return offers;
  } catch (error: any) {
    console.error('❌ Error finding NFT sell offers:', error);
    console.error('   Error code:', error?.data?.error);
    console.error('   Error message:', error?.data?.error_message);
    console.error('   Full error:', JSON.stringify(error, null, 2));
    throw new Error(error?.data?.error_message || error?.message || 'Failed to find NFT sell offers');
  } finally {
    await client.disconnect();
  }
}

/**
 * Accept an NFT sell offer
 * User must provide their wallet seed to sign the transaction
 */
export async function acceptNFTOffer(params: {
  nftokenId: string;
  offerIndex: string;
  walletSeed: string;
}): Promise<{
  success: boolean;
  txHash?: string;
  error?: string;
}> {
  const client = new xrpl.Client(XRPL_NETWORK);

  try {
    await client.connect();
    console.log('🔗 Connected to XRPL');

    // Create wallet from seed
    const wallet = xrpl.Wallet.fromSeed(params.walletSeed);
    console.log('👛 Wallet address:', wallet.address);

    // Create NFTokenAcceptOffer transaction
    const acceptOfferTx: xrpl.NFTokenAcceptOffer = {
      TransactionType: 'NFTokenAcceptOffer',
      Account: wallet.address,
      NFTokenSellOffer: params.offerIndex,
    };

    console.log('📝 Submitting NFTokenAcceptOffer transaction...');

    // Submit and wait for validation
    const result = await client.submitAndWait(acceptOfferTx, { wallet });

    console.log('✅ Transaction validated:', result.result.hash);

    // Check if transaction was successful
    if (result.result.meta && typeof result.result.meta === 'object') {
      const meta = result.result.meta as any;
      if (meta.TransactionResult === 'tesSUCCESS') {
        return {
          success: true,
          txHash: result.result.hash,
        };
      }
    }

    return {
      success: false,
      error: 'Transaction failed to execute successfully',
    };

  } catch (error) {
    console.error('❌ Error accepting NFT offer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  } finally {
    await client.disconnect();
  }
}

/**
 * Get NFT ownership information
 */
export async function getNFTOwner(nftokenId: string, ownerAddress: string): Promise<boolean> {
  const client = new xrpl.Client(XRPL_NETWORK);

  try {
    await client.connect();

    const response = await client.request({
      command: 'account_nfts',
      account: ownerAddress,
    });

    const nfts = response.result.account_nfts || [];
    return nfts.some((nft: any) => nft.NFTokenID === nftokenId);

  } catch (error) {
    console.error('Error checking NFT ownership:', error);
    return false;
  } finally {
    await client.disconnect();
  }
}

/**
 * Create a sell offer to transfer NFT to platform wallet
 * User must provide their wallet seed to sign the transaction
 */
export async function createSellOfferToPlatform(params: {
  nftokenId: string;
  walletSeed: string;
  platformAddress: string;
}): Promise<{
  success: boolean;
  offerIndex?: string;
  txHash?: string;
  error?: string;
}> {
  const client = new xrpl.Client(XRPL_NETWORK);

  try {
    await client.connect();
    console.log('🔗 Connected to XRPL');

    // Create wallet from seed
    const wallet = xrpl.Wallet.fromSeed(params.walletSeed);
    console.log('👛 Wallet address:', wallet.address);

    // Create NFTokenCreateOffer transaction (sell offer to platform for 0 XRP)
    const createOfferTx: xrpl.NFTokenCreateOffer = {
      TransactionType: 'NFTokenCreateOffer',
      Account: wallet.address,
      NFTokenID: params.nftokenId,
      Amount: '0', // Platform takes custody for free
      Destination: params.platformAddress, // Only platform can accept this offer
      Flags: 1, // tfSellNFToken flag
    };

    console.log('📝 Creating sell offer to platform...');
    console.log('  Platform destination:', params.platformAddress);

    // Submit and wait for validation
    const result = await client.submitAndWait(createOfferTx, { wallet });

    console.log('✅ Transaction validated:', result.result.hash);

    // Extract offer index from transaction metadata
    let offerIndex: string | undefined;

    if (result.result.meta && typeof result.result.meta === 'object') {
      const meta = result.result.meta as any;

      // Check transaction success
      if (meta.TransactionResult !== 'tesSUCCESS') {
        throw new Error(`Transaction failed: ${meta.TransactionResult}`);
      }

      // Find the created offer in AffectedNodes
      if (meta.AffectedNodes) {
        for (const node of meta.AffectedNodes) {
          if (node.CreatedNode && node.CreatedNode.LedgerEntryType === 'NFTokenOffer') {
            offerIndex = node.CreatedNode.LedgerIndex;
            break;
          }
        }
      }
    }

    if (!offerIndex) {
      throw new Error('Could not extract offer index from transaction result');
    }

    console.log('✅ Sell offer created! Offer Index:', offerIndex);

    return {
      success: true,
      offerIndex,
      txHash: result.result.hash,
    };

  } catch (error) {
    console.error('❌ Error creating sell offer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  } finally {
    await client.disconnect();
  }
}
