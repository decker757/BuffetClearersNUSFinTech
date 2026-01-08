-- Migration: Complete Escrow-based Auction System
-- This migration adds ALL fields needed for the escrow system
-- Can be run standalone (doesn't depend on 002)

-- =====================================================
-- AUCTIONLISTING TABLE - CORE AUCTION TRACKING
-- =====================================================

-- Auction status tracking
ALTER TABLE "AUCTIONLISTING"
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

ALTER TABLE "AUCTIONLISTING"
ADD COLUMN IF NOT EXISTS winner_address VARCHAR(100);

ALTER TABLE "AUCTIONLISTING"
ADD COLUMN IF NOT EXISTS final_price DECIMAL(20, 2);

ALTER TABLE "AUCTIONLISTING"
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE "AUCTIONLISTING"
ADD COLUMN IF NOT EXISTS unlisted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE "AUCTIONLISTING"
ADD COLUMN IF NOT EXISTS payment_tx_hash VARCHAR(100);

ALTER TABLE "AUCTIONLISTING"
ADD COLUMN IF NOT EXISTS nft_transfer_tx_hash VARCHAR(100);

-- =====================================================
-- AUCTIONLISTING TABLE - ESCROW-SPECIFIC
-- =====================================================

-- Original owner tracking (for NFT return on failure)
ALTER TABLE "AUCTIONLISTING"
ADD COLUMN IF NOT EXISTS original_owner VARCHAR(100);

-- Platform NFT custody tracking
ALTER TABLE "AUCTIONLISTING"
ADD COLUMN IF NOT EXISTS platform_holds_nft BOOLEAN DEFAULT false;

ALTER TABLE "AUCTIONLISTING"
ADD COLUMN IF NOT EXISTS nft_received_tx_hash VARCHAR(100);

-- Remove old Check-related column (if it exists from migration 002)
ALTER TABLE "AUCTIONLISTING"
DROP COLUMN IF EXISTS xrpl_check_id;

-- Add comments
COMMENT ON COLUMN "AUCTIONLISTING".status IS 'Auction state: active, completed, or unlisted';
COMMENT ON COLUMN "AUCTIONLISTING".original_owner IS 'XRPL address of organization that listed the NFT. Used for returning NFT if all bidders fail.';
COMMENT ON COLUMN "AUCTIONLISTING".platform_holds_nft IS 'True when platform wallet holds NFT in escrow. False after transfer to winner or return to owner.';

-- =====================================================
-- AUCTIONBIDS TABLE - ESCROW TRACKING
-- =====================================================

-- XRPL Escrow tracking columns
ALTER TABLE "AUCTIONBIDS"
ADD COLUMN IF NOT EXISTS xrpl_escrow_sequence INTEGER;

ALTER TABLE "AUCTIONBIDS"
ADD COLUMN IF NOT EXISTS xrpl_escrow_tx_hash VARCHAR(100);

ALTER TABLE "AUCTIONBIDS"
ADD COLUMN IF NOT EXISTS escrow_finish_after TIMESTAMP WITH TIME ZONE;

ALTER TABLE "AUCTIONBIDS"
ADD COLUMN IF NOT EXISTS escrow_cancel_after TIMESTAMP WITH TIME ZONE;

ALTER TABLE "AUCTIONBIDS"
ADD COLUMN IF NOT EXISTS escrow_status VARCHAR(20) DEFAULT 'active';

-- Add comments explaining escrow mechanics
COMMENT ON COLUMN "AUCTIONBIDS".xrpl_escrow_sequence IS 'Escrow sequence number on XRPL ledger. Used with owner address to identify escrow.';
COMMENT ON COLUMN "AUCTIONBIDS".xrpl_escrow_tx_hash IS 'Transaction hash of EscrowCreate transaction on XRPL.';
COMMENT ON COLUMN "AUCTIONBIDS".escrow_finish_after IS 'Timestamp when escrow can be finished (claimed). Set to auction expiry time.';
COMMENT ON COLUMN "AUCTIONBIDS".escrow_cancel_after IS 'Optional: Timestamp after which escrow can be cancelled. Can be NULL. Bidder can cancel ANYTIME before escrow is finished.';
COMMENT ON COLUMN "AUCTIONBIDS".escrow_status IS 'Status of escrow: active, finished (claimed by platform), or cancelled (refunded to bidder).';

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Auction status indexes
CREATE INDEX IF NOT EXISTS idx_auction_status
ON "AUCTIONLISTING"(status);

CREATE INDEX IF NOT EXISTS idx_auction_expiry_status
ON "AUCTIONLISTING"(expiry, status);

-- Escrow status indexes
CREATE INDEX IF NOT EXISTS idx_auction_bids_escrow_status
ON "AUCTIONBIDS"(aid, escrow_status);

CREATE INDEX IF NOT EXISTS idx_auction_bids_bidder_escrow
ON "AUCTIONBIDS"(bid_by, escrow_status);

-- =====================================================
-- CONSTRAINTS
-- =====================================================

-- Auction status constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_auction_status'
  ) THEN
    ALTER TABLE "AUCTIONLISTING"
    ADD CONSTRAINT check_auction_status
    CHECK (status IN ('active', 'completed', 'unlisted'));
  END IF;
END $$;

-- Escrow status constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_escrow_status'
  ) THEN
    ALTER TABLE "AUCTIONBIDS"
    ADD CONSTRAINT check_escrow_status
    CHECK (escrow_status IN ('active', 'finished', 'cancelled'));
  END IF;
END $$;

-- =====================================================
-- DATA MIGRATION
-- =====================================================

-- Update existing auctions to have 'active' status
UPDATE "AUCTIONLISTING"
SET status = 'active'
WHERE status IS NULL;

-- Update original_owner from created_by (if that column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'AUCTIONLISTING'
    AND column_name = 'created_by'
  ) THEN
    UPDATE "AUCTIONLISTING"
    SET original_owner = created_by
    WHERE original_owner IS NULL;
  END IF;
END $$;

-- =====================================================
-- CLEANUP (Optional - remove if 002 was never run)
-- =====================================================

-- Remove wallet_seed from USERS if it exists (from old Check system)
-- This column stored private keys which we don't need with escrows
ALTER TABLE "USERS"
DROP COLUMN IF EXISTS wallet_seed;

-- =====================================================
-- NOTES
-- =====================================================

-- HOW THE ESCROW SYSTEM WORKS:
-- 1. Bidder creates escrow on XRPL BEFORE placing bid (frontend)
-- 2. Escrow FinishAfter = auction.expiry (platform can't claim early)
-- 3. Escrow CancelAfter = optional (24h after expiry or NULL)
-- 4. Bidder can cancel escrow ANYTIME before it's finished (enables rebidding!)
-- 5. Platform finishes escrow when auction expires to claim payment
-- 6. If platform fails to finish, bidder can cancel to get refund
-- 7. If all bidders fail, NFT returned to original_owner automatically

-- SECURITY IMPROVEMENT:
-- ✅ No private keys stored in database!
-- ✅ Bidders create escrows in their own wallets (frontend)
-- ✅ Backend only stores escrow sequence number and validates on-chain
-- ✅ Trustless and transparent - all escrows visible on XRPL ledger
