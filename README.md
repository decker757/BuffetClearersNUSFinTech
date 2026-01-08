# RLFactor — XRPL Invoice NFT Auction Platform — Operating on Testnet
**Tokenizing future invoices into tradable on-chain assets**

---

## TL;DR
This MVP demonstrates how the **XRP Ledger (XRPL)** can be used to tokenize, auction, and settle future invoice payments using **native XRPL features** — including NFTs (NFToken), issued tokens (RLUSD-style mock), trustlines and wallet-based authentication.

Businesses convert unpaid invoices into immediate liquidity, while investors acquire future payment rights at a discount — with ownership and settlement transparently handled on-chain.

---

## The Problem
Small and medium businesses often wait **30–90 days** to receive payment after issuing invoices even though they've already delivered goods/services. 

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

1. An establishment mints an **Invoice NFT** on the XRP Ledger representing a real-world accounts receivable with a fixed amount and maturity date.
2. The Invoice NFT is listed on an **on-chain auction marketplace** with a defined bidding period.
3. Investors place bids using an **issued stable token (RLUSD-style, testnet/mock)**, with bids secured via XRPL escrows.
4. At auction close, **delivery-versus-payment (DVP)** is executed: the highest bidder receives the NFT and the seller receives payment.
5. Upon NFT maturity, the **current NFT holder is entitled to receive the underlying payment** from the originating establishment, completing the settlement of the tokenized real-world asset.

---

## Overall Flow Diagram
<img width="2465" height="1346" alt="image" src="https://github.com/user-attachments/assets/62f3c9c1-42b4-4e1f-874f-d3d1bc9d06cc" />

---
## XRPL Features Used
This project is intentionally built using **XRPL native primitives**, without general-purpose smart contracts.
## **Features & XRPL Usage**

Below is a breakdown of RLFactor’s core features and the specific XRPL primitives used to implement each one.

---

### 🧾 **Invoice Real World Asset Tokenization (NFTs)**

- **What it does:**  
  Converts real-world invoices into unique on-chain assets (NFTs) that represent the right to receive future payment.

- **XRPL primitives used:**  
  - `NFTokenMint` (XLS-20 NFTs)

- **How we use it:**  
  Each invoice is minted as an XRPL NFT. The NFT’s URI links to metadata containing the invoice number, face value, maturity date, mintTxHash, issuer, offer index and image. Ownership of the NFT determines who is entitled to payment when the maturity date is reached.

- **Viewing Created NFTs on Dashboard**
  <img width="2458" height="1306" alt="image" src="https://github.com/user-attachments/assets/585bfdca-d1e5-4fa5-a1ff-22a1844ce6aa" />

- **Created NFTs can also be found on Testnet**
  <img width="2244" height="1414" alt="image" src="https://github.com/user-attachments/assets/0bfb446c-2bf8-4608-859a-747190797b6b" />

---

### 🏷️ **Auction-Based Invoice Marketplace**

- **What it does:**  
  Allows invoice NFTs to be listed and auctioned so businesses can access liquidity earlier.

- **XRPL primitives used:**  
  - `NFTokenCreateOffer`  
  - `NFTokenAcceptOffer`

- **How we use it:**
  When an auction starts, the invoice NFT is placed into an on-ledger auction state by creating a sell offer, preventing arbitrary transfers during the bidding period.

  When the auction ends, the winning bid is accepted and ownership of the invoice NFT is transferred on-ledger to the winning bidder. The XRP Ledger records each ownership change, ensuring transparent and auditable provenance.

> Note: For MVP simplicity, the platform temporarily holds NFTs during auctions. This can be replaced with a fully non-custodial flow using XRPL offers in future iterations.

- **Example of NFTs listed on Auction**
  <img width="1328" height="1140" alt="image" src="https://github.com/user-attachments/assets/b1d628ff-5b4b-4015-81b9-9d4de6d3e162" />


---

### 💰 **Issued Token Payments (RLUSD-style)**

- **What it does:**  
  Enables stable-value bidding and settlement for invoice purchases.

- **XRPL primitives used:**  
  - Issued tokens  
  - `TrustSet` (trustlines)  
  - `Payment` transactions (issued currency)

- **How we use it:**  
  Investors bid using an issued stable-value token (RLUSD). Trustlines ensure only approved wallets can hold and transact the token. Payments are settled directly on XRPL.

- **Example of Bid Placement**
  <img width="1237" height="525" alt="image" src="https://github.com/user-attachments/assets/adcd6f9a-d313-44eb-80e2-9994323d9db2" />

---

### 🔐 **Non-Custodial Wallet Authentication**

- **What it does:**  
  Allows users to authenticate and transact without sharing private keys.

- **XRPL primitives used:**  
  - Wallet signature verification (off-ledger cryptographic signing)

- **How we use it:**  
  Users authenticate by signing a challenge with their XRPL wallet to log in. The platform verifies the signature and never stores private keys.

---

### 🔄 **On-Chain Ownership & Payment Entitlement**

- **What it does:**  
  Ensures the current NFT holder is always the party entitled to receive payment at maturity.

- **XRPL primitives used:**  
  - NFT ownership records  
  - Issued token payments

- **How we use it:**  
  At invoice maturity, the debtor sends payment directly in RLUSD to the wallet holding the invoice NFT. No additional contracts or intermediaries are required.

- **Example of outstanding Receivables(tied to owned NFTs) for an Investor Account**
  <img width="1280" height="762" alt="image" src="https://github.com/user-attachments/assets/15b31b86-ab78-4375-9626-e4ab7a8ed5d3" />

---

## Architecture Overview

### On-Chain (XRPL = Source of Truth)
- NFT existence and ownership  
- Issued token balances  
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
- React Framework + TypeScript  
- Tailwind CSS

### Backend
- Supabase (PostgreSQL, RLS)  
- Public-key authentication  
- Javascript (XRPL library)
- Node.js

### Blockchain
- XRP Ledger (XRPL Testnet)  
- NFTs, Issued Tokens, Trustlines 

---

## Setup

### Prerequisites
- Node.js
- Supabase account
- OpenAI API key
- XRPL Test Wallets 

### Installation
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
npm install
```

### Environment Variables (backend)
```env 
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
XRPL_NETWORK=wss://s.altnet.rippletest.net:51233
#+ Wallet Seeds for to create trust lines & transfer RLUSD in 
ESTABLISHMENT_SEED=your_establishment_seed
PLATFORM_WALLET_ADDRESS=your_platform_wallet_address
PLATFORM_WALLET_SEED=your_platform_wallet_seed
PORT=your_chosen_server_port
OPENAI_API=your_openai_api_key
```

### Environment Variables (frontend)
```env 
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_role_key
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
- Browse invoice auctions listings
- Place bids using issued tokens (RLUSD)
- Receive Invoice NFTs
- Receive Payments when Invoice NFTs mature

### Establishments
- Authenticate with XRPL wallet  
- Mint invoice NFTs  
- List invoices for auction  
- Receive immediate liquidity  

---

## Business Model
- Invoice factoring  
- Future receivables sold by Establishments at discount for immediate cash
- Investors earn returns by buying invoices below face value
- Investors receive payment at maturity from Establishment that minted the NFT

---

## Scope & Disclaimer
This is a **technical MVP**.

- NFTs represent economic claims, not legal contracts  
- XRPL enforces transactions, not legal obligations  
- Legal enforceability is out of scope  
- Not a lending platform  

---
