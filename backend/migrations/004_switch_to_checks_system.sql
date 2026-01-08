-- Migration: Switch from Escrow to Check-based System
-- This migration adds Check fields and transitions away from Escrows
-- Reason: XRPL Escrows don't support RLUSD (only XRP)
-- Solution: Use XRPL Checks for RLUSD with balance validation (Option 3)

-- =====================================================
-- AUCTIONBIDS TABLE - ADD CHECK TRACKING
-- =====================================================

-- Add XRPL Check tracking columns
ALTER TABLE "AUCTIONBIDS"
ADD COLUMN IF NOT EXISTS xrpl_check_id VARCHAR(100);

ALTER TABLE "AUCTIONBIDS"
ADD COLUMN IF NOT EXISTS xrpl_check_tx_hash VARCHAR(100);

ALTER TABLE "AUCTIONBIDS"
ADD COLUMN IF NOT EXISTS check_status VARCHAR(20) DEFAULT 'active';

-- Add comments explaining Check mechanics
COMMENT ON COLUMN "AUCTIONBIDS".xrpl_check_id IS 'Check ID (LedgerIndex) on XRPL ledger. Used to identify and cash the check.';
COMMENT ON COLUMN "AUCTIONBIDS".xrpl_check_tx_hash IS 'Transaction hash of CheckCreate transaction on XRPL.';
COMMENT ON COLUMN "AUCTIONBIDS".check_status IS 'Status of check: active, cashed (claimed by platform), or cancelled (refunded to bidder).';

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Check status indexes
CREATE INDEX IF NOT EXISTS idx_auction_bids_check_status
ON "AUCTIONBIDS"(aid, check_status);

CREATE INDEX IF NOT EXISTS idx_auction_bids_bidder_check
ON "AUCTIONBIDS"(bid_by, check_status);

-- =====================================================
-- CONSTRAINTS
-- =====================================================

-- Check status constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_check_status'
  ) THEN
    ALTER TABLE "AUCTIONBIDS"
    ADD CONSTRAINT check_check_status
    CHECK (check_status IN ('active', 'cashed', 'cancelled'));
  END IF;
END $$;

-- =====================================================
-- DATA MIGRATION (if needed)
-- =====================================================

-- Mark existing escrow bids as migrated/inactive if needed
-- (Optional - only if you have existing data to migrate)

-- =====================================================
-- BACKWARD COMPATIBILITY
-- =====================================================

-- Keep escrow columns for now (don't drop them yet)
-- This allows rollback if needed
-- Once system is stable, can drop escrow columns in future migration

-- =====================================================
-- NOTES
-- =====================================================

-- HOW THE CHECK SYSTEM WORKS:
-- 1. Frontend verifies bidder has sufficient RLUSD balance
-- 2. Bidder creates Check on XRPL when placing bid
-- 3. Backend verifies balance again before accepting bid
-- 4. Check is stored in database (check_id + tx_hash)
-- 5. When auction expires, platform verifies balance AGAIN
-- 6. If balance sufficient, platform cashes Check to claim RLUSD
-- 7. If balance insufficient, try next highest bidder
-- 8. NFT transferred to winner after successful payment

-- KEY DIFFERENCES FROM ESCROWS:
-- ✅ Checks support RLUSD (and all IOUs)
-- ❌ Checks DON'T lock funds (balance validation required)
-- ✅ No time locks needed (simpler)
-- ⚠️ Requires balance validation at bid time AND settlement time

-- SECURITY NOTES:
-- ✅ No private keys stored in database
-- ✅ Bidders create Checks in their own wallets
-- ✅ Backend validates balance before accepting bids
-- ✅ Fallback to next bidder if payment fails
-- ⚠️ Bidders can spend RLUSD between bid and settlement
