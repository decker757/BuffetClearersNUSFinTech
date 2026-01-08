-- Migration: Maturity Payment System
-- This migration adds support for NFT maturity payments from debtors to investors
-- When an NFT matures, the debtor (creator) pays face value to the investor (current holder)
-- Uses XRPL Checks for on-chain payment verification

-- =====================================================
-- MATURITY_PAYMENT TABLE - TRACK MATURITY PAYMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS "MATURITY_PAYMENT" (
  payment_id SERIAL PRIMARY KEY,
  nftoken_id VARCHAR(100) NOT NULL,

  -- Payment parties
  debtor_address VARCHAR(100) NOT NULL,  -- NFT creator (owes money)
  creditor_address VARCHAR(100) NOT NULL,  -- Current NFT holder (owed money)

  -- Payment details
  payment_amount DECIMAL(20, 2) NOT NULL,  -- Face value of NFT
  maturity_date TIMESTAMP NOT NULL,  -- When payment is due

  -- XRPL Check tracking
  xrpl_check_id VARCHAR(100),  -- Check ID on XRPL ledger
  xrpl_check_tx_hash VARCHAR(100),  -- CheckCreate transaction hash
  check_status VARCHAR(20) DEFAULT 'pending',  -- pending, created, cashed, overdue

  -- Timestamps
  notified_at TIMESTAMP,  -- When debtor was notified
  check_created_at TIMESTAMP,  -- When Check was created
  paid_at TIMESTAMP,  -- When Check was cashed

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key
  CONSTRAINT fk_maturity_payment_nftoken
    FOREIGN KEY (nftoken_id)
    REFERENCES "NFTOKEN"(nftoken_id)
    ON DELETE CASCADE
);

-- Comments
COMMENT ON TABLE "MATURITY_PAYMENT" IS 'Tracks maturity payments from debtors to NFT investors';
COMMENT ON COLUMN "MATURITY_PAYMENT".debtor_address IS 'Original NFT creator who owes the payment';
COMMENT ON COLUMN "MATURITY_PAYMENT".creditor_address IS 'Current NFT holder who is owed payment';
COMMENT ON COLUMN "MATURITY_PAYMENT".xrpl_check_id IS 'Check ID (LedgerIndex) on XRPL ledger for payment';
COMMENT ON COLUMN "MATURITY_PAYMENT".check_status IS 'Status: pending (awaiting Check), created (Check made), cashed (payment received), overdue (past due)';

-- =====================================================
-- NFTOKEN TABLE - ADD MATURITY PAYMENT STATES
-- =====================================================

-- First, check what current_state values exist and update any invalid ones
-- This ensures migration doesn't fail on existing data
DO $$
BEGIN
  -- Update any null or invalid states to 'issued' as default
  UPDATE "NFTOKEN"
  SET current_state = 'issued'
  WHERE current_state IS NULL
     OR current_state NOT IN ('issued', 'owned', 'listed', 'matured', 'redeemed');

  -- Log how many rows were updated
  RAISE NOTICE 'Updated % rows with invalid current_state values',
    (SELECT COUNT(*) FROM "NFTOKEN" WHERE current_state NOT IN ('issued', 'owned', 'listed', 'matured', 'redeemed'));
END $$;

-- Now update the constraint to include maturity states
DO $$
BEGIN
  -- Drop old constraint if exists
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_current_state') THEN
    ALTER TABLE "NFTOKEN" DROP CONSTRAINT check_current_state;
  END IF;

  -- Add new constraint with maturity states
  ALTER TABLE "NFTOKEN"
  ADD CONSTRAINT check_current_state
  CHECK (current_state IN ('issued', 'owned', 'listed', 'matured', 'redeemed'));
END $$;

COMMENT ON COLUMN "NFTOKEN".current_state IS 'NFT lifecycle state: issued (created), owned (held by investor), listed (on auction), matured (payment due), redeemed (payment received)';

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for finding matured NFTs
CREATE INDEX IF NOT EXISTS idx_nftoken_matured_state
ON "NFTOKEN"(current_state, maturity_date)
WHERE current_state IN ('owned', 'matured');

-- Index for finding payments by debtor
CREATE INDEX IF NOT EXISTS idx_maturity_payment_debtor
ON "MATURITY_PAYMENT"(debtor_address, check_status);

-- Index for finding payments by creditor
CREATE INDEX IF NOT EXISTS idx_maturity_payment_creditor
ON "MATURITY_PAYMENT"(creditor_address, check_status);

-- Index for finding overdue payments
CREATE INDEX IF NOT EXISTS idx_maturity_payment_overdue
ON "MATURITY_PAYMENT"(maturity_date, check_status)
WHERE check_status IN ('pending', 'created');

-- Index for finding NFTs by maturity date
CREATE INDEX IF NOT EXISTS idx_nftoken_maturity_date
ON "NFTOKEN"(maturity_date)
WHERE current_state IN ('owned', 'matured');

-- =====================================================
-- CONSTRAINTS
-- =====================================================

-- Check status constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_payment_status'
  ) THEN
    ALTER TABLE "MATURITY_PAYMENT"
    ADD CONSTRAINT check_payment_status
    CHECK (check_status IN ('pending', 'created', 'cashed', 'overdue'));
  END IF;
END $$;

-- Ensure payment amount is positive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_payment_amount_positive'
  ) THEN
    ALTER TABLE "MATURITY_PAYMENT"
    ADD CONSTRAINT check_payment_amount_positive
    CHECK (payment_amount > 0);
  END IF;
END $$;

-- =====================================================
-- TRIGGER FOR UPDATED_AT
-- =====================================================

-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION update_maturity_payment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_maturity_payment_timestamp ON "MATURITY_PAYMENT";
CREATE TRIGGER trigger_update_maturity_payment_timestamp
BEFORE UPDATE ON "MATURITY_PAYMENT"
FOR EACH ROW
EXECUTE FUNCTION update_maturity_payment_timestamp();

-- =====================================================
-- NOTES
-- =====================================================

-- HOW THE MATURITY PAYMENT SYSTEM WORKS:
-- 1. Daily scheduler checks for NFTs reaching maturity (maturity_date <= today)
-- 2. For each matured NFT, create MATURITY_PAYMENT record
-- 3. Notify debtor (NFT creator) to create Check for face value
-- 4. Debtor creates Check payable to creditor (current NFT holder)
-- 5. System verifies Check creation and updates check_status to 'created'
-- 6. Creditor cashes Check to receive payment
-- 7. System detects Check cashed and updates:
--    - MATURITY_PAYMENT.check_status = 'cashed'
--    - NFTOKEN.current_state = 'redeemed'
-- 8. If payment not made within grace period, mark as 'overdue'

-- PAYMENT LIFECYCLE:
-- pending -> created -> cashed
--        \-> overdue (if not paid within grace period)

-- NFT STATE TRANSITIONS:
-- issued -> owned (via auction) -> matured (at maturity date) -> redeemed (after payment)

-- KEY FEATURES:
-- ✅ On-chain payment verification via XRPL Checks
-- ✅ Automatic maturity detection
-- ✅ Debtor notifications
-- ✅ Overdue payment tracking
-- ✅ Creditor can cash Check anytime after creation
-- ⚠️ Debtors must have sufficient RLUSD balance at maturity
