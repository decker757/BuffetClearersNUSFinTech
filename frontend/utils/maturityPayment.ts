/**
 * Utility functions for maturity payment operations
 * Handles creating and cashing XRPL Checks for NFT maturity payments
 */

import * as xrpl from 'xrpl';

const BACKEND_URL = 'http://localhost:6767';
const XRPL_NETWORK = 'wss://s.altnet.rippletest.net:51233';
const RLUSD_ISSUER = import.meta.env.VITE_RLUSD_ISSUER || 'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV';
const RLUSD_CURRENCY = '524C555344000000000000000000000000000000'; // "RLUSD" in hex

export interface MaturityPayment {
  payment_id: number;
  nftoken_id: string;
  debtor_address: string;
  creditor_address: string;
  payment_amount: number;
  maturity_date: string;
  xrpl_check_id?: string;
  xrpl_check_tx_hash?: string;
  check_status: 'pending' | 'created' | 'cashed' | 'overdue';
  notified_at?: string;
  check_created_at?: string;
  paid_at?: string;
  NFTOKEN?: {
    invoice_number?: string;
    face_value?: number;
    maturity_date?: string;
  };
}

export interface PaymentResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Create maturity payment Check (debtor pays creditor)
 * @param paymentId - The maturity payment ID
 * @param creditorAddress - The creditor's XRPL address (current NFT holder)
 * @param amount - Payment amount in RLUSD
 * @returns Promise<PaymentResult>
 */
export async function createMaturityPaymentCheck(
  paymentId: number,
  creditorAddress: string,
  amount: number
): Promise<PaymentResult> {
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
    console.log('Creating maturity payment Check from wallet:', wallet.address);
    console.log('Payable to creditor:', creditorAddress);

    // Step 3: Connect to XRPL
    client = new xrpl.Client(XRPL_NETWORK);
    await client.connect();
    console.log('Connected to XRPL network');

    // Step 4: Verify RLUSD balance
    console.log('Checking RLUSD balance...');
    const accountLines = await client.request({
      command: 'account_lines',
      account: wallet.address,
      ledger_index: 'validated'
    });

    const rlusdLine = accountLines.result.lines.find(
      (line: any) => line.currency === RLUSD_CURRENCY && line.account === RLUSD_ISSUER
    );

    const balance = rlusdLine ? parseFloat(rlusdLine.balance) : 0;

    if (balance < amount) {
      await client.disconnect();
      return {
        success: false,
        message: `Insufficient RLUSD balance. You have ${balance} RLUSD, need ${amount} RLUSD`,
        error: 'INSUFFICIENT_BALANCE'
      };
    }

    console.log(`Balance verified: ${balance} RLUSD`);

    // Step 5: Create Check transaction
    const checkTx: xrpl.CheckCreate = {
      TransactionType: 'CheckCreate',
      Account: wallet.address,
      Destination: creditorAddress,
      SendMax: {
        currency: RLUSD_CURRENCY,
        value: amount.toString(),
        issuer: RLUSD_ISSUER
      }
    };

    console.log('Preparing Check transaction (payable to creditor):', checkTx);

    // Step 6: Autofill, sign, and submit Check
    const prepared = await client.autofill(checkTx);
    const signed = wallet.sign(prepared);
    console.log('Submitting Check transaction...');

    const result = await client.submitAndWait(signed.tx_blob);

    // Step 7: Verify Check creation
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

    // Step 8: Extract Check ID
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

    // Step 9: Record Check in backend
    console.log('Recording Check in backend...');
    const response = await fetch(`${BACKEND_URL}/maturity-payments/record-check`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        payment_id: paymentId,
        xrpl_check_id: checkId,
        xrpl_check_tx_hash: signed.hash
      })
    });

    const responseData = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: responseData.error || 'Failed to record Check',
        error: 'BACKEND_ERROR'
      };
    }

    console.log('Check recorded successfully!');

    return {
      success: true,
      message: 'Payment Check created successfully! Creditor can now cash it.',
      data: {
        checkId,
        checkTxHash: signed.hash,
        payment: responseData.payment
      }
    };

  } catch (error) {
    console.error('Error creating maturity payment Check:', error);

    let errorMessage = 'Failed to create payment Check. Please try again.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      message: errorMessage,
      error: 'TRANSACTION_ERROR'
    };

  } finally {
    if (client && client.isConnected()) {
      await client.disconnect();
      console.log('Disconnected from XRPL');
    }
  }
}

/**
 * Cash a maturity payment Check (creditor collects payment)
 * @param paymentId - The maturity payment ID
 * @param checkId - The XRPL Check ID
 * @param amount - Amount to cash in RLUSD
 * @returns Promise<PaymentResult>
 */
export async function cashMaturityPaymentCheck(
  paymentId: number,
  checkId: string,
  amount: number
): Promise<PaymentResult> {
  let client: xrpl.Client | null = null;

  try {
    // Step 1: Get wallet seed
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
    console.log('Cashing Check from wallet:', wallet.address);

    // Step 3: Connect to XRPL
    client = new xrpl.Client(XRPL_NETWORK);
    await client.connect();
    console.log('Connected to XRPL network');

    // Step 4: Create CheckCash transaction
    const checkCashTx: xrpl.CheckCash = {
      TransactionType: 'CheckCash',
      Account: wallet.address,
      CheckID: checkId,
      Amount: {
        currency: RLUSD_CURRENCY,
        value: amount.toString(),
        issuer: RLUSD_ISSUER
      }
    };

    console.log('Preparing CheckCash transaction:', checkCashTx);

    // Step 5: Autofill, sign, and submit
    const prepared = await client.autofill(checkCashTx);
    const signed = wallet.sign(prepared);
    console.log('Submitting CheckCash transaction...');

    const result = await client.submitAndWait(signed.tx_blob);

    // Step 6: Verify Check cashing
    if (result.result.meta && typeof result.result.meta !== 'string') {
      const transactionResult = result.result.meta.TransactionResult;
      if (transactionResult !== 'tesSUCCESS') {
        return {
          success: false,
          message: `Check cashing failed: ${transactionResult}`,
          error: transactionResult
        };
      }
    }

    console.log('Check cashed successfully!');
    console.log('Transaction hash:', signed.hash);

    // Step 7: Update backend
    console.log('Updating backend...');
    const response = await fetch(`${BACKEND_URL}/maturity-payments/mark-cashed`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        payment_id: paymentId
      })
    });

    const responseData = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: responseData.error || 'Failed to update payment status',
        error: 'BACKEND_ERROR'
      };
    }

    console.log('Payment marked as received!');

    return {
      success: true,
      message: 'Payment received successfully! NFT marked as redeemed.',
      data: {
        txHash: signed.hash,
        payment: responseData.payment
      }
    };

  } catch (error) {
    console.error('Error cashing Check:', error);

    let errorMessage = 'Failed to cash Check. Please try again.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      message: errorMessage,
      error: 'TRANSACTION_ERROR'
    };

  } finally {
    if (client && client.isConnected()) {
      await client.disconnect();
      console.log('Disconnected from XRPL');
    }
  }
}

/**
 * Fetch pending payments for authenticated debtor
 */
export async function fetchPendingPayments(): Promise<MaturityPayment[]> {
  try {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${BACKEND_URL}/maturity-payments/pending`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch pending payments');
    }

    return data.payments || [];

  } catch (error) {
    console.error('Error fetching pending payments:', error);
    throw error;
  }
}

/**
 * Fetch payments awaiting collection by authenticated creditor
 */
export async function fetchPaymentsToCollect(): Promise<MaturityPayment[]> {
  try {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${BACKEND_URL}/maturity-payments/to-collect`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch payments to collect');
    }

    return data.payments || [];

  } catch (error) {
    console.error('Error fetching payments to collect:', error);
    throw error;
  }
}

/**
 * Fetch payment history for authenticated user
 */
export async function fetchPaymentHistory(): Promise<{
  asDebtor: MaturityPayment[];
  asCreditor: MaturityPayment[];
  all: MaturityPayment[];
}> {
  try {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${BACKEND_URL}/maturity-payments/history`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch payment history');
    }

    return {
      asDebtor: data.asDebtor || [],
      asCreditor: data.asCreditor || [],
      all: data.all || []
    };

  } catch (error) {
    console.error('Error fetching payment history:', error);
    throw error;
  }
}
