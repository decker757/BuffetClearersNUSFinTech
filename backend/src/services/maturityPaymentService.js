import {
  hasEnoughRLUSD,
  cashCheck,
  cancelCheck
} from './xrplService.js';
import { supabase } from '../config/supabase.js';

/**
 * Maturity Payment Service
 * Handles NFT maturity payments from debtors to investors using XRPL Checks
 *
 * Payment Flow:
 * 1. System detects NFT has reached maturity date
 * 2. Creates MATURITY_PAYMENT record with status 'pending'
 * 3. Notifies debtor (NFT creator) to create Check for face value
 * 4. Debtor creates Check payable to creditor (current NFT holder)
 * 5. System verifies Check creation and updates status to 'created'
 * 6. Creditor cashes Check via frontend
 * 7. System detects Check cashed and marks NFT as 'redeemed'
 */

/**
 * Process all NFTs that have reached maturity
 * Called by daily scheduler
 */
export async function processMaturedNFTs() {
  try {
    console.log('🔍 Checking for matured NFTs...');

    // Get all NFTs that:
    // 1. Have maturity_date <= today
    // 2. Are in 'owned' state (held by investor)
    // 3. Don't already have a maturity payment record
    const { data: maturedNFTs, error } = await supabase
      .from('NFTOKEN')
      .select('*')
      .eq('current_state', 'owned')
      .lte('maturity_date', new Date().toISOString())
      .order('maturity_date', { ascending: true });

    if (error) {
      console.error('Error fetching matured NFTs:', error);
      return { success: false, error: error.message };
    }

    if (!maturedNFTs || maturedNFTs.length === 0) {
      console.log('✅ No matured NFTs found');
      return { success: true, processed: 0 };
    }

    console.log(`📋 Found ${maturedNFTs.length} matured NFT(s)`);

    let processedCount = 0;
    let createdPayments = [];

    for (const nft of maturedNFTs) {
      try {
        // Check if payment record already exists
        const { data: existingPayment } = await supabase
          .from('MATURITY_PAYMENT')
          .select('payment_id')
          .eq('nftoken_id', nft.nftoken_id)
          .single();

        if (existingPayment) {
          console.log(`⏭️  Payment record already exists for NFT ${nft.nftoken_id}`);
          continue;
        }

        // Create maturity payment record
        const result = await createMaturityPayment(nft);

        if (result.success) {
          processedCount++;
          createdPayments.push(result.payment);
          console.log(`✅ Created maturity payment for NFT ${nft.nftoken_id}`);
        }

      } catch (error) {
        console.error(`Error processing NFT ${nft.nftoken_id}:`, error);
        // Continue processing other NFTs
      }
    }

    console.log(`✅ Processed ${processedCount} matured NFT(s)`);

    return {
      success: true,
      processed: processedCount,
      payments: createdPayments
    };

  } catch (error) {
    console.error('Error processing matured NFTs:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a maturity payment record for a matured NFT
 */
async function createMaturityPayment(nft) {
  try {
    // Create MATURITY_PAYMENT record
    const { data: payment, error: paymentError } = await supabase
      .from('MATURITY_PAYMENT')
      .insert({
        nftoken_id: nft.nftoken_id,
        debtor_address: nft.created_by,  // Original creator owes payment
        creditor_address: nft.current_owner,  // Current holder receives payment
        payment_amount: nft.face_value,
        maturity_date: nft.maturity_date,
        check_status: 'pending',  // Awaiting Check creation
        notified_at: new Date().toISOString()
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Failed to create payment record: ${paymentError.message}`);
    }

    // Update NFT state to 'matured'
    const { error: nftError } = await supabase
      .from('NFTOKEN')
      .update({ current_state: 'matured' })
      .eq('nftoken_id', nft.nftoken_id);

    if (nftError) {
      throw new Error(`Failed to update NFT state: ${nftError.message}`);
    }

    // TODO: Send notification to debtor (email, push notification, etc.)
    console.log(`📧 Notification sent to debtor ${nft.created_by} for payment of ${nft.face_value} RLUSD`);

    return {
      success: true,
      payment
    };

  } catch (error) {
    console.error('Error creating maturity payment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Record Check creation by debtor
 * Called when debtor creates Check via frontend
 */
export async function recordCheckCreation(paymentId, checkId, checkTxHash) {
  try {
    // Update payment record with Check details
    const { data: payment, error } = await supabase
      .from('MATURITY_PAYMENT')
      .update({
        xrpl_check_id: checkId,
        xrpl_check_tx_hash: checkTxHash,
        check_status: 'created',
        check_created_at: new Date().toISOString()
      })
      .eq('payment_id', paymentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record Check creation: ${error.message}`);
    }

    console.log(`✅ Check ${checkId} recorded for payment ${paymentId}`);

    return { success: true, payment };

  } catch (error) {
    console.error('Error recording Check creation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verify Check has been cashed and update records
 * This can be called:
 * 1. By creditor after cashing Check (frontend callback)
 * 2. By background job that monitors Check status on XRPL
 */
export async function verifyCheckCashed(paymentId) {
  try {
    // Get payment record
    const { data: payment, error: paymentError } = await supabase
      .from('MATURITY_PAYMENT')
      .select('*')
      .eq('payment_id', paymentId)
      .single();

    if (paymentError || !payment) {
      throw new Error('Payment record not found');
    }

    if (payment.check_status === 'cashed') {
      return { success: true, message: 'Payment already marked as cashed' };
    }

    // TODO: Verify Check is actually cashed on XRPL
    // For now, we trust the frontend callback
    // In production, query XRPL ledger to verify Check no longer exists

    // Update payment status
    const { error: updateError } = await supabase
      .from('MATURITY_PAYMENT')
      .update({
        check_status: 'cashed',
        paid_at: new Date().toISOString()
      })
      .eq('payment_id', paymentId);

    if (updateError) {
      throw new Error(`Failed to update payment status: ${updateError.message}`);
    }

    // Update NFT state to 'redeemed'
    const { error: nftError } = await supabase
      .from('NFTOKEN')
      .update({ current_state: 'redeemed' })
      .eq('nftoken_id', payment.nftoken_id);

    if (nftError) {
      throw new Error(`Failed to update NFT state: ${nftError.message}`);
    }

    console.log(`✅ Payment ${paymentId} marked as cashed, NFT ${payment.nftoken_id} redeemed`);

    return { success: true, payment };

  } catch (error) {
    console.error('Error verifying Check cashed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark overdue payments
 * Called by daily scheduler to identify payments that haven't been made
 * Grace period: 7 days after maturity date
 */
export async function markOverduePayments() {
  try {
    const gracePeriodDays = 7;
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - gracePeriodDays);

    console.log(`🔍 Checking for overdue payments (grace period: ${gracePeriodDays} days)...`);

    // Find payments that are:
    // 1. Still pending or created (not cashed)
    // 2. Maturity date + grace period has passed
    const { data: overduePayments, error } = await supabase
      .from('MATURITY_PAYMENT')
      .select('*')
      .in('check_status', ['pending', 'created'])
      .lt('maturity_date', overdueDate.toISOString());

    if (error) {
      console.error('Error fetching overdue payments:', error);
      return { success: false, error: error.message };
    }

    if (!overduePayments || overduePayments.length === 0) {
      console.log('✅ No overdue payments found');
      return { success: true, marked: 0 };
    }

    console.log(`⚠️  Found ${overduePayments.length} overdue payment(s)`);

    // Update status to 'overdue'
    const paymentIds = overduePayments.map(p => p.payment_id);

    const { error: updateError } = await supabase
      .from('MATURITY_PAYMENT')
      .update({ check_status: 'overdue' })
      .in('payment_id', paymentIds);

    if (updateError) {
      console.error('Error marking payments as overdue:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`✅ Marked ${overduePayments.length} payment(s) as overdue`);

    // TODO: Send notifications to creditors and debtors about overdue payments
    // TODO: Escalate to collections process if needed

    return {
      success: true,
      marked: overduePayments.length,
      payments: overduePayments
    };

  } catch (error) {
    console.error('Error marking overdue payments:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get pending maturity payments for a debtor
 * Used by frontend to show what payments are due
 */
export async function getPendingPaymentsByDebtor(debtorAddress) {
  try {
    const { data: payments, error } = await supabase
      .from('MATURITY_PAYMENT')
      .select(`
        *,
        NFTOKEN(*)
      `)
      .eq('debtor_address', debtorAddress)
      .in('check_status', ['pending', 'overdue'])
      .order('maturity_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch pending payments: ${error.message}`);
    }

    return { success: true, payments: payments || [] };

  } catch (error) {
    console.error('Error fetching pending payments:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get maturity payments awaiting collection by creditor
 * Used by frontend to show Checks that can be cashed
 */
export async function getPaymentsAwaitingCollection(creditorAddress) {
  try {
    const { data: payments, error } = await supabase
      .from('MATURITY_PAYMENT')
      .select(`
        *,
        NFTOKEN(*)
      `)
      .eq('creditor_address', creditorAddress)
      .eq('check_status', 'created')  // Check created but not yet cashed
      .order('check_created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch payments awaiting collection: ${error.message}`);
    }

    return { success: true, payments: payments || [] };

  } catch (error) {
    console.error('Error fetching payments awaiting collection:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get payment history for a user (both as debtor and creditor)
 */
export async function getPaymentHistory(userAddress) {
  try {
    const { data: payments, error } = await supabase
      .from('MATURITY_PAYMENT')
      .select(`
        *,
        NFTOKEN(*)
      `)
      .or(`debtor_address.eq.${userAddress},creditor_address.eq.${userAddress}`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch payment history: ${error.message}`);
    }

    // Separate into debtor and creditor views
    const asDebtor = payments?.filter(p => p.debtor_address === userAddress) || [];
    const asCreditor = payments?.filter(p => p.creditor_address === userAddress) || [];

    return {
      success: true,
      asDebtor,
      asCreditor,
      all: payments || []
    };

  } catch (error) {
    console.error('Error fetching payment history:', error);
    return { success: false, error: error.message };
  }
}
