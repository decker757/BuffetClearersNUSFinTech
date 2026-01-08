-- Migration: Add 'minting' state to NFTOKEN
-- The minting process uses a transitional 'minting' state before completing to 'issued'
-- This migration adds 'minting' to the allowed current_state values

DO $$
BEGIN
  -- Drop old constraint if exists
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_current_state') THEN
    ALTER TABLE "NFTOKEN" DROP CONSTRAINT check_current_state;
  END IF;

  -- Add new constraint with 'minting' state included
  ALTER TABLE "NFTOKEN"
  ADD CONSTRAINT check_current_state
  CHECK (current_state IN ('minting', 'issued', 'owned', 'listed', 'matured', 'redeemed'));

  RAISE NOTICE 'Added minting state to NFTOKEN check constraint';
END $$;

COMMENT ON COLUMN "NFTOKEN".current_state IS 'NFT lifecycle state: minting (being created), issued (created), owned (held by investor), listed (on auction), matured (payment due), redeemed (payment received)';
