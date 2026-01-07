# XRPL Invoice NFT Auction Platform
**Tokenizing future invoices into tradable on-chain assets**

---

## TL;DR
This MVP demonstrates how the **XRP Ledger (XRPL)** can be used to tokenize, auction, and settle future invoice payments using **native XRPL features only** — including NFTs (NFToken), issued tokens (RLUSD-style mock), trustlines, wallet-based authentication, and escrow.

Businesses convert unpaid invoices into immediate liquidity, while investors acquire future payment rights at a discount — with ownership and settlement transparently handled on-chain.

---

## The Problem
Small and medium businesses often wait **30–90 days** to receive payment after issuing invoices.

During this period:
- Cash flow is constrained  
- Financing options are centralized and opaque  
- Settlement lacks transparency  

---

## The Idea
A **future payment (invoice / receivable)** is represented as an **NFT on XRPL**.

The NFT represents:
- The right to receive a **fixed payment amount**
- From a **specific payer**
- At a **future maturity date**

This NFT can be auctioned on a marketplace, allowing:
- Sellers to receive liquidity immediately  
- Investors to acquire future payment rights  
- Settlement to be enforced economically on-chain once funded  

This follows the **invoice factoring** economic model, implemented using XRPL primitives.

---

## High-Level Flow
1. An establishment mints an **Invoice NFT** representing a future payment  
2. The NFT is listed on an **auction marketplace** with a defined expiry  
3. Investors place bids using an **issued stable token** (RLUSD-style, testnet/mock)  
4. At auction close, **payment and NFT transfer are coordinated** (DVP-style)  
5. Post-auction, the payer may **fund escrow** to guarantee settlement (demo flow)  

---

## XRPL Features Used
This project is intentionally built using **XRPL native primitives**, without general-purpose smart contracts.

### XRPL Primitives
- NFTs (`NFToken`)
- Issued Tokens (RLUSD-style mock)
- Trustlines
- Escrow
- Wallet-based authentication

---

## XRPL Transactions Used
- `NFTokenMint`
- `TrustSet`
- `Payment`
- `EscrowCreate`
- `EscrowFinish`

---

## Architecture Overview

### On-Chain (XRPL = Source of Truth)
- NFT existence and ownership  
- Issued token balances  
- Escrowed funds  
- Transaction history  

### Off-Chain (Application & Backend)
- Auction timing and expiry  
- Marketplace listings  
- Wallet authentication  
- Role-based dashboards  
- Coordination of XRPL transactions  

**Private keys are never stored or transmitted.**

---

## Wallet Authentication Flow
1. Client requests a unique challenge  
2. Client signs it using an XRPL wallet (client-side)  
3. Server verifies signature  
4. Server issues short-lived JWT  

No passwords. No custody. No personal data.

---

## Tech Stack

### Frontend
- React + TypeScript  
- Tailwind CSS v4  

### Backend
- Supabase (PostgreSQL, RLS)  
- Public-key authentication  
- Auction indexing  

### Blockchain
- XRP Ledger (XRPL Testnet)  
- NFTs, Issued Tokens, Trustlines, Escrow  

---

## Setup

### Prerequisites
- Node.js 16+  
- Supabase account  

### Installation
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
npm install
```

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
XRPL_NETWORK=wss://s.altnet.rippletest.net:51233
```

---

## Database Schema
```sql
CREATE TABLE "USER" (
  publicKey TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('investor', 'establishment')) NOT NULL
);

CREATE TABLE "NFTOKEN" (
  nftoken_id TEXT PRIMARY KEY,
  created_by TEXT REFERENCES "USER"(publicKey),
  invoice_number TEXT,
  face_value NUMERIC,
  maturity_date TIMESTAMP,
  current_owner TEXT REFERENCES "USER"(publicKey),
  platform TEXT
);

CREATE TABLE "AUCTIONLISTING" (
  aid SERIAL PRIMARY KEY,
  nftoken_id TEXT REFERENCES "NFTOKEN"(nftoken_id),
  expiry TIMESTAMP,
  min_bid NUMERIC,
  current_bid NUMERIC,
  status TEXT DEFAULT 'OPEN'
);

CREATE TABLE "AUCTIONBIDS" (
  bid_id SERIAL PRIMARY KEY,
  aid INTEGER REFERENCES "AUCTIONLISTING"(aid),
  bid_amount NUMERIC,
  bid_by TEXT REFERENCES "USER"(publicKey),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Running the App
```bash
npm run dev
```

---

## Usage

### Investors
- Authenticate with XRPL wallet  
- Browse invoice auctions  
- Place bids using issued tokens  
- Receive Invoice NFTs  

### Establishments
- Authenticate with XRPL wallet  
- Mint invoice NFTs  
- List invoices for auction  
- Receive immediate liquidity  

---

## Business Model
- Invoice factoring  
- Future receivables sold at discount  
- Investors receive payment at maturity  

Returns are **not guaranteed**.  
Credit risk exists until escrow is funded.

---

## Scope & Disclaimer
This is a **technical MVP**.

- NFTs represent economic claims, not legal contracts  
- XRPL enforces transactions, not legal obligations  
- Legal enforceability is out of scope  
- Not a lending platform  

---
