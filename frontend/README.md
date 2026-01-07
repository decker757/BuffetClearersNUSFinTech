# XRPL Invoice NFT Auction Platform

A professional NFT auction marketplace built on XRPL (XRP Ledger) for tokenizing and trading invoice financing. Businesses can tokenize their invoices as NFTs and auction them to investors, with payments handled in RLUSD stablecoin.

## Features

- 🏦 **Dual User System**: Separate dashboards for investors and establishments
- 💼 **Invoice Tokenization**: Convert invoices into tradable NFT tokens
- 🎯 **Auction Marketplace**: List and bid on invoice NFTs with customizable expiry dates
- 🔐 **Secure Authentication**: Public key-based auth (never stores private keys)
- 💰 **RLUSD Payments**: Stablecoin transactions on XRPL
- 📊 **Real-time Updates**: Live auction tracking and bidding
- 🎨 **Modern UI**: Dark mode with gradient backgrounds and responsive design

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + Real-time + Auth)
- **Blockchain**: XRPL (XRP Ledger)
- **Styling**: Inter font, dark gradients, NFT marketplace aesthetic

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- A Supabase account ([sign up here](https://supabase.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
   cd YOUR_REPO
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   
   a. Create a new project at [supabase.com](https://supabase.com)
   
   b. Copy your project credentials from Settings → API
   
   c. Create a `.env.local` file in the root directory:
   ```bash
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the database schema**
   
   In your Supabase SQL Editor, run the following schema:

   ```sql
   -- Create USER table
   CREATE TABLE "USER" (
     "publicKey" TEXT PRIMARY KEY,
     username TEXT UNIQUE NOT NULL,
     role TEXT NOT NULL CHECK (role IN ('investor', 'establishment'))
   );

   -- Create NFTOKEN table
   CREATE TABLE "NFTOKEN" (
     nftoken_id TEXT PRIMARY KEY,
     created_by TEXT REFERENCES "USER"("publicKey"),
     invoice_number TEXT,
     face_value NUMERIC,
     image_link TEXT,
     maturity_date TIMESTAMP,
     current_owner TEXT REFERENCES "USER"("publicKey"),
     current_state TEXT DEFAULT 'draft'
   );

   -- Create AUCTIONLISTING table
   CREATE TABLE "AUCTIONLISTING" (
     aid SERIAL PRIMARY KEY,
     nftoken_id TEXT REFERENCES "NFTOKEN"(nftoken_id),
     face_value NUMERIC,
     expiry TIMESTAMP,
     min_bid NUMERIC,
     current_bid NUMERIC,
     time_created TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Create AUCTIONBIDS table
   CREATE TABLE "AUCTIONBIDS" (
     bid_id SERIAL PRIMARY KEY,
     aid INTEGER REFERENCES "AUCTIONLISTING"(aid),
     bid_amount NUMERIC,
     bid_by TEXT REFERENCES "USER"("publicKey"),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Enable Row Level Security
   ALTER TABLE "USER" ENABLE ROW LEVEL SECURITY;
   ALTER TABLE "NFTOKEN" ENABLE ROW LEVEL SECURITY;
   ALTER TABLE "AUCTIONLISTING" ENABLE ROW LEVEL SECURITY;
   ALTER TABLE "AUCTIONBIDS" ENABLE ROW LEVEL SECURITY;

   -- Create RLS policies (allow all for demo - customize as needed)
   CREATE POLICY "Allow all" ON "USER" FOR ALL USING (true);
   CREATE POLICY "Allow all" ON "NFTOKEN" FOR ALL USING (true);
   CREATE POLICY "Allow all" ON "AUCTIONLISTING" FOR ALL USING (true);
   CREATE POLICY "Allow all" ON "AUCTIONBIDS" FOR ALL USING (true);
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Generate demo data** (optional)
   
   Click the "Generate Demo Data" button in the app to populate with sample auctions and users.

## Project Structure

```
/
├── components/           # React components
│   ├── auth.tsx         # Authentication system
│   ├── marketplace.tsx  # Auction listings
│   ├── investor-dashboard.tsx
│   ├── establishment-dashboard.tsx
│   └── demo-data-generator.tsx
├── lib/
│   ├── supabase.ts      # Supabase client & types
│   └── database.ts      # Database operations
├── styles/
│   └── globals.css      # Tailwind styles
└── App.tsx             # Main component

```

## Usage

### For Investors
1. Register as an investor
2. Browse active auctions in the marketplace
3. Place bids on invoice NFTs
4. Track your bids in the dashboard

### For Establishments
1. Register as an establishment
2. Create invoice NFT tokens
3. List tokens on auction with expiry dates
4. Monitor bids and sales in your dashboard

## Business Model

- Follows traditional invoice factoring
- Investors purchase invoices at a discount
- Debtors pay face value at maturity
- Investors profit from the spread
- No pre-funding escrow (investors take credit risk)

## Security

- ✅ Never stores private keys
- ✅ Public key-based authentication
- ✅ Row Level Security (RLS) enabled
- ✅ Environment variables for sensitive data
- ⚠️ **Not designed for PII or highly sensitive data**

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

## License

MIT License - feel free to use this project for your own purposes.

---

Built with ❤️ for the XRPL community
