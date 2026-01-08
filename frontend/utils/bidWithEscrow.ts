/**
 * Utility for placing bids with automatic XRPL Check creation
 * Uses RLUSD Checks with balance validation (Option 3)
 *
 * ⚠️ WARNING: This implementation uses sessionStorage for wallet seeds.
 * This is ONLY acceptable for testnet demos. Never use in production!
 */

import * as xrpl from 'xrpl';

const BACKEND_URL = 'http://localhost:6767';
const XRPL_NETWORK = 'wss://s.altnet.rippletest.net:51233';
const RLUSD_ISSUER = import.meta.env.VITE_RLUSD_ISSUER || 'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV';
// RLUSD as hex-encoded currency code (non-standard 3-char codes must be 40-char hex)
const RLUSD_CURRENCY = '524C555344000000000000000000000000000000'; // "RLUSD" in hex

// Debug: Log the issuer being used
console.log('🔍 RLUSD Issuer:', RLUSD_ISSUER);

// Get platform wallet address from environment or fallback
const PLATFORM_WALLET_ADDRESS = import.meta.env.VITE_PLATFORM_WALLET_ADDRESS || 'rG1QQv2nh2gr7RCZ1P8YYcBUKCCN633jCn';

export interface BidResult {
  success: boolean;
  message: string;
  data?: {
    bid: any;
    checkTxHash: string;
    checkId: string;
    new_current_bid: number;
  };
  error?: string;
}

/**
 * Places a bid with automatic RLUSD Check creation
 *
 * @param auctionId - The auction ID to bid on
 * @param bidAmount - The bid amount in RLUSD
 * @param auctionExpiry - The auction expiry timestamp (ISO string) - not used for Checks
 * @returns Promise<BidResult>
 */
export async function placeBidWithEscrow(
  auctionId: string,
  bidAmount: number,
  auctionExpiry: string
): Promise<BidResult> {
  let client: xrpl.Client | null = null;

  try {
    // Step 1: Get wallet seed from sessionStorage
    const seed = sessionStorage.getItem('walletSeed');
    if (!seed) {
      return {
        success: false,
        message: 'Wallet not found. Please sign in again.',
        error: 'NO_WALLET_SEED'
      };
    }

    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      return {
        success: false,
        message: 'Authentication required. Please sign in.',
        error: 'NO_AUTH_TOKEN'
      };
    }

    // Step 2: Create wallet from seed
    const wallet = xrpl.Wallet.fromSeed(seed);
    console.log('Creating RLUSD Check from wallet:', wallet.address);

    // Step 3: Connect to XRPL
    client = new xrpl.Client(XRPL_NETWORK);
    await client.connect();
    console.log('Connected to XRPL network');

    // Step 4: Verify RLUSD balance before creating Check
    console.log('Checking RLUSD balance...');
    const balanceCheck = await checkRLUSDBalance(bidAmount);
    if (!balanceCheck.hasEnough) {
      await client.disconnect();
      return {
        success: false,
        message: `Insufficient RLUSD balance. You have ${balanceCheck.balance} RLUSD, need ${bidAmount} RLUSD`,
        error: 'INSUFFICIENT_BALANCE'
      };
    }
    console.log(`Balance verified: ${balanceCheck.balance} RLUSD`);

    // Step 5: Create Check transaction (supports RLUSD!)
    const checkTx: xrpl.CheckCreate = {
      TransactionType: 'CheckCreate',
      Account: wallet.address,
      Destination: PLATFORM_WALLET_ADDRESS,
      SendMax: {
        currency: RLUSD_CURRENCY,
        value: bidAmount.toString(),
        issuer: RLUSD_ISSUER
      }
    };

    console.log('Preparing Check transaction:', checkTx);

    // Step 6: Autofill, sign, and submit Check
    const prepared = await client.autofill(checkTx);
    const signed = wallet.sign(prepared);
    console.log('Submitting Check transaction...');

    const result = await client.submitAndWait(signed.tx_blob);

    // Step 7: Check if Check creation succeeded
    if (result.result.meta && typeof result.result.meta !== 'string') {
      const transactionResult = result.result.meta.TransactionResult;
      if (transactionResult !== 'tesSUCCESS') {
        return {
          success: false,
          message: `Check creation failed: ${transactionResult}`,
          error: transactionResult
        };
      }
    }

    // Step 8: Extract Check ID from metadata
    const checkNode = result.result.meta && typeof result.result.meta !== 'string'
      ? (result.result.meta as any).AffectedNodes.find(
          (node: any) => node.CreatedNode?.LedgerEntryType === 'Check'
        )
      : null;

    const checkId = checkNode?.CreatedNode?.LedgerIndex;

    if (!checkId) {
      return {
        success: false,
        message: 'Failed to extract Check ID from transaction',
        error: 'NO_CHECK_ID'
      };
    }

    console.log('Check created successfully!');
    console.log('Transaction hash:', signed.hash);
    console.log('Check ID:', checkId);

    // Step 9: Call backend to record bid
    console.log('Recording bid in backend...');
    const response = await fetch(`${BACKEND_URL}/auctions/${auctionId}/bids`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bid_amount: bidAmount,
        xrpl_check_id: checkId,
        xrpl_check_tx_hash: signed.hash
      })
    });

    const bidData = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: bidData.error || 'Failed to record bid',
        error: 'BACKEND_ERROR'
      };
    }

    console.log('Bid placed successfully!');

    return {
      success: true,
      message: 'Bid placed successfully!',
      data: {
        bid: bidData.bid,
        checkTxHash: signed.hash,
        checkId,
        new_current_bid: bidData.new_current_bid
      }
    };

  } catch (error) {
    console.error('Error placing bid with Check:', error);

    let errorMessage = 'Failed to place bid. Please try again.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      message: errorMessage,
      error: 'TRANSACTION_ERROR'
    };

  } finally {
    // Always disconnect from XRPL
    if (client && client.isConnected()) {
      await client.disconnect();
      console.log('Disconnected from XRPL');
    }
  }
}

/**
 * Check if user has enough RLUSD balance for a bid
 *
 * @param requiredAmount - The amount needed in RLUSD
 * @returns Promise<{ hasEnough: boolean, balance: number }>
 */
export async function checkRLUSDBalance(requiredAmount: number): Promise<{ hasEnough: boolean, balance: number }> {
  let client: xrpl.Client | null = null;

  try {
    const seed = sessionStorage.getItem('walletSeed');
    if (!seed) {
      throw new Error('Wallet not found');
    }

    const wallet = xrpl.Wallet.fromSeed(seed);

    client = new xrpl.Client(XRPL_NETWORK);
    await client.connect();

    // Get account lines (trustlines)
    const response = await client.request({
      command: 'account_lines',
      account: wallet.address,
      ledger_index: 'validated'
    });

    // Find RLUSD trustline
    const rlusdLine = response.result.lines.find(
      (line: any) => line.currency === RLUSD_CURRENCY && line.account === RLUSD_ISSUER
    );

    const balance = rlusdLine ? parseFloat(rlusdLine.balance) : 0;

    return {
      hasEnough: balance >= requiredAmount,
      balance
    };

  } catch (error) {
    console.error('Error checking RLUSD balance:', error);
    throw error;
  } finally {
    if (client && client.isConnected()) {
      await client.disconnect();
    }
  }
}

/**
 * Get the user's current RLUSD balance
 *
 * @returns Promise<number> - The RLUSD balance
 */
export async function getRLUSDBalance(): Promise<number> {
  const result = await checkRLUSDBalance(0);
  return result.balance;
}
