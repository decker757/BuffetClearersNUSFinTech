import {
  getPendingPaymentsByDebtor,
  getPaymentsAwaitingCollection,
  getPaymentHistory,
  recordCheckCreation,
  verifyCheckCashed,
  processMaturedNFTs,
  markOverduePayments
} from '../services/maturityPaymentService.js';

/**
 * Get pending maturity payments for the authenticated debtor
 * Returns NFTs where user is the debtor and payment is due
 */
export const getMyPendingPayments = async (req, res) => {
  try {
    const { address } = req.user; // From JWT token

    const result = await getPendingPaymentsByDebtor(address);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      payments: result.payments
    });

  } catch (error) {
    console.error('Error in getMyPendingPayments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get maturity payments awaiting collection by the authenticated creditor
 * Returns Checks that have been created and can be cashed
 */
export const getMyPaymentsToCollect = async (req, res) => {
  try {
    const { address } = req.user; // From JWT token

    const result = await getPaymentsAwaitingCollection(address);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      payments: result.payments
    });

  } catch (error) {
    console.error('Error in getMyPaymentsToCollect:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get payment history for the authenticated user
 * Returns all payments where user is either debtor or creditor
 */
export const getMyPaymentHistory = async (req, res) => {
  try {
    const { address } = req.user; // From JWT token

    const result = await getPaymentHistory(address);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      asDebtor: result.asDebtor,
      asCreditor: result.asCreditor,
      all: result.all
    });

  } catch (error) {
    console.error('Error in getMyPaymentHistory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Record Check creation by debtor
 * Called when debtor creates XRPL Check for maturity payment
 */
export const recordPaymentCheck = async (req, res) => {
  try {
    const { address } = req.user; // From JWT token
    const { payment_id, xrpl_check_id, xrpl_check_tx_hash } = req.body;

    // Validate required fields
    if (!payment_id || !xrpl_check_id || !xrpl_check_tx_hash) {
      return res.status(400).json({
        error: 'Missing required fields: payment_id, xrpl_check_id, xrpl_check_tx_hash'
      });
    }

    // TODO: Verify user is the debtor for this payment
    // For now, we trust the authenticated user

    const result = await recordCheckCreation(payment_id, xrpl_check_id, xrpl_check_tx_hash);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      payment: result.payment,
      message: 'Check recorded successfully. Creditor can now cash the Check.'
    });

  } catch (error) {
    console.error('Error in recordPaymentCheck:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Mark Check as cashed
 * Called by creditor after cashing Check via frontend
 */
export const markCheckCashed = async (req, res) => {
  try {
    const { address } = req.user; // From JWT token
    const { payment_id } = req.body;

    // Validate required fields
    if (!payment_id) {
      return res.status(400).json({
        error: 'Missing required field: payment_id'
      });
    }

    // TODO: Verify user is the creditor for this payment
    // For now, we trust the authenticated user

    const result = await verifyCheckCashed(payment_id);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      payment: result.payment,
      message: 'Payment marked as received. NFT marked as redeemed.'
    });

  } catch (error) {
    console.error('Error in markCheckCashed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Admin endpoint: Manually trigger maturity payment processing
 * In production, this should be protected with admin authentication
 */
export const triggerMaturityProcessing = async (req, res) => {
  try {
    const result = await processMaturedNFTs();

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      processed: result.processed,
      payments: result.payments,
      message: `Processed ${result.processed} matured NFT(s)`
    });

  } catch (error) {
    console.error('Error in triggerMaturityProcessing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Admin endpoint: Manually trigger overdue payment marking
 * In production, this should be protected with admin authentication
 */
export const triggerOverdueMarking = async (req, res) => {
  try {
    const result = await markOverduePayments();

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      marked: result.marked,
      payments: result.payments,
      message: `Marked ${result.marked} payment(s) as overdue`
    });

  } catch (error) {
    console.error('Error in triggerOverdueMarking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
