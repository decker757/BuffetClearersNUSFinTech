import { supabase } from '../config/supabase.js';
import { bakeryWallet, investorWallet, hotelWallet, platformWallet } from '../config/wallets.js';
import { generateUniqueInvoiceImage } from '../services/imageService.js';
import { generateMetadataJSON, validateMetadata } from '../services/metadataService.js';
import { uploadImageToStorage, uploadMetadataToStorage, downloadImageAsBuffer } from '../services/storageService.js';
import { mintAndTransferNFT } from '../services/nftMintingService.js';
import { deriveAddress } from 'ripple-keypairs';
import { connectXRPL } from '../config/xrplClient.js';

/**
 * Complete flow: Mint NFT with image generation and metadata
 *
 * Steps:
 * 1. Invoice created in app (from request body)
 * 2. Save invoice data to DB
 * 3. Generate unique image (OpenAI)
 * 4. Upload image → get image_link
 * 5. Generate metadata JSON
 * 6. Upload JSON → get metadata_uri
 * 7. Mint NFT on XRPL using metadata_uri
 * 8. Save NFTokenID back to DB
 */
export async function mintInvoiceNFT(req, res) {
  try {
    const {
      invoiceNumber,
      faceValue,
      maturityDate,
      creditorPublicKey,
      debtorPublicKey // The establishment creating the invoice (who owes money)
    } = req.body;

    // Validation
    if (!invoiceNumber || !faceValue || !maturityDate || !creditorPublicKey || !debtorPublicKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['invoiceNumber', 'faceValue', 'maturityDate', 'creditorPublicKey', 'debtorPublicKey']
      });
    }

    console.log(`\n=== Starting NFT Minting Process ===`);
    console.log(`Invoice: ${invoiceNumber}`);
    console.log(`Face Value: $${faceValue}`);
    console.log(`Maturity: ${maturityDate}`);
    console.log(`Debtor: ${debtorPublicKey.slice(0, 10)}...`);
    console.log(`Creditor: ${creditorPublicKey.slice(0, 10)}...`);

    // Convert public keys to wallet addresses (if not already addresses)
    // Addresses start with 'r', public keys start with 'ED'
    const debtorAddress = debtorPublicKey.startsWith('r') ? debtorPublicKey : deriveAddress(debtorPublicKey);
    const creditorAddress = creditorPublicKey.startsWith('r') ? creditorPublicKey : deriveAddress(creditorPublicKey);
    console.log(`Debtor Address: ${debtorAddress}`);
    console.log(`Creditor Address: ${creditorAddress}`);

    // Step 1 & 2: Generate temporary NFT ID and save initial invoice data to DB
    console.log('\n[Step 1-2] Creating invoice record in database...');
    const tempNftId = `NFT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const { data: nftRecord, error: dbError } = await supabase
      .from('NFTOKEN')
      .insert([{
        nftoken_id: tempNftId, // Temporary, will update with real NFTokenID later
        created_by: debtorAddress, // ✅ Store ADDRESS not public key
        invoice_number: invoiceNumber,
        face_value: faceValue,
        image_link: null, // Will update after image upload
        maturity_date: maturityDate,
        current_owner: creditorAddress, // ✅ Store ADDRESS not public key
        current_state: 'minting' // Temporary state during minting process
      }])
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('✓ Invoice record created with temp ID:', tempNftId);

    try {
      // Step 3: Generate unique image using OpenAI
      console.log('\n[Step 3] Generating unique image with OpenAI...');
      const imageUrl = await generateUniqueInvoiceImage({
        invoiceNumber,
        faceValue,
        maturityDate
      });
      console.log('✓ Image generated:', imageUrl);

      // Step 4: Download and upload image to Supabase Storage
      console.log('\n[Step 4] Uploading image to Supabase Storage...');
      const imageBuffer = await downloadImageAsBuffer(imageUrl);
      const imageFileName = `${invoiceNumber}-${Date.now()}.png`;
      const imageLink = await uploadImageToStorage(imageBuffer, imageFileName);
      console.log('✓ Image uploaded:', imageLink);

      // Update database with image link
      await supabase
        .from('NFTOKEN')
        .update({ image_link: imageLink })
        .eq('nftoken_id', tempNftId);

      // Step 5: Generate metadata JSON
      console.log('\n[Step 5] Generating metadata JSON...');
      const metadata = generateMetadataJSON({
        invoiceNumber,
        faceValue,
        maturityDate,
        imageUrl: imageLink,
        originalOwner: debtorAddress, // ✅ Use address not public key
        creditorPublicKey: creditorAddress // ✅ Use address not public key
      });

      validateMetadata(metadata);
      console.log('✓ Metadata generated and validated');

      // Step 6: Upload metadata JSON to storage
      console.log('\n[Step 6] Uploading metadata to Supabase Storage...');
      const metadataFileName = `${invoiceNumber}-${Date.now()}.json`;
      const metadataUri = await uploadMetadataToStorage(metadata, metadataFileName);
      console.log('✓ Metadata uploaded:', metadataUri);

      // Step 7: Mint NFT on XRPL and create transfer offer
      console.log('\n[Step 7] Minting NFT on XRPL...');
      console.log('  Creditor Address:', creditorAddress);
      console.log('  Platform Address:', platformWallet.address);

      const mintResult = await mintAndTransferNFT({
        metadataUri,
        recipientAddress: creditorAddress, // Use derived address, not public key
        issuerWallet: platformWallet,
        transferFee: 0 // No transfer fee
      });

      console.log('✓ NFT minted successfully!');
      console.log('  NFTokenID:', mintResult.nftokenId);
      console.log('  Mint Tx:', mintResult.mintTxHash);
      console.log('  Offer Tx:', mintResult.offerTxHash);

      // Step 8: Update database with real NFTokenID
      console.log('\n[Step 8] Updating database with NFTokenID...');
      const { data: updatedNft, error: updateError } = await supabase
        .from('NFTOKEN')
        .update({
          nftoken_id: mintResult.nftokenId, // Real NFTokenID from XRPL
          current_state: 'issued' // NFT successfully issued
        })
        .eq('nftoken_id', tempNftId)
        .select()
        .single();

      if (updateError) {
        console.error('Warning: Failed to update NFTokenID in database:', updateError);
        // Don't fail the whole process since NFT is already minted
      } else {
        console.log('✓ Database updated with NFTokenID');
      }

      console.log('\n=== NFT Minting Complete! ===\n');

      // Return success response
      return res.status(200).json({
        success: true,
        message: 'Invoice NFT minted and transferred successfully',
        data: {
          nftokenId: mintResult.nftokenId,
          invoiceNumber,
          faceValue,
          maturityDate,
          imageLink,
          metadataUri,
          issuer: mintResult.issuer,
          recipient: mintResult.recipient,
          mintTxHash: mintResult.mintTxHash,
          offerIndex: mintResult.offerIndex,
          offerTxHash: mintResult.offerTxHash
        }
      });

    } catch (mintError) {
      // If anything fails after DB insert, update state to 'failed'
      await supabase
        .from('NFTOKEN')
        .update({ current_state: 'failed' })
        .eq('nftoken_id', tempNftId);

      throw mintError;
    }

  } catch (error) {
    console.error('\n❌ NFT Minting Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to mint NFT',
      message: error.message,
      details: error.stack
    });
  }
}

/**
 * Get NFT details by NFTokenID
 */
export async function getNFTDetails(req, res) {
  try {
    const { nftokenId } = req.params;

    const { data, error } = await supabase
      .from('NFTOKEN')
      .select('*')
      .eq('nftoken_id', nftokenId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'NFT not found' });
      }
      throw error;
    }

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Get NFT details error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch NFT details',
      message: error.message
    });
  }
}

/**
 * Verify NFT ownership transfer and update state to 'owned'
 * Called by creditor after accepting the NFT offer on-chain
 */
export async function verifyNFTOwnership(req, res) {
  try {
    const { nftokenId, txHash } = req.body;
    const userAddress = req.user.address;

    console.log('\n🔍 Verifying NFT ownership...');
    console.log('  NFToken ID:', nftokenId);
    console.log('  TX Hash:', txHash);
    console.log('  User Address:', userAddress);

    // Validate inputs
    if (!nftokenId || !txHash) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: nftokenId, txHash'
      });
    }

    // Get NFT from database
    const { data: nft, error: fetchError } = await supabase
      .from('NFTOKEN')
      .select('*')
      .eq('nftoken_id', nftokenId)
      .single();

    if (fetchError || !nft) {
      return res.status(404).json({
        success: false,
        error: 'NFT not found in database'
      });
    }

    // Verify that the user is the current owner
    console.log('  🔍 Ownership check:');
    console.log('    NFT current_owner:', nft.current_owner);
    console.log('    User address:     ', userAddress);
    console.log('    Match:', nft.current_owner === userAddress);

    if (nft.current_owner !== userAddress) {
      return res.status(403).json({
        success: false,
        error: 'You are not the owner of this NFT',
        debug: {
          nftOwner: nft.current_owner,
          yourAddress: userAddress
        }
      });
    }

    // Verify NFT state is 'issued' (pending acceptance)
    if (nft.current_state !== 'issued') {
      return res.status(400).json({
        success: false,
        error: `NFT is in state '${nft.current_state}', expected 'issued'`
      });
    }

    // Verify ownership on-chain
    console.log('  Verifying on-chain ownership...');
    const client = await connectXRPL();

    const response = await client.request({
      command: 'account_nfts',
      account: userAddress
    });

    const nfts = response.result.account_nfts || [];
    const ownsNFT = nfts.some((nft) => nft.NFTokenID === nftokenId);

    if (!ownsNFT) {
      return res.status(400).json({
        success: false,
        error: 'NFT ownership not confirmed on-chain. Please try again after transaction is validated.'
      });
    }

    console.log('  ✅ On-chain ownership verified!');

    // Update NFT state to 'owned'
    const { error: updateError } = await supabase
      .from('NFTOKEN')
      .update({
        current_state: 'owned'
      })
      .eq('nftoken_id', nftokenId);

    if (updateError) {
      throw updateError;
    }

    console.log('  ✅ NFT state updated to "owned"');

    return res.status(200).json({
      success: true,
      message: 'NFT ownership verified and state updated to "owned"',
      data: {
        nftokenId,
        newState: 'owned',
        txHash
      }
    });

  } catch (error) {
    console.error('\n❌ Verify ownership error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify NFT ownership',
      message: error.message
    });
  }
}

/**
 * List NFT on auction by transferring custody to platform
 *
 * Flow:
 * 1. User creates NFTokenCreateOffer (sell to platform for 0 XRP) on frontend
 * 2. User sends offerIndex to this endpoint
 * 3. Platform automatically accepts the offer
 * 4. NFT transfers from user → platform wallet
 * 5. Update database: state 'owned' → 'listed', owner → platform
 * 6. Create auction listing record
 */
export async function listNFTOnAuction(req, res) {
  try {
    const { nftokenId, offerIndex, minBid, expiry } = req.body;
    const userAddress = req.user.address;

    console.log('\n🎯 Starting List NFT on Auction Process');
    console.log('  NFToken ID:', nftokenId);
    console.log('  Offer Index:', offerIndex);
    console.log('  Min Bid:', minBid);
    console.log('  Expiry:', expiry);
    console.log('  User Address:', userAddress);

    // Validate inputs
    if (!nftokenId || !offerIndex || !minBid || !expiry) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: nftokenId, offerIndex, minBid, expiry'
      });
    }

    // Step 1: Get NFT from database and verify ownership
    console.log('\n[Step 1] Verifying NFT ownership in database...');
    const { data: nft, error: fetchError } = await supabase
      .from('NFTOKEN')
      .select('*')
      .eq('nftoken_id', nftokenId)
      .single();

    if (fetchError || !nft) {
      return res.status(404).json({
        success: false,
        error: 'NFT not found in database'
      });
    }

    // Verify user is the current owner
    if (nft.current_owner !== userAddress) {
      return res.status(403).json({
        success: false,
        error: 'You are not the owner of this NFT',
        debug: {
          nftOwner: nft.current_owner,
          yourAddress: userAddress
        }
      });
    }

    // Verify NFT state is 'owned'
    if (nft.current_state !== 'owned') {
      return res.status(400).json({
        success: false,
        error: `NFT is in state '${nft.current_state}', expected 'owned'. You can only list NFTs that you own.`
      });
    }

    console.log('✓ NFT ownership verified in database');

    // Step 2: Verify NFT is in user's wallet on-chain
    console.log('\n[Step 2] Verifying on-chain ownership...');
    const client = await connectXRPL();

    const userNFTsResponse = await client.request({
      command: 'account_nfts',
      account: userAddress
    });

    const userNFTs = userNFTsResponse.result.account_nfts || [];
    const ownsNFT = userNFTs.some((nft) => nft.NFTokenID === nftokenId);

    if (!ownsNFT) {
      return res.status(400).json({
        success: false,
        error: 'NFT not found in your wallet on-chain. Please accept the NFT first.'
      });
    }

    console.log('✓ On-chain ownership verified');

    // Step 3: Platform wallet accepts the sell offer
    console.log('\n[Step 3] Platform accepting NFT offer...');
    console.log('  Platform Address:', platformWallet.address);

    const acceptOfferTx = {
      TransactionType: 'NFTokenAcceptOffer',
      Account: platformWallet.address,
      NFTokenSellOffer: offerIndex,
    };

    console.log('  Submitting NFTokenAcceptOffer transaction...');
    const result = await client.submitAndWait(acceptOfferTx, { wallet: platformWallet });

    console.log('✓ Transaction validated:', result.result.hash);

    // Check if transaction was successful
    if (result.result.meta && typeof result.result.meta === 'object') {
      const meta = result.result.meta;
      if (meta.TransactionResult !== 'tesSUCCESS') {
        throw new Error(`Transaction failed with result: ${meta.TransactionResult}`);
      }
    }

    const acceptTxHash = result.result.hash;
    console.log('✓ NFT offer accepted! TX Hash:', acceptTxHash);

    // Step 4: Verify NFT is now in platform wallet
    console.log('\n[Step 4] Verifying NFT transferred to platform...');
    const platformNFTsResponse = await client.request({
      command: 'account_nfts',
      account: platformWallet.address
    });

    const platformNFTs = platformNFTsResponse.result.account_nfts || [];
    const platformOwnsNFT = platformNFTs.some((nft) => nft.NFTokenID === nftokenId);

    if (!platformOwnsNFT) {
      // This shouldn't happen if transaction succeeded, but check anyway
      throw new Error('NFT not found in platform wallet after accepting offer. Transaction may need more time to validate.');
    }

    console.log('✓ NFT successfully transferred to platform wallet');

    // Step 5: Update NFT state in database
    console.log('\n[Step 5] Updating NFT state in database...');
    const { error: updateNFTError } = await supabase
      .from('NFTOKEN')
      .update({
        current_state: 'listed',
        current_owner: platformWallet.address // Platform now owns it
      })
      .eq('nftoken_id', nftokenId);

    if (updateNFTError) {
      throw new Error(`Failed to update NFT state: ${updateNFTError.message}`);
    }

    console.log('✓ NFT state updated to "listed"');

    // Step 6: Create auction listing record
    console.log('\n[Step 6] Creating auction listing...');
    const { data: auction, error: auctionError } = await supabase
      .from('AUCTIONLISTING')
      .insert([{
        nftoken_id: nftokenId,
        face_value: nft.face_value,
        expiry: expiry,
        min_bid: minBid,
        current_bid: minBid,
        original_owner: userAddress, // Track who listed this NFT
        platform_holds_nft: true,
        status: 'active'
      }])
      .select()
      .single();

    if (auctionError) {
      throw new Error(`Failed to create auction listing: ${auctionError.message}`);
    }

    console.log('✓ Auction listing created with ID:', auction.aid);

    console.log('\n=== NFT Listed on Auction Successfully! ===\n');

    return res.status(200).json({
      success: true,
      message: 'NFT successfully listed on auction',
      data: {
        nftokenId,
        auctionId: auction.aid,
        minBid,
        expiry,
        acceptTxHash,
        platformAddress: platformWallet.address
      }
    });

  } catch (error) {
    console.error('\n❌ List NFT on auction error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to list NFT on auction',
      message: error.message,
      details: error.stack
    });
  }
}
