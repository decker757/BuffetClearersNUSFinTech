# XRPL Invoice Auction Backend

Backend server for XRPL-based invoice auction system with wallet authentication.

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── wallets.js   # XRPL wallet configuration
│   │   └── xrplClient.js # XRPL client connection
│   ├── controllers/     # Request handlers
│   │   └── authController.js # Authentication logic
│   ├── middleware/      # Express middleware
│   │   └── auth.js      # JWT authentication middleware
│   ├── routes/          # API routes
│   │   └── auth.js      # Authentication routes
│   ├── utils/           # Utility functions
│   │   └── challengeStore.js # Challenge storage
│   └── index.js         # Application entry point
├── scripts/             # Utility scripts
│   └── generateWallets.js # Generate testnet wallets
├── test/                # Test files
│   └── testAuth.js      # Authentication test
├── .env                 # Environment variables
└── package.json
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```env
XRPL_NETWORK=wss://s.altnet.rippletest.net:51233
BAKERY_SEED=your_seed_here
INVESTOR_SEED=your_seed_here
HOTEL_SEED=your_seed_here
JWT_SECRET=your_jwt_secret
PORT=6767
```

3. Generate testnet wallets (optional):
```bash
node scripts/generateWallets.js
```

## Running the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Authentication

#### POST /auth/challenge
Request an authentication challenge.

**Request:**
```json
{
  "address": "rJfC9N6qFZjSxP9xKuTsb6xeNfUejqKMk8"
}
```

**Response:**
```json
{
  "challenge": "Verify ownership of rJfC9N6q...\nTimestamp: 1234567890\nNonce: abc123"
}
```

#### POST /auth/verify
Verify signature and receive JWT token.

**Request:**
```json
{
  "address": "rJfC9N6qFZjSxP9xKuTsb6xeNfUejqKMk8",
  "publicKey": "030E2B...",
  "signature": "A7434888..."
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "address": "rJfC9N6qFZjSxP9xKuTsb6xeNfUejqKMk8",
  "message": "Authentication successful"
}
```

### Protected Routes

Use the JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

#### GET /protected
Example protected route.

**Response:**
```json
{
  "message": "This is a protected route",
  "user": {
    "address": "rJfC9N6qFZjSxP9xKuTsb6xeNfUejqKMk8",
    "timestamp": 1767776095922,
    "iat": 1767776095,
    "exp": 1767862495
  }
}
```

## Testing

Run the authentication test:
```bash
npm test
```

## Authentication Flow

1. **Request Challenge**: Client requests a unique challenge message
2. **Sign Challenge**: Client signs the message with their private key (client-side only)
3. **Verify Signature**: Server verifies the signature matches the wallet address
4. **Issue Token**: Server issues a JWT token valid for 24 hours
5. **Access Protected Routes**: Client uses token to access protected endpoints

## Security

- Private keys never leave the client
- Challenges expire after 5 minutes
- One-time use challenges
- JWT tokens expire after 24 hours
- Cryptographic signature verification using XRPL's secp256k1

## Tech Stack

- Node.js with Express
- XRPL (XRP Ledger SDK)
- JWT for session management
- ripple-keypairs for signature verification
