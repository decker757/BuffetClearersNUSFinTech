XRPL Invoice Auction Platform
Turning future payments into tradable on‑chain assets

TL;DR
This MVP demonstrates how the XRP Ledger (XRPL) can be used to tokenize, auction, and settle future payment receivables using native XRPL features such as NFTs, issued tokens, trustlines, wallet‑based authentication, and escrow.

Businesses can convert future invoices into immediate liquidity, while investors acquire payment rights at a discount — with ownership and settlement handled on‑chain.

The Problem
Small and medium businesses frequently wait 30–90 days to receive payment after issuing invoices.
During this period:

Cash flow is constrained

Financing options are centralized and opaque

Settlement lacks transparency

The Idea
We represent a future payment (invoice / receivable) as an NFT on XRPL.

The NFT represents:

the right to receive a fixed payment amount from a specific payer at a future date

This NFT can be auctioned on a marketplace, allowing:

The seller to receive liquidity immediately

The buyer to acquire the future payment right

Settlement to be enforced economically on‑chain when funded

High‑Level Flow
A business mints an Invoice NFT representing a future payment

The NFT is listed for auction on the platform

Investors bid using an issued stable token (XSGD – mock)

The highest bidder pays and receives the NFT

At maturity, settlement is enforced via XRPL escrow (demo flow)

XRPL Features Used
This project is intentionally built using XRPL native primitives, without general‑purpose smart contracts.

1. XRPL NFTs (NFToken)
Each invoice is minted as an NFT

NFT metadata includes:

Invoice ID

Payer organization

Face value

Maturity date

Platform identifier

NFT ownership determines who is entitled to payment

2. Issued Tokens (XSGD – mock)
A mock XSGD issued token is used for bidding and settlement

Demonstrates XRPL’s issued currency model

Enables stable, fiat‑denominated value transfer

3. Trustlines
Participants establish trustlines to the XSGD issuer

Required before receiving issued tokens

Demonstrates XRPL’s permissioned token mechanics

4. XRPL Escrow
Escrow is used to demonstrate on‑chain settlement

Once funded, payment is cryptographically enforced by XRPL

Illustrates how settlement risk can be removed post‑auction

5. Wallet‑Based Authentication
Users authenticate by proving control of an XRPL wallet

No usernames, passwords, or custodial accounts

Authentication uses a cryptographic challenge‑response flow

Architecture Overview
On‑Chain (XRPL = Source of Truth)
NFT existence and ownership

Issued token balances

Escrowed funds

Transaction history

Off‑Chain (Backend = Coordination Layer)
Auction timing and state

NFT discovery index

Wallet authentication

API orchestration

The backend never controls user funds or private keys.

Wallet Authentication Flow
Authentication is wallet‑native, not account‑based.

Client requests a unique challenge message

Client signs the message with their XRPL wallet (client‑side only)

Server verifies the signature against the public address

Server issues a short‑lived JWT for API access

This ensures:

No personal data storage

No password management

No custodial wallet behavior

Setup
Install dependencies
npm install
Configure environment variables
XRPL_NETWORK=wss://s.altnet.rippletest.net:51233
BAKERY_SEED=your_testnet_seed
INVESTOR_SEED=your_testnet_seed
HOTEL_SEED=your_testnet_seed
JWT_SECRET=your_jwt_secret
PORT=6767
(Optional) Generate testnet wallets
node scripts/generateWallets.js
Running the Server
Development
npm run dev
Production
npm start
API Overview (Excerpt)
POST /auth/challenge
Requests a wallet authentication challenge.

POST /auth/verify
Verifies wallet signature and issues a JWT.

Additional endpoints handle:

Invoice NFT minting

Auction coordination

Trustline setup

XRPL transaction orchestration

Scope & Disclaimer
This project is a technical MVP demonstrating receivable tokenization and settlement mechanics.

NFTs represent commercial claims, not legal obligations

The XRP Ledger enforces transactions, not contracts

Legal enforceability would be handled via off‑chain agreements in a production system

The platform facilitates receivable trading, not lending

Why XRPL
XRPL was selected because it provides:

Native NFT support

Built‑in escrow

Issued token mechanics

Fast finality and low transaction fees

These properties make XRPL particularly suitable for payment‑centric financial primitives such as invoices and receivables.