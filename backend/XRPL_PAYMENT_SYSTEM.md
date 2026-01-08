# XRPL Payment System Documentation

## Overview

This document explains the XRPL-based payment system for the Invoice NFT Auction platform. The system uses a hybrid approach that keeps bidding off-chain (in the database) while executing payments on-chain using XRPL Checks.

## Architecture

### Hybrid Bidding System

**Off-Chain Bidding (Database)**
- Users place and update bids without blockchain transactions
- Saves transaction fees during active bidding
- Allows instant bid updates and competitive bidding
- Balance is checked before accepting bids to prevent fake bids

**On-Chain Settlement (XRPL)**
- Only winning bids execute blockchain transactions
- Uses XRPL Checks for guaranteed payment
- Automatic payment execution when auction expires
- Cascading fallback to next highest bidder if payment fails

## Payment Flow

### 1. Placing a Bid

```javascript
POST /auctions/:id/bids
{
  "bid_amount": 50000
}
```

**Process:**
1. User submits bid via API (requires JWT authentication)
2. System validates bid meets minimum requirements
3. **RLUSD Balance Check:** System verifies user has sufficient RLUSD balance on XRPL
4. If balance sufficient, bid is stored in database (off-chain)
5. Auction's `current_bid` is updated
6. User can update their bid anytime during the auction

**Key Feature:** Multiple bids can be placed/updated without any blockchain transactions.

### 2. Auction Expiration & Automatic Finalization

**Background Job:**
- Runs every 5 minutes via node-cron scheduler
- Checks for expired auctions with status='active'
- Automatically processes each expired auction

**Finalization Process:**

```
1. Fetch auction with all bids
2. Sort bids by amount (highest first)
3. For each bidder (starting with highest):
   a. Check RLUSD balance (double-check)
   b. Create XRPL Check from bidder to establishment
   c. Attempt to cash the Check
   d. If successful:
      - Transfer NFT to winner
      - Mark auction as 'completed'
      - Store transaction hashes
      - DONE
   e. If cashing fails:
      - Wait 15 minutes (grace period)
      - Retry cashing the Check
      - If retry successful:
        - Transfer NFT to winner
        - Mark auction as 'completed'
        - DONE
      - If retry fails:
        - Cancel the Check
        - Move to next highest bidder
4. If all bidders fail:
   - Mark auction as 'unlisted'
   - Auction no longer appears in marketplace
```

### 3. XRPL Checks Explained

**What is a Check?**
- Post-dated payment instrument on XRPL
- Similar to a paper check
- Sender authorizes payment, recipient cashes it
- Can be cancelled by either party if not cashed

**Why Checks?**
- **Automatic Payment:** Establishment can cash Check without bidder's active participation
- **15-Minute Grace Period:** If Check cashing fails, system waits and retries automatically
- **Guaranteed Funds:** Once created, Check guarantees funds are reserved
- **Fallback Support:** Can easily move to next bidder if current winner's Check fails

**Check Lifecycle:**
```
Bidder                  Establishment
  |                           |
  |-- Create Check --------->|
  |   (authorize payment)     |
  |                           |
  |<----- Cash Check ---------|
  |   (execute payment)       |
  |                           |
  ✓ Payment Complete
```

## Database Schema

### AUCTIONLISTING Table Updates

```sql
-- Auction status tracking
status VARCHAR(20) DEFAULT 'active'  -- 'active', 'completed', 'unlisted'

-- Winner information
winner_address VARCHAR(100)          -- XRPL address of auction winner
final_price DECIMAL(20, 2)           -- Final winning bid amount

-- Timestamps
completed_at TIMESTAMP                -- When auction was successfully completed
unlisted_at TIMESTAMP                 -- When auction was marked unlisted

-- XRPL transaction tracking
xrpl_check_id VARCHAR(100)           -- XRPL Check ID
payment_tx_hash VARCHAR(100)         -- Payment transaction hash
nft_transfer_tx_hash VARCHAR(100)    -- NFT transfer transaction hash
```

### USERS Table (Demo Only)

```sql
wallet_seed VARCHAR(100)  -- Demo only: stores wallet seed for automatic payments
```

**⚠️ PRODUCTION WARNING:**
Never store private keys or seeds in production databases. In production:
- Bidders would create Checks themselves when placing bids
- Or use a secure key management system (HSM, KMS)
- Or require manual transaction signing

## API Endpoints

### Place Bid
```
POST /auctions/:id/bids
Authorization: Bearer <JWT_TOKEN>
Body: { "bid_amount": 50000 }

Response:
{
  "success": true,
  "message": "Bid placed successfully",
  "bid": { ... },
  "new_current_bid": 50000
}
```

### Manual Finalization (Testing)
```
POST /auctions/:id/finalize
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "success": true,
  "status": "completed",
  "message": "Auction completed successfully",
  "details": {
    "winner": "rN7n7otQDd6FczFgLdlqtyMVrn3eQqRvLh",
    "amount": 50000,
    "txHash": "ABC123..."
  }
}
```

### Process All Expired (Testing)
```
POST /auctions/process-expired
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "success": true,
  "message": "Expired auctions processing completed. Check server logs for details."
}
```

## Environment Variables

```env
# XRPL Network
XRPL_NETWORK=wss://s.altnet.rippletest.net:51233

# Establishment wallet (receives payments, transfers NFTs)
ESTABLISHMENT_SEED=sEdVKBkyJYz1UzRy4o1xnZmsvRLeSFZ

# RLUSD Issuer (Ripple's official testnet issuer)
RLUSD_ISSUER=rMxJHQUPgWoAHdR19U5ntByf52KjT3MUr9
```

## Testing the System

### 1. Install Dependencies
```bash
cd backend
npm install node-cron
```

### 2. Run Database Migration
```bash
# Apply the schema changes from migrations/002_add_auction_payment_tracking.sql
# Execute in Supabase SQL editor or via psql
```

### 3. Start Backend
```bash
npm run dev
```

The scheduler will:
- Start automatically on server startup
- Run every 5 minutes
- Process expired auctions automatically
- Log results to console

### 4. Manual Testing

Create an auction that expires in 1 minute:
```bash
POST /auctions
{
  "nftoken_id": "...",
  "face_value": 100000,
  "expiry": "2026-01-08T10:30:00Z",  # 1 minute from now
  "min_bid": 47000
}
```

Place a bid:
```bash
POST /auctions/1/bids
{
  "bid_amount": 50000
}
```

Wait for expiration, then manually trigger:
```bash
POST /auctions/1/finalize
```

Or wait for automatic processing (next 5-minute interval).

## Grace Period Logic

The 15-minute grace period provides time for temporary network issues or insufficient balance situations to resolve:

**Scenario 1: Network Issue**
- Check creation succeeds
- Cashing fails due to network timeout
- System waits 15 minutes
- Retries and succeeds
- Winner gets NFT

**Scenario 2: Temporary Insufficient Balance**
- Bidder had balance when bidding
- Balance drops before finalization
- First cashing attempt fails
- Bidder adds funds during 15-minute grace period
- Retry succeeds
- Winner gets NFT

**Scenario 3: Permanent Failure**
- All attempts fail
- Check is cancelled
- System moves to next highest bidder
- Process repeats

**Scenario 4: All Bidders Fail**
- Every bidder fails payment
- Auction marked as 'unlisted'
- Auction removed from marketplace
- NFT owner can relist manually

## Production Considerations

### Security
1. **Never store private keys in database**
   - Use HSM or secure key management
   - Require user signatures for Checks
   - Implement multi-signature wallets

2. **Rate limiting on finalization endpoints**
   - Prevent abuse of manual finalization
   - Add admin authentication layer

3. **Check expiration handling**
   - XRPL Checks can expire
   - Implement expiration monitoring
   - Auto-cancel expired Checks

### Scalability
1. **Batch processing**
   - Process multiple auctions in parallel
   - Use job queues (Bull, Bee-Queue)
   - Implement retry mechanisms

2. **Database optimization**
   - Index on (status, expiry) for fast queries
   - Archive completed/unlisted auctions
   - Partition by date

### Monitoring
1. **Auction finalization metrics**
   - Success rate
   - Average finalization time
   - Grace period utilization rate

2. **Payment failure tracking**
   - Categorize failure reasons
   - Alert on high failure rates
   - Monitor bidder reliability

3. **XRPL health checks**
   - Network connectivity
   - Transaction confirmation times
   - Check success rates

## Troubleshooting

### Check Creation Fails
- Verify ESTABLISHMENT_SEED is valid
- Check bidder has RLUSD trustline
- Ensure sufficient XRP for transaction fees

### Check Cashing Fails
- Verify bidder has sufficient RLUSD balance
- Check XRPL network connectivity
- Verify Check hasn't been cancelled
- Check establishment wallet has XRP for fees

### Background Job Not Running
- Check console for scheduler startup message
- Verify cron pattern is correct
- Check for process crashes in logs
- Ensure server timezone is UTC

### No Expired Auctions Processed
- Verify auctions have status='active'
- Check expiry timestamps are in past
- Ensure database connection is working
- Check cron schedule interval

## Resources

- [XRPL Checks Documentation](https://xrpl.org/checks.html)
- [RLUSD on Testnet](https://xrpl.org/rlusd-on-the-xrp-ledger.html)
- [node-cron Documentation](https://github.com/node-cron/node-cron)
