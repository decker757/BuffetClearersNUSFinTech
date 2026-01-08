import { supabase } from '../config/supabase.js';
import { bakeryWallet, investorWallet, hotelWallet } from '../config/wallets.js';
import { generateUniqueInvoiceImage } from '../services/imageService.js';
import { generateMetadataJSON, validateMetadata } from '../services/metadataService.js';
import { uploadImageToStorage, uploadMetadataToStorage, downloadImageAsBuffer } from '../services/storageService.js';
import { mintAndTransferNFT } from '../services/nftMintingService.js';
import { deriveAddress } from 'ripple-keypairs';

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

    // Step 1 & 2: Generate temporary NFT ID and save initial invoice data to DB
    console.log('\n[Step 1-2] Creating invoice record in database...');
    const tempNftId = `NFT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const { data: nftRecord, error: dbError } = await supabase
      .from('NFTOKEN')
      .insert([{
        nftoken_id: tempNftId, // Temporary, will update with real NFTokenID later
        created_by: debtorPublicKey,
        invoice_number: invoiceNumber,
        face_value: faceValue,
        image_link: null, // Will update after image upload
        maturity_date: maturityDate,
        current_owner: creditorPublicKey, // Creditor will receive the NFT
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
        originalOwner: debtorPublicKey,
        creditorPublicKey
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

      // Convert creditor's public key to XRPL address
      const creditorAddress = deriveAddress(creditorPublicKey);
      console.log('  Creditor Address:', creditorAddress);

      // Use platform wallet (e.g., bakeryWallet as platform wallet)
      // In production, you'd have a dedicated platform wallet
      const platformWallet = bakeryWallet;

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
