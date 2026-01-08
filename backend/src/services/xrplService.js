import { connectXRPL } from '../config/xrplClient.js';

// RLUSD Issuer (from .env - can be Hotel wallet for testing or Ripple issuer for production)
const RLUSD_ISSUER = process.env.RLUSD_ISSUER || 'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV';
// RLUSD as hex-encoded currency code (non-standard 3-char codes must be 40-char hex)
const RLUSD_CURRENCY = '524C555344000000000000000000000000000000'; // "RLUSD" in hex

/**
 * Check RLUSD balance for a given address
 */
export async function getRLUSDBalance(address) {
  try {
    const client = await connectXRPL();

    // Get account lines (trustlines)
    const response = await client.request({
      command: 'account_lines',
      account: address,
      ledger_index: 'validated'
    });

    // Find RLUSD trustline
    const rlusdLine = response.result.lines.find(
      line => line.currency === RLUSD_CURRENCY && line.account === RLUSD_ISSUER
    );

    if (!rlusdLine) {
      return 0; // No RLUSD trustline established
    }

    return parseFloat(rlusdLine.balance);
  } catch (error) {
    console.error('Error getting RLUSD balance:', error);
    throw new Error('Failed to check RLUSD balance');
  }
}

/**
 * Transfer RLUSD from one account to another
 */
export async function transferRLUSD(fromSeed, toAddress, amount) {
  try {
    const client = await connectXRPL();
    const xrpl = await import('xrpl');

    // Create wallet from seed
    const wallet = xrpl.Wallet.fromSeed(fromSeed);

    // Create payment transaction
    const payment = {
      TransactionType: 'Payment',
      Account: wallet.address,
      Destination: toAddress,
      Amount: {
        currency: RLUSD_CURRENCY,
        value: amount.toString(),
        issuer: RLUSD_ISSUER
      }
    };

    // Prepare transaction
    const prepared = await client.autofill(payment);

    // Sign transaction
    const signed = wallet.sign(prepared);

    // Submit transaction
    const result = await client.submitAndWait(signed.tx_blob);

    if (result.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Payment failed: ${result.result.meta.TransactionResult}`);
    }

    return {
      success: true,
      hash: signed.hash,
      result: result.result.meta.TransactionResult
    };
  } catch (error) {
    console.error('Error transferring RLUSD:', error);
    throw error;
  }
}

/**
 * Transfer NFT from one account to another
 */
export async function transferNFT(fromSeed, toAddress, nftokenId) {
  try {
    const client = await connectXRPL();
    const xrpl = await import('xrpl');

    // Create wallet from seed
    const wallet = xrpl.Wallet.fromSeed(fromSeed);

    // Create NFT transfer offer
    const createOffer = {
      TransactionType: 'NFTokenCreateOffer',
      Account: wallet.address,
      NFTokenID: nftokenId,
      Amount: '0', // Free transfer
      Destination: toAddress,
      Flags: 1 // tfSellNFToken
    };

    // Submit create offer
    const preparedOffer = await client.autofill(createOffer);
    const signedOffer = wallet.sign(preparedOffer);
    const offerResult = await client.submitAndWait(signedOffer.tx_blob);

    if (offerResult.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`NFT offer creation failed: ${offerResult.result.meta.TransactionResult}`);
    }

    // Get the offer ID from metadata
    const offerNode = offerResult.result.meta.AffectedNodes.find(
      node => node.CreatedNode?.LedgerEntryType === 'NFTokenOffer'
    );

    const offerIndex = offerNode?.CreatedNode?.LedgerIndex;

    if (!offerIndex) {
      throw new Error('Failed to get NFT offer ID');
    }

    // Note: In production, the recipient would accept this offer
    // For automation, we'd need the recipient's seed to auto-accept

    return {
      success: true,
      offerIndex,
      hash: signedOffer.hash
    };
  } catch (error) {
    console.error('Error transferring NFT:', error);
    throw error;
  }
}

/**
 * Check if account has enough RLUSD for a payment
 */
export async function hasEnoughRLUSD(address, requiredAmount) {
  try {
    const balance = await getRLUSDBalance(address);
    return balance >= requiredAmount;
  } catch (error) {
    console.error('Error checking RLUSD sufficiency:', error);
    return false;
  }
}

/**
 * Create an XRPL Check for RLUSD payment
 * Returns the Check ID that can be cashed later
 */
export async function createRLUSDCheck(fromSeed, toAddress, amount, invoiceId = null) {
  try {
    const client = await connectXRPL();
    const xrpl = await import('xrpl');

    // Create wallet from seed
    const wallet = xrpl.Wallet.fromSeed(fromSeed);

    // Create Check transaction
    const checkCreate = {
      TransactionType: 'CheckCreate',
      Account: wallet.address,
      Destination: toAddress,
      SendMax: {
        currency: RLUSD_CURRENCY,
        value: amount.toString(),
        issuer: RLUSD_ISSUER
      }
    };

    // Add invoice ID if provided (for tracking)
    if (invoiceId) {
      checkCreate.InvoiceID = invoiceId;
    }

    // Prepare, sign, and submit
    const prepared = await client.autofill(checkCreate);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    if (result.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Check creation failed: ${result.result.meta.TransactionResult}`);
    }

    // Extract Check ID from metadata
    const checkNode = result.result.meta.AffectedNodes.find(
      node => node.CreatedNode?.LedgerEntryType === 'Check'
    );

    const checkId = checkNode?.CreatedNode?.LedgerIndex;

    if (!checkId) {
      throw new Error('Failed to get Check ID from transaction result');
    }

    return {
      success: true,
      checkId,
      hash: signed.hash,
      amount,
      from: wallet.address,
      to: toAddress
    };
  } catch (error) {
    console.error('Error creating RLUSD Check:', error);
    throw error;
  }
}

/**
 * Cash an XRPL Check
 * The establishment uses this to claim payment from a bidder
 */
export async function cashCheck(recipientSeed, checkId, amount) {
  try {
    const client = await connectXRPL();
    const xrpl = await import('xrpl');

    // Create wallet from seed
    const wallet = xrpl.Wallet.fromSeed(recipientSeed);

    // Create CheckCash transaction
    const checkCash = {
      TransactionType: 'CheckCash',
      Account: wallet.address,
      CheckID: checkId,
      Amount: {
        currency: RLUSD_CURRENCY,
        value: amount.toString(),
        issuer: RLUSD_ISSUER
      }
    };

    // Prepare, sign, and submit
    const prepared = await client.autofill(checkCash);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    if (result.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Check cashing failed: ${result.result.meta.TransactionResult}`);
    }

    return {
      success: true,
      hash: signed.hash,
      amount,
      checkId
    };
  } catch (error) {
    console.error('Error cashing Check:', error);
    throw error;
  }
}

/**
 * Cancel an XRPL Check
 * Either creator or recipient can cancel an uncashed check
 */
export async function cancelCheck(walletSeed, checkId) {
  try {
    const client = await connectXRPL();
    const xrpl = await import('xrpl');

    // Create wallet from seed
    const wallet = xrpl.Wallet.fromSeed(walletSeed);

    // Create CheckCancel transaction
    const checkCancel = {
      TransactionType: 'CheckCancel',
      Account: wallet.address,
      CheckID: checkId
    };

    // Prepare, sign, and submit
    const prepared = await client.autofill(checkCancel);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    if (result.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Check cancellation failed: ${result.result.meta.TransactionResult}`);
    }

    return {
      success: true,
      hash: signed.hash,
      checkId
    };
  } catch (error) {
    console.error('Error cancelling Check:', error);
    throw error;
  }
}

// ============================================================================
// XRPL ESCROW FUNCTIONS (for secure, trustless bidding)
// ============================================================================

/**
 * Create an XRPL Escrow to lock RLUSD funds
 * Bidder creates this when placing a bid
 *
 * @param {string} fromSeed - Bidder's wallet seed
 * @param {string} toAddress - Platform wallet address (destination)
 * @param {number} amount - RLUSD amount to lock
 * @param {number} finishAfter - Unix timestamp when escrow can be finished (auction.expiry)
 * @param {number|null} cancelAfter - Optional: Unix timestamp when escrow expires (or null)
 * @returns {Object} {success, escrowSequence, txHash, finishAfter, cancelAfter}
 *
 * Note: Owner can cancel escrow ANYTIME before it's finished, enabling rebidding!
 */
export async function createEscrow(fromSeed, toAddress, amount, finishAfter, cancelAfter = null) {
  try {
    const client = await connectXRPL();
    const xrpl = await import('xrpl');

    // Create wallet from seed
    const wallet = xrpl.Wallet.fromSeed(fromSeed);

    // Convert Unix timestamp to Ripple epoch (seconds since 2000-01-01)
    const RIPPLE_EPOCH_OFFSET = 946684800; // Seconds between Unix epoch and Ripple epoch
    const rippleFinishAfter = finishAfter - RIPPLE_EPOCH_OFFSET;

    // Create Escrow transaction
    const escrowCreate = {
      TransactionType: 'EscrowCreate',
      Account: wallet.address,
      Destination: toAddress,
      Amount: {
        currency: RLUSD_CURRENCY,
        value: amount.toString(),
        issuer: RLUSD_ISSUER
      },
      FinishAfter: rippleFinishAfter
    };

    // Add CancelAfter if provided (optional)
    if (cancelAfter !== null) {
      const rippleCancelAfter = cancelAfter - RIPPLE_EPOCH_OFFSET;
      escrowCreate.CancelAfter = rippleCancelAfter;
    }

    // Prepare, sign, and submit
    const prepared = await client.autofill(escrowCreate);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    if (result.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Escrow creation failed: ${result.result.meta.TransactionResult}`);
    }

    // Extract escrow sequence number from account's sequence
    // The escrow sequence is the account sequence of the EscrowCreate transaction
    const escrowSequence = result.result.Sequence;

    if (!escrowSequence) {
      throw new Error('Failed to get escrow sequence from transaction result');
    }

    return {
      success: true,
      escrowSequence,
      txHash: signed.hash,
      finishAfter,
      cancelAfter,
      owner: wallet.address,
      destination: toAddress
    };
  } catch (error) {
    console.error('Error creating RLUSD Escrow:', error);
    throw error;
  }
}

/**
 * Finish (claim) an XRPL Escrow to receive the locked funds
 * Platform calls this after auction expires to claim winning bid
 *
 * @param {string} walletSeed - Platform wallet seed
 * @param {string} owner - Escrow creator's address (bidder)
 * @param {number} escrowSequence - Sequence number of the escrow
 * @returns {Object} {success, txHash}
 */
export async function finishEscrow(walletSeed, owner, escrowSequence) {
  try {
    const client = await connectXRPL();
    const xrpl = await import('xrpl');

    // Create wallet from seed
    const wallet = xrpl.Wallet.fromSeed(walletSeed);

    // Create EscrowFinish transaction
    const escrowFinish = {
      TransactionType: 'EscrowFinish',
      Account: wallet.address,
      Owner: owner,
      OfferSequence: escrowSequence
    };

    // Prepare, sign, and submit
    const prepared = await client.autofill(escrowFinish);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    if (result.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Escrow finishing failed: ${result.result.meta.TransactionResult}`);
    }

    return {
      success: true,
      txHash: signed.hash,
      owner,
      escrowSequence
    };
  } catch (error) {
    console.error('Error finishing Escrow:', error);
    throw error;
  }
}

/**
 * Cancel an XRPL Escrow to refund the funds
 * Can be called by owner (bidder) or destination (platform)
 * Owner can cancel ANYTIME before escrow is finished
 * Anyone can cancel after CancelAfter time (if set)
 *
 * @param {string} walletSeed - Wallet seed (bidder or platform)
 * @param {string} owner - Escrow creator's address
 * @param {number} escrowSequence - Sequence number of the escrow
 * @returns {Object} {success, txHash}
 */
export async function cancelEscrow(walletSeed, owner, escrowSequence) {
  try {
    const client = await connectXRPL();
    const xrpl = await import('xrpl');

    // Create wallet from seed
    const wallet = xrpl.Wallet.fromSeed(walletSeed);

    // Create EscrowCancel transaction
    const escrowCancel = {
      TransactionType: 'EscrowCancel',
      Account: wallet.address,
      Owner: owner,
      OfferSequence: escrowSequence
    };

    // Prepare, sign, and submit
    const prepared = await client.autofill(escrowCancel);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    if (result.result.meta.TransactionResult !== 'tesSUCCESS') {
      throw new Error(`Escrow cancellation failed: ${result.result.meta.TransactionResult}`);
    }

    return {
      success: true,
      txHash: signed.hash,
      owner,
      escrowSequence
    };
  } catch (error) {
    console.error('Error cancelling Escrow:', error);
    throw error;
  }
}

/**
 * Get details of an XRPL Escrow from the ledger
 * Used to validate escrow exists and has correct parameters
 *
 * @param {string} ownerAddress - Address that created the escrow
 * @param {number} escrowSequence - Sequence number of the escrow
 * @returns {Object|null} Escrow details or null if not found
 */
export async function getEscrowDetails(ownerAddress, escrowSequence) {
  try {
    const client = await connectXRPL();

    // Query ledger for escrow object
    // Escrow ledger entry format: owner address + sequence
    const response = await client.request({
      command: 'ledger_entry',
      escrow: {
        owner: ownerAddress,
        seq: escrowSequence
      },
      ledger_index: 'validated'
    });

    if (!response.result.node) {
      return null; // Escrow not found
    }

    const escrow = response.result.node;

    // Convert Ripple epoch to Unix timestamp
    const RIPPLE_EPOCH_OFFSET = 946684800;
    const finishAfter = escrow.FinishAfter ? escrow.FinishAfter + RIPPLE_EPOCH_OFFSET : null;
    const cancelAfter = escrow.CancelAfter ? escrow.CancelAfter + RIPPLE_EPOCH_OFFSET : null;

    // Parse amount (could be XRP drops or IOU)
    let amount;
    if (typeof escrow.Amount === 'string') {
      // XRP in drops
      amount = parseInt(escrow.Amount) / 1000000; // Convert drops to XRP
    } else {
      // IOU (like RLUSD)
      amount = parseFloat(escrow.Amount.value);
    }

    return {
      owner: escrow.Account,
      destination: escrow.Destination,
      amount,
      currency: typeof escrow.Amount === 'string' ? 'XRP' : escrow.Amount.currency,
      issuer: typeof escrow.Amount === 'string' ? null : escrow.Amount.issuer,
      finishAfter,
      cancelAfter,
      sequence: escrowSequence,
      status: 'active' // If we found it, it's active (not finished or cancelled)
    };
  } catch (error) {
    // If error code is lsfEscrowNotFound or similar, return null
    if (error.data && error.data.error === 'entryNotFound') {
      return null;
    }
    console.error('Error getting Escrow details:', error);
    return null; // Return null instead of throwing to simplify validation logic
  }
}
