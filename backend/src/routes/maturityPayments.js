import express from 'express';
import {
  getMyPendingPayments,
  getMyPaymentsToCollect,
  getMyPaymentHistory,
  recordPaymentCheck,
  markCheckCashed,
  triggerMaturityProcessing,
  triggerOverdueMarking,
  payMaturityPayment
} from '../controllers/maturityPaymentController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All maturity payment routes require authentication

/**
 * GET /maturity-payments/pending
 * Get pending payments for authenticated debtor (payments user owes)
 */
router.get('/maturity-payments/pending', authenticateToken, getMyPendingPayments);

/**
 * GET /maturity-payments/to-collect
 * Get payments awaiting collection by authenticated creditor (Checks to cash)
 */
router.get('/maturity-payments/to-collect', authenticateToken, getMyPaymentsToCollect);

/**
 * GET /maturity-payments/history
 * Get complete payment history for authenticated user
 */
router.get('/maturity-payments/history', authenticateToken, getMyPaymentHistory);

/**
 * POST /maturity-payments/record-check
 * Record Check creation by debtor
 * Body: { payment_id, xrpl_check_id, xrpl_check_tx_hash }
 */
router.post('/maturity-payments/record-check', authenticateToken, recordPaymentCheck);

/**
 * POST /maturity-payments/mark-cashed
 * Mark Check as cashed by creditor
 * Body: { payment_id }
 */
router.post('/maturity-payments/mark-cashed', authenticateToken, markCheckCashed);

/**
 * POST /maturity-payments/:id/pay
 * Pay maturity amount directly via RLUSD transfer
 * Body: { payment_tx_hash }
 */
router.post('/maturity-payments/:id/pay', authenticateToken, payMaturityPayment);

/**
 * POST /maturity-payments/process-matured
 * Admin endpoint: Manually trigger maturity NFT processing
 * In production, add additional admin authentication
 */
router.post('/maturity-payments/process-matured', authenticateToken, triggerMaturityProcessing);

/**
 * POST /maturity-payments/mark-overdue
 * Admin endpoint: Manually trigger overdue payment marking
 * In production, add additional admin authentication
 */
router.post('/maturity-payments/mark-overdue', authenticateToken, triggerOverdueMarking);

export default router;
