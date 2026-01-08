import { createClient } from '@supabase/supabase-js';

// ==========================================
// 🔧 SUPABASE CONFIGURATION
// ==========================================
// Credentials are loaded from environment variables
// See .env.local for your credentials (not committed to git)
// See .env.example for the template
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Validate credentials
const isConfigured = 
  SUPABASE_URL !== 'YOUR_SUPABASE_PROJECT_URL' && 
  SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY' &&
  SUPABASE_URL.startsWith('http');

if (!isConfigured) {
  console.error('❌ Supabase not configured!');
  console.error('Please create a .env.local file with your Supabase credentials.');
  console.error('See .env.example for the required format.');
}

// Create Supabase client with fallback for unconfigured state
export const supabase = isConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : createClient('https://placeholder.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.placeholder');

export const isSupabaseConfigured = isConfigured;

// Database Types (matching your schema)
export interface User {
  publicKey: string;
  role: 'investor' | 'establishment';
  username: string;
}

export interface NFToken {
  nftoken_id: string;
  created_by: string | null;
  creator_username?: string; // Username of creator (populated by backend)
  invoice_number: string | null;
  face_value: number | null;
  image_link: string | null;
  maturity_date: string | null; // timestamp without time zone
  current_owner: string | null;
  current_state: string | null; // 'draft', 'listed', 'sold', etc.
}

export interface AuctionListing {
  aid: number;
  nftoken_id: string | null;
  face_value: number | null;
  expiry: string | null; // timestamp without time zone
  min_bid: number | null;
  current_bid: number | null;
  time_created: string; // timestamp with time zone
}

export interface AuctionBid {
  bid_id: number;
  aid: number | null;
  bid_amount: number | null;
  bid_by: string | null;
  created_at: string; // timestamp with time zone
}

// Extended types for joined queries
export interface AuctionListingWithNFT extends AuctionListing {
  NFTOKEN?: NFToken;
}

export interface AuctionBidWithDetails extends AuctionBid {
  AUCTIONLISTING?: AuctionListingWithNFT;
}