-- Migration: Switch to Direct Payment System (No Checks at Bidding)
-- This migration updates the schema for the new payment flow:
-- 1. Bids don't require Checks upfront
-- 2. Winner is determined based on RLUSD balance at auction expiry
-- 3. Winner pays directly after winning via "Pay & Claim NFT" button
-- 4. Payment goes: Winner → Platform → Original Owner

-- =====================================================
-- AUCTIONBIDS - UPDATE CHECK_STATUS VALUES
-- =====================================================

-- Drop old constraint
ALTER TABLE "AUCTIONBIDS"
DROP CONSTRAINT IF EXISTS check_check_status;

-- Add new constraint with updated allowed values
ALTER TABLE "AUCTIONBIDS"
ADD CONSTRAINT check_check_status
CHECK (check_status IN (
  'active',          -- Bid is active (auction ongoing)
  'won_unpaid',      -- Bid won but winner hasn't paid yet
  'paid',            -- Winner paid and claimed NFT
  'cashed',          -- (Legacy) Check was cashed by platform
  'pending_cash',    -- (Legacy) NFT transferred, owner needs to cash check
  'cancelled'        -- Bid was cancelled
));

-- Update comment
COMMENT ON COLUMN "AUCTIONBIDS".check_status IS 'Status: active (bidding), won_unpaid (won, needs payment), paid (completed), cashed/pending_cash (legacy), cancelled';

-- =====================================================
-- AUCTIONLISTING - ADD WINNING BID TRACKING
-- =====================================================

-- Add winning bid ID to track which bid won
ALTER TABLE "AUCTIONLISTING"
ADD COLUMN IF NOT EXISTS winning_bid_id BIGINT;

-- Add foreign key constraint
ALTER TABLE "AUCTIONLISTING"
ADD CONSTRAINT fk_winning_bid
FOREIGN KEY (winning_bid_id)
REFERENCES "AUCTIONBIDS"(bid_id)
ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN "AUCTIONLISTING".winning_bid_id IS 'ID of the winning bid (if auction completed with winner)';

-- =====================================================
-- NOTES
-- =====================================================

-- NEW PAYMENT FLOW:
-- 1. User places bid (no Check required, just bid_amount)
-- 2. When auction expires, finalization checks each bidder's RLUSD balance
-- 3. First bidder with sufficient balance is marked as winner (won_unpaid)
-- 4. Winner sees "Pay & Claim NFT" button in Won Auctions tab
-- 5. Winner pays RLUSD directly to platform wallet
-- 6. Backend transfers NFT to winner + payment to original owner
-- 7. Bid status updated to 'paid'

-- BENEFITS:
-- ✅ Simpler bidding flow (no Check creation required)
-- ✅ Fully automated payment distribution
-- ✅ Real-time balance validation at settlement
-- ✅ Falls back to next bidder if winner can't pay
-- ✅ All transactions fully on-chain (XRPL)
