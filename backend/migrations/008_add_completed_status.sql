-- Migration: Add 'completed' status to MATURITY_PAYMENT check_status
-- This allows direct RLUSD payments (not just Checks)

-- Drop the old constraint
ALTER TABLE "MATURITY_PAYMENT"
DROP CONSTRAINT IF EXISTS check_payment_status;

-- Add new constraint with 'completed' status
ALTER TABLE "MATURITY_PAYMENT"
ADD CONSTRAINT check_payment_status
CHECK (check_status IN ('pending', 'created', 'cashed', 'overdue', 'completed'));

-- Update comment
COMMENT ON COLUMN "MATURITY_PAYMENT".check_status IS 'Status: pending (awaiting payment), created (Check made), cashed (Check cashed), completed (direct payment made), overdue (past due)';
