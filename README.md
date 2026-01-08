# XRPL Invoice NFT Auction Platform -- Operating on Testnet
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

Below is a breakdown of InvoiceNFT’s core features and the specific XRPL primitives used to implement each one.

---

### 🧾 **Invoice Tokenization (NFTs)**

- **What it does:**  
  Converts real-world invoices into unique on-chain assets that represent the right to receive future payment.

- **XRPL primitives used:**  
  - `NFTokenMint` (XLS-20 NFTs)

- **How we use it:**  
  Each invoice is minted as an XRPL NFT. The NFT’s URI links to metadata containing the invoice number, face value, maturity date, and image. Ownership of the NFT determines who is entitled to payment.

---

### 🏷️ **Auction-Based Invoice Marketplace**

- **What it does:**  
  Allows invoice NFTs to be listed and auctioned so businesses can access liquidity earlier.

- **XRPL primitives used:**  
  - `NFTokenCreateOffer`  
  - `NFTokenAcceptOffer`

- **How we use it:**  
  When an auction ends, ownership of the invoice NFT is transferred on-ledger to the winning bidder. The ledger records the ownership change, ensuring transparent and auditable provenance.

---

### 💰 **Issued Token Payments (RLUSD-style)**

- **What it does:**  
  Enables stable-value bidding and settlement for invoice purchases.

- **XRPL primitives used:**  
  - Issued tokens  
  - `TrustSet` (trustlines)  
  - `Payment` transactions (issued currency)

- **How we use it:**  
  Investors bid using an issued stable-value token. Trustlines ensure only approved wallets can hold and transact the token. Payments are settled directly on XRPL.

---

### 🔐 **Non-Custodial Wallet Authentication**

- **What it does:**  
  Allows users to authenticate and transact without sharing private keys.

- **XRPL primitives used:**  
  - Wallet signature verification (off-ledger cryptographic signing)

- **How we use it:**  
  Users authenticate by signing a challenge with their XRPL wallet. The platform verifies the signature and never stores private keys.

---

### 🔄 **On-Chain Ownership & Payment Entitlement**

- **What it does:**  
  Ensures the current NFT holder is always the party entitled to receive payment at maturity.

- **XRPL primitives used:**  
  - NFT ownership records  
  - Issued token payments

- **How we use it:**  
  At invoice maturity, the debtor sends payment directly to the wallet holding the invoice NFT. No additional contracts or intermediaries are required.

---

### ⏳ **Escrow-Based Settlement (Designed / Optional)**

- **What it does:**  
  Prevents unpaid winning bids and enforces settlement guarantees.

- **XRPL primitives used:**  
  - `EscrowCreate`  
  - `EscrowFinish`  
  - `EscrowCancel`

- **How we use it:**  
  The system is designed so winning bidders can be required to lock funds in escrow. If settlement conditions are met, escrow is released; otherwise, it is cancelled and the next valid bidder can be selected.

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
