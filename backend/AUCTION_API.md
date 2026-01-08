# Auction API Documentation

Backend API for XRPL Invoice NFT Auction Platform.

## Base URL
```
http://localhost:6767
```

## Endpoints

### 1. Get Active Auctions
**GET** `/auctions`

Get all active auctions (not expired).

**No authentication required**

**Response:**
```json
{
  "success": true,
  "auctions": [
    {
      "aid": 1,
      "nftoken_id": "NFT00001ACME2024INV001",
      "face_value": 50000,
      "expiry": "2026-01-14T14:41:32.994",
      "min_bid": 45000,
      "current_bid": 47000,
      "time_created": "2026-01-07T14:41:34.184709+00:00",
      "NFTOKEN": {
        "invoice_number": "INV-2024-001",
        "image_link": "https://...",
        "maturity_date": "2025-03-15T00:00:00"
      }
    }
  ]
}
```

---

### 2. Get Auction by ID
**GET** `/auctions/:id`

Get a specific auction by auction ID.

**No authentication required**

**Response:**
```json
{
  "success": true,
  "auction": {
    "aid": 1,
    "nftoken_id": "NFT00001ACME2024INV001",
    "face_value": 50000,
    "expiry": "2026-01-14T14:41:32.994",
    "min_bid": 45000,
    "current_bid": 47000,
    "NFTOKEN": { ... }
  }
}
```

---

### 3. Get Auction Bids
**GET** `/auctions/:id/bids`

Get all bids for a specific auction.

**No authentication required**

**Response:**
```json
{
  "success": true,
  "bids": [
    {
      "bid_id": 1,
      "aid": 1,
      "bid_amount": 47000,
      "bid_by": "rJfC9N6qFZjSxP9xKuTsb6xeNfUejqKMk8",
      "created_at": "2026-01-07T15:00:00+00:00"
    }
  ]
}
```

---

### 4. Create Auction
**POST** `/auctions`

Create a new auction listing.

**Authentication required** (JWT token in Authorization header)

**Request Body:**
```json
{
  "nftoken_id": "NFT00001ACME2024INV001",
  "face_value": 50000,
  "expiry": "2026-01-14T14:41:32.994",
  "min_bid": 45000
}
```

**Response:**
```json
{
  "success": true,
  "auction": {
    "aid": 1,
    "nftoken_id": "NFT00001ACME2024INV001",
    "face_value": 50000,
    "expiry": "2026-01-14T14:41:32.994",
    "min_bid": 45000,
    "current_bid": 45000,
    "time_created": "2026-01-07T14:41:34.184709+00:00"
  }
}
```

**Validation:**
- All fields are required
- Expiry must be in the future
- Returns 400 if validation fails

---

### 5. Place Bid
**POST** `/auctions/:id/bids`

Place a bid on an auction.

**Authentication required** (JWT token in Authorization header)

**Request Body:**
```json
{
  "bid_amount": 47000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bid placed successfully",
  "bid": {
    "bid_id": 1,
    "aid": 1,
    "bid_amount": 47000,
    "bid_by": "rJfC9N6qFZjSxP9xKuTsb6xeNfUejqKMk8",
    "created_at": "2026-01-07T15:00:00+00:00"
  },
  "new_current_bid": 47000
}
```

**Validation:**
- Bid must be greater than `current_bid`
- Bid must be at least `min_bid`
- Auction must not be expired
- Returns 400 if validation fails

**TODO for XRPL Integration:**
- Line 247: Check if user has sufficient RLUSD balance
- Line 280: Trigger XRPL payment (Investor → Bakery)

---

### 6. Get User Bids
**GET** `/user/bids`

Get all bids placed by the authenticated user.

**Authentication required** (JWT token in Authorization header)

**Response:**
```json
{
  "success": true,
  "bids": [
    {
      "bid_id": 1,
      "aid": 1,
      "bid_amount": 47000,
      "bid_by": "rJfC9N6qFZjSxP9xKuTsb6xeNfUejqKMk8",
      "created_at": "2026-01-07T15:00:00+00:00",
      "AUCTIONLISTING": {
        "aid": 1,
        "face_value": 50000,
        "expiry": "2026-01-14T14:41:32.994",
        "current_bid": 47000,
        "NFTOKEN": {
          "invoice_number": "INV-2024-001",
          "image_link": "https://..."
        }
      }
    }
  ]
}
```

---

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

To get a token:
1. **POST** `/auth/challenge` with `{ "address": "your_xrpl_address" }`
2. Sign the challenge message with your private key
3. **POST** `/auth/verify` with signature to receive JWT token

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message here"
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not Found
- `500` - Internal Server Error

---

## Testing

Run the test suite:
```bash
npm test  # Runs auth tests
node test/testAuction.js  # Runs auction tests
```

---

## Integration Points for XRPL

Your friend handling XRPL integration needs to add:

1. **Balance Check** in `placeBid()` ([auctionController.js:247](backend/src/controllers/auctionController.js#L247))
   - Verify investor has sufficient RLUSD balance
   - Return error if insufficient funds

2. **Payment Execution** in `placeBid()` ([auctionController.js:280](backend/src/controllers/auctionController.js#L280))
   - Transfer RLUSD from Investor to Bakery
   - Handle transaction success/failure
   - Rollback bid if payment fails

3. **Future: Auction Finalization**
   - Determine winning bidder when auction expires
   - Transfer NFT ownership to winner
   - Mark auction as completed