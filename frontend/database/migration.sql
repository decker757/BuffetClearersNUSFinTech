-- =====================================================
-- XRPL Invoice NFT Financing Platform - Database Schema
-- Migration Script for Supabase
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE user_type AS ENUM ('investor', 'establishment');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE nft_status AS ENUM ('issued', 'listed', 'sold', 'matured', 'defaulted');
CREATE TYPE auction_status AS ENUM ('active', 'ended', 'cancelled', 'sold');
CREATE TYPE bid_status AS ENUM ('active', 'outbid', 'won', 'lost', 'withdrawn');
CREATE TYPE transaction_type AS ENUM ('auction_purchase', 'maturity_payment', 'transfer');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'overdue', 'defaulted');
CREATE TYPE notification_type AS ENUM (
  'bid_placed', 
  'outbid', 
  'auction_won', 
  'auction_lost', 
  'maturity_approaching', 
  'payment_received',
  'nft_listed',
  'nft_sold'
);

-- =====================================================
-- TABLES
-- =====================================================

-- 1. USERS TABLE
-- Stores both investors and establishments
-- Uses XRPL public key as primary identifier
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  public_key TEXT UNIQUE NOT NULL, -- XRPL public address
  user_type user_type NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  
  CONSTRAINT username_length CHECK (char_length(username) >= 3),
  CONSTRAINT valid_public_key CHECK (char_length(public_key) > 0)
);

COMMENT ON TABLE users IS 'All platform users - investors and establishments. Public key is XRPL address. NEVER store private keys!';
COMMENT ON COLUMN users.public_key IS 'XRPL public address - primary authentication identifier';

-- 2. ESTABLISHMENT PROFILES TABLE
-- Extended information for establishment users
CREATE TABLE establishment_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  business_address TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  verification_status verification_status DEFAULT 'pending',
  verification_notes TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT one_profile_per_user UNIQUE (user_id)
);

COMMENT ON TABLE establishment_profiles IS 'Extended KYB information for establishment accounts';

-- 3. INVOICE NFTs (TOKENS) TABLE
-- Core table for tokenized invoices
CREATE TABLE invoice_nfts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nft_id TEXT UNIQUE NOT NULL, -- Platform NFT identifier
  invoice_number TEXT UNIQUE NOT NULL,
  issuer_id UUID NOT NULL REFERENCES users(id),
  current_owner_id UUID NOT NULL REFERENCES users(id),
  debtor_name TEXT NOT NULL, -- Company/person who owes money
  debtor_address TEXT,
  debtor_contact TEXT,
  face_value DECIMAL(15, 2) NOT NULL CHECK (face_value > 0),
  currency TEXT DEFAULT 'RLUSD',
  issue_date DATE NOT NULL,
  maturity_date DATE NOT NULL,
  days_until_maturity INTEGER GENERATED ALWAYS AS (
    EXTRACT(DAY FROM (maturity_date - CURRENT_DATE))
  ) STORED,
  status nft_status DEFAULT 'issued',
  invoice_document_url TEXT, -- Link to invoice PDF/document
  invoice_description TEXT,
  nft_token_id_xrpl TEXT, -- XRPL on-chain NFT Token ID
  metadata JSONB, -- Additional metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_maturity_date CHECK (maturity_date > issue_date),
  CONSTRAINT valid_face_value CHECK (face_value > 0)
);

COMMENT ON TABLE invoice_nfts IS 'Tokenized invoices as NFTs on XRPL';
COMMENT ON COLUMN invoice_nfts.nft_id IS 'Platform-generated unique NFT identifier';
COMMENT ON COLUMN invoice_nfts.nft_token_id_xrpl IS 'XRPL blockchain NFT token ID';
COMMENT ON COLUMN invoice_nfts.debtor_name IS 'Entity that will pay invoice at maturity';

-- 4. AUCTIONS TABLE
-- Active and historical auctions
CREATE TABLE auctions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nft_id UUID NOT NULL REFERENCES invoice_nfts(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users(id),
  starting_price DECIMAL(15, 2) NOT NULL CHECK (starting_price > 0),
  reserve_price DECIMAL(15, 2), -- Optional minimum acceptable price
  current_highest_bid DECIMAL(15, 2),
  current_winner_id UUID REFERENCES users(id),
  auction_start TIMESTAMPTZ NOT NULL,
  auction_end TIMESTAMPTZ NOT NULL,
  status auction_status DEFAULT 'active',
  total_bids INTEGER DEFAULT 0,
  xrpl_escrow_id TEXT, -- XRPL escrow sequence if using escrow (optional)
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_auction_period CHECK (auction_end > auction_start),
  CONSTRAINT valid_reserve_price CHECK (reserve_price IS NULL OR reserve_price >= starting_price),
  CONSTRAINT valid_current_bid CHECK (current_highest_bid IS NULL OR current_highest_bid >= starting_price)
);

COMMENT ON TABLE auctions IS 'NFT auctions/listings on the marketplace';
COMMENT ON COLUMN auctions.reserve_price IS 'Minimum price seller will accept (optional)';

-- 5. BIDS TABLE
-- All bids placed on auctions
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES users(id),
  bid_amount DECIMAL(15, 2) NOT NULL CHECK (bid_amount > 0),
  is_winning BOOLEAN DEFAULT false,
  xrpl_transaction_hash TEXT, -- XRPL transaction hash for bid
  bid_status bid_status DEFAULT 'active',
  bid_placed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_bid_amount CHECK (bid_amount > 0)
);

COMMENT ON TABLE bids IS 'All bids placed on auctions';
COMMENT ON COLUMN bids.is_winning IS 'Whether this is currently the winning bid';

-- 6. TRANSACTIONS TABLE
-- Completed financial transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nft_id UUID REFERENCES invoice_nfts(id),
  transaction_type transaction_type NOT NULL,
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'RLUSD',
  xrpl_transaction_hash TEXT NOT NULL, -- On-chain proof
  xrpl_ledger_index INTEGER,
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  status transaction_status DEFAULT 'completed',
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_transaction_amount CHECK (amount > 0)
);

COMMENT ON TABLE transactions IS 'All completed financial transactions on XRPL';
COMMENT ON COLUMN transactions.xrpl_transaction_hash IS 'XRPL blockchain transaction hash - proof of payment';

-- 7. MATURITY PAYMENTS TABLE
-- Track debtor payments when invoices mature
CREATE TABLE maturity_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nft_id UUID NOT NULL REFERENCES invoice_nfts(id) ON DELETE CASCADE,
  nft_holder_id UUID NOT NULL REFERENCES users(id), -- Who receives payment
  expected_amount DECIMAL(15, 2) NOT NULL CHECK (expected_amount > 0),
  paid_amount DECIMAL(15, 2) CHECK (paid_amount >= 0),
  payment_status payment_status DEFAULT 'pending',
  expected_payment_date DATE NOT NULL,
  actual_payment_date DATE,
  days_overdue INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN actual_payment_date IS NOT NULL THEN 0
      WHEN CURRENT_DATE > expected_payment_date THEN EXTRACT(DAY FROM (CURRENT_DATE - expected_payment_date))::INTEGER
      ELSE 0
    END
  ) STORED,
  xrpl_transaction_hash TEXT, -- Payment proof on XRPL
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT one_payment_per_nft UNIQUE (nft_id)
);

COMMENT ON TABLE maturity_payments IS 'Tracks payments from debtors when invoices reach maturity date';
COMMENT ON COLUMN maturity_payments.nft_holder_id IS 'Current NFT owner who will receive payment from debtor';

-- 8. NOTIFICATIONS TABLE
-- User notifications for important events
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_nft_id UUID REFERENCES invoice_nfts(id) ON DELETE CASCADE,
  related_auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

COMMENT ON TABLE notifications IS 'User notifications for bids, wins, maturity alerts, etc.';

-- 9. SYSTEM SETTINGS TABLE
-- Platform configuration
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

COMMENT ON TABLE system_settings IS 'Platform-wide configuration settings';

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('platform_fee_percentage', '2.5', 'Platform fee as percentage of sale price'),
  ('min_auction_duration_hours', '24', 'Minimum auction duration in hours'),
  ('max_auction_duration_days', '30', 'Maximum auction duration in days'),
  ('min_listing_price', '1000', 'Minimum NFT listing price in RLUSD'),
  ('maturity_alert_days_before', '7', 'Days before maturity to send alert notification');

-- =====================================================
-- INDEXES for Performance
-- =====================================================

-- Users
CREATE INDEX idx_users_public_key ON users(public_key);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_username ON users(username);

-- Establishment Profiles
CREATE INDEX idx_establishment_profiles_user_id ON establishment_profiles(user_id);
CREATE INDEX idx_establishment_profiles_verification_status ON establishment_profiles(verification_status);

-- Invoice NFTs
CREATE INDEX idx_invoice_nfts_nft_id ON invoice_nfts(nft_id);
CREATE INDEX idx_invoice_nfts_issuer_id ON invoice_nfts(issuer_id);
CREATE INDEX idx_invoice_nfts_current_owner_id ON invoice_nfts(current_owner_id);
CREATE INDEX idx_invoice_nfts_status ON invoice_nfts(status);
CREATE INDEX idx_invoice_nfts_maturity_date ON invoice_nfts(maturity_date);
CREATE INDEX idx_invoice_nfts_nft_token_id_xrpl ON invoice_nfts(nft_token_id_xrpl);

-- Auctions
CREATE INDEX idx_auctions_nft_id ON auctions(nft_id);
CREATE INDEX idx_auctions_seller_id ON auctions(seller_id);
CREATE INDEX idx_auctions_status ON auctions(status);
CREATE INDEX idx_auctions_auction_end ON auctions(auction_end);
CREATE INDEX idx_auctions_current_winner_id ON auctions(current_winner_id);

-- Bids
CREATE INDEX idx_bids_auction_id ON bids(auction_id);
CREATE INDEX idx_bids_bidder_id ON bids(bidder_id);
CREATE INDEX idx_bids_is_winning ON bids(is_winning);
CREATE INDEX idx_bids_bid_status ON bids(bid_status);

-- Transactions
CREATE INDEX idx_transactions_nft_id ON transactions(nft_id);
CREATE INDEX idx_transactions_from_user_id ON transactions(from_user_id);
CREATE INDEX idx_transactions_to_user_id ON transactions(to_user_id);
CREATE INDEX idx_transactions_xrpl_hash ON transactions(xrpl_transaction_hash);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);

-- Maturity Payments
CREATE INDEX idx_maturity_payments_nft_id ON maturity_payments(nft_id);
CREATE INDEX idx_maturity_payments_holder_id ON maturity_payments(nft_holder_id);
CREATE INDEX idx_maturity_payments_status ON maturity_payments(payment_status);
CREATE INDEX idx_maturity_payments_expected_date ON maturity_payments(expected_payment_date);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_establishment_profiles_updated_at BEFORE UPDATE ON establishment_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_nfts_updated_at BEFORE UPDATE ON invoice_nfts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auctions_updated_at BEFORE UPDATE ON auctions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bids_updated_at BEFORE UPDATE ON bids
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maturity_payments_updated_at BEFORE UPDATE ON maturity_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create maturity payment record when NFT is sold
CREATE OR REPLACE FUNCTION create_maturity_payment_on_nft_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'sold' AND OLD.status != 'sold' THEN
    INSERT INTO maturity_payments (
      nft_id,
      nft_holder_id,
      expected_amount,
      expected_payment_date,
      payment_status
    ) VALUES (
      NEW.id,
      NEW.current_owner_id,
      NEW.face_value,
      NEW.maturity_date,
      'pending'
    )
    ON CONFLICT (nft_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_maturity_payment_trigger
  AFTER UPDATE ON invoice_nfts
  FOR EACH ROW
  EXECUTE FUNCTION create_maturity_payment_on_nft_sale();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE establishment_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_nfts ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE maturity_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- USERS: Users can read all users (for marketplace), but only update themselves
CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- ESTABLISHMENT PROFILES: Only owner can view/update
CREATE POLICY "Users can view own establishment profile" ON establishment_profiles
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own establishment profile" ON establishment_profiles
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create own establishment profile" ON establishment_profiles
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- INVOICE NFTs: Public read for marketplace, owners can update
CREATE POLICY "Anyone can view listed NFTs" ON invoice_nfts
  FOR SELECT USING (status = 'listed' OR status = 'sold');

CREATE POLICY "Owners can view their NFTs" ON invoice_nfts
  FOR SELECT USING (
    auth.uid()::text = issuer_id::text OR 
    auth.uid()::text = current_owner_id::text
  );

CREATE POLICY "Issuers can create NFTs" ON invoice_nfts
  FOR INSERT WITH CHECK (auth.uid()::text = issuer_id::text);

CREATE POLICY "Owners can update their NFTs" ON invoice_nfts
  FOR UPDATE USING (
    auth.uid()::text = issuer_id::text OR 
    auth.uid()::text = current_owner_id::text
  );

-- AUCTIONS: Public read for marketplace
CREATE POLICY "Anyone can view active auctions" ON auctions
  FOR SELECT USING (true);

CREATE POLICY "Sellers can create auctions" ON auctions
  FOR INSERT WITH CHECK (auth.uid()::text = seller_id::text);

CREATE POLICY "Sellers can update their auctions" ON auctions
  FOR UPDATE USING (auth.uid()::text = seller_id::text);

-- BIDS: Users can see their own bids and all bids on auctions they're involved in
CREATE POLICY "Users can view their own bids" ON bids
  FOR SELECT USING (auth.uid()::text = bidder_id::text);

CREATE POLICY "Auction sellers can view all bids on their auctions" ON bids
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auctions 
      WHERE auctions.id = bids.auction_id 
      AND auctions.seller_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can create bids" ON bids
  FOR INSERT WITH CHECK (auth.uid()::text = bidder_id::text);

-- TRANSACTIONS: Users can view transactions they're involved in
CREATE POLICY "Users can view their transactions" ON transactions
  FOR SELECT USING (
    auth.uid()::text = from_user_id::text OR 
    auth.uid()::text = to_user_id::text
  );

CREATE POLICY "System can create transactions" ON transactions
  FOR INSERT WITH CHECK (true);

-- MATURITY PAYMENTS: NFT holders and issuers can view
CREATE POLICY "NFT holders can view maturity payments" ON maturity_payments
  FOR SELECT USING (
    auth.uid()::text = nft_holder_id::text OR
    EXISTS (
      SELECT 1 FROM invoice_nfts 
      WHERE invoice_nfts.id = maturity_payments.nft_id 
      AND invoice_nfts.issuer_id::text = auth.uid()::text
    )
  );

CREATE POLICY "System can manage maturity payments" ON maturity_payments
  FOR ALL USING (true);

-- NOTIFICATIONS: Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- SYSTEM SETTINGS: Everyone can read, only admins can update
CREATE POLICY "Anyone can view system settings" ON system_settings
  FOR SELECT USING (true);

-- =====================================================
-- VIEWS for Common Queries
-- =====================================================

-- View: Active marketplace listings
CREATE OR REPLACE VIEW marketplace_listings AS
SELECT 
  a.id AS auction_id,
  a.auction_end,
  a.starting_price,
  a.current_highest_bid,
  a.total_bids,
  n.id AS nft_id,
  n.nft_id AS nft_identifier,
  n.invoice_number,
  n.face_value,
  n.maturity_date,
  n.debtor_name,
  EXTRACT(DAY FROM (n.maturity_date - CURRENT_DATE)) AS days_until_maturity,
  u.username AS issuer_username,
  u.public_key AS issuer_public_key
FROM auctions a
JOIN invoice_nfts n ON a.nft_id = n.id
JOIN users u ON n.issuer_id = u.id
WHERE a.status = 'active' AND a.auction_end > NOW()
ORDER BY a.auction_end ASC;

-- View: User portfolio summary
CREATE OR REPLACE VIEW user_portfolio_summary AS
SELECT 
  u.id AS user_id,
  u.username,
  COUNT(DISTINCT n.id) FILTER (WHERE n.current_owner_id = u.id) AS owned_nfts,
  COUNT(DISTINCT n.id) FILTER (WHERE n.issuer_id = u.id) AS issued_nfts,
  COUNT(DISTINCT b.id) FILTER (WHERE b.bidder_id = u.id AND b.bid_status = 'active') AS active_bids,
  COALESCE(SUM(n.face_value) FILTER (WHERE n.current_owner_id = u.id AND n.status = 'sold'), 0) AS total_expected_returns,
  COALESCE(SUM(mp.paid_amount) FILTER (WHERE mp.nft_holder_id = u.id AND mp.payment_status = 'paid'), 0) AS total_received_payments
FROM users u
LEFT JOIN invoice_nfts n ON u.id = n.current_owner_id OR u.id = n.issuer_id
LEFT JOIN bids b ON u.id = b.bidder_id
LEFT JOIN maturity_payments mp ON u.id = mp.nft_holder_id
GROUP BY u.id, u.username;

-- =====================================================
-- SAMPLE DATA (for testing - remove in production)
-- =====================================================

-- Sample investor user
INSERT INTO users (id, username, public_key, user_type, email) VALUES
  ('00000000-0000-0000-0000-000000000001', 'investor_alice', 'rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH', 'investor', 'alice@example.com');

-- Sample establishment user
INSERT INTO users (id, username, public_key, user_type, email) VALUES
  ('00000000-0000-0000-0000-000000000002', 'techcorp_ltd', 'rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY', 'establishment', 'finance@techcorp.com');

-- Sample establishment profile
INSERT INTO establishment_profiles (user_id, business_name, registration_number, business_address, contact_email, verification_status) VALUES
  ('00000000-0000-0000-0000-000000000002', 'TechCorp Ltd', 'REG-2024-001', '123 Tech Street, Singapore', 'finance@techcorp.com', 'verified');

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Summary of created objects
DO $$ 
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'XRPL Invoice NFT Platform - Migration Complete';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Created 9 tables with proper relationships';
  RAISE NOTICE 'Created 9 enums for type safety';
  RAISE NOTICE 'Created 30+ indexes for performance';
  RAISE NOTICE 'Created RLS policies for security';
  RAISE NOTICE 'Created triggers for automated tasks';
  RAISE NOTICE 'Created views for common queries';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'IMPORTANT: Never store private keys in database!';
  RAISE NOTICE 'Public keys (XRPL addresses) only!';
  RAISE NOTICE '==============================================';
END $$;
