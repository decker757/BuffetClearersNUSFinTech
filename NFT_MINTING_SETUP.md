# NFT Minting Setup Guide

## ✅ Implementation Complete!

The complete 8-step NFT minting flow has been implemented:

### Flow Overview
1. **Invoice created in app** - Debtor establishment fills out Issue Token form
2. **Save invoice data to DB** - Initial record created in Supabase
3. **Generate unique image** - OpenAI DALL-E creates unique artwork based on invoice details
4. **Upload image** - Image saved to Supabase Storage, get `image_link`
5. **Generate metadata JSON** - Standard NFT metadata with invoice attributes
6. **Upload JSON** - Metadata saved to Supabase Storage, get `metadata_uri`
7. **Mint NFT on XRPL** - NFT minted using `metadata_uri`, sell offer created for creditor
8. **Save NFTokenID** - Real XRPL NFTokenID saved back to database

---

## 🔧 Setup Required

### 1. Supabase Storage Bucket

You need to create a storage bucket in Supabase:

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New Bucket**
4. Name it: `nft-assets`
5. Make it **Public** (so NFT images/metadata are accessible)
6. Click **Create bucket**

**Important:** The code expects the bucket to be named `nft-assets`. If you named it something else, update these files:
- `/backend/src/services/storageService.js` (lines with `bucketName = 'nft-assets'`)

### 2. Backend Dependencies

Already installed ✅:
- `openai` - For DALL-E image generation
- `node-fetch` - For downloading images
- `@supabase/supabase-js` - For storage uploads

### 3. Environment Variables

Verify your `/backend/.env` has:
```
OPENAI_API=sk-proj-... (✅ Already set)
SUPABASE_URL=https://... (✅ Already set)
SUPABASE_ANON_KEY=... (✅ Already set)
```

---

## 🚀 How to Use

### For Debtor Establishments (who owe money):

1. Click **"Issue Token"** button in establishment dashboard
2. Fill out the form:
   - **Invoice Number**: e.g., `INV-2026-001`
   - **Face Value**: e.g., `10000` (in RLUSD)
   - **Maturity Date**: When payment is due
   - **Creditor Establishment**: Select from dropdown (only registered establishments shown)
3. Click **"Issue Token"**
4. Wait for the process (takes ~10-30 seconds):
   - ⏳ Generating unique image with AI...
   - ⏳ Uploading to storage...
   - ⏳ Minting NFT on XRPL...
   - ⏳ Creating transfer offer...
5. ✅ Success! NFT is now owned by the creditor establishment

### For Creditor Establishments (who are owed money):

1. Receive the NFT automatically (appears in "Owned Tokens")
2. Can now list it on auction to get immediate liquidity
3. When listed → NFT transfers to platform escrow (future implementation)
4. When auction ends → NFT transfers to winner

---

## 📁 New Files Created

### Backend Services:
- `/backend/src/services/imageService.js` - OpenAI image generation with uniqueness
- `/backend/src/services/metadataService.js` - NFT metadata JSON generation
- `/backend/src/services/storageService.js` - Supabase Storage upload functions
- `/backend/src/services/nftMintingService.js` - XRPL NFT minting and transfer

### Backend Routes & Controllers:
- `/backend/src/controllers/nftController.js` - Main orchestration of 8-step flow
- `/backend/src/routes/nft.js` - `/nft/mint` endpoint

### Frontend Updates:
- `/frontend/components/dashboard/issue-token-modal.tsx` - Now fetches establishments from DB
- `/frontend/lib/api.ts` - Added `mintInvoiceNFT()` function
- `/frontend/components/dashboard/establishment-dashboard.tsx` - Calls backend API

---

## 🎨 Unique Image Generation

Each NFT gets a **unique** AI-generated image by varying:
- **Color palette** - Based on invoice number hash
- **Geometric pattern** - Based on face value
- **Gradient style** - Based on maturity date
- **Accent color** - Based on invoice number

This ensures no two invoice NFTs look the same!

---

## 📊 Metadata Format

```json
{
  "name": "Invoice #INV-2026-001",
  "description": "Tokenized invoice representing a receivable of $10,000 payable at maturity.",
  "image": "https://your-supabase.co/storage/v1/object/public/nft-assets/images/...",
  "attributes": [
    {"trait_type": "Invoice Number", "value": "INV-2026-001"},
    {"trait_type": "Face Value", "value": 10000, "unit": "USD"},
    {"trait_type": "Maturity Date", "value": "2026-04-07"},
    {"trait_type": "Asset Type", "value": "Invoice Receivable"},
    {"trait_type": "Platform", "value": "XRPL Invoice Auction"},
    {"trait_type": "Original Owner", "value": "rABC...", "display_type": "address"},
    {"trait_type": "Current Creditor", "value": "rXYZ...", "display_type": "address"}
  ]
}
```

---

## 🧪 Testing

### Prerequisites:
1. Two establishment accounts registered in your app
2. Backend running: `cd backend && npm run dev`
3. Frontend running: `cd frontend && npm run dev`
4. XRPL Testnet connection active

### Test Flow:
1. Log in as **Establishment A** (debtor)
2. Click "Issue Token"
3. Select **Establishment B** (creditor) from dropdown
4. Fill invoice details
5. Submit and wait for confirmation
6. Log in as **Establishment B**
7. Check "Owned Tokens" - should see the new NFT with:
   - ✅ Unique AI-generated image
   - ✅ Real XRPL NFTokenID
   - ✅ Invoice metadata

---

## ⚠️ Important Notes

### XRPL Wallet Setup
- The **platform wallet** (currently `bakeryWallet`) mints all NFTs
- This wallet must have **XRP** for transaction fees
- Creditor must **accept the sell offer** to fully own the NFT (future implementation)

### Storage Costs
- Each image: ~150 KB
- Each metadata JSON: ~1 KB
- Supabase free tier: 1 GB storage (≈6,500 NFTs)

### OpenAI Costs
- DALL-E 3: ~$0.04 per image (standard quality, 1024x1024)
- Estimate: $4 for 100 invoices

### Recommended Next Steps
1. ✅ Set up Supabase storage bucket
2. 🔄 Test with 2 establishment accounts
3. 🚀 Implement creditor auto-accept offer (so they don't need to manually accept)
4. 🔐 Implement platform escrow transfer when listing on auction
5. 💰 Implement auction settlement and NFT transfer to winner

---

## 🐛 Troubleshooting

### "Failed to upload image"
- Check Supabase storage bucket exists and is named `nft-assets`
- Check bucket is public
- Check Supabase credentials in `.env`

### "OpenAI image generation error"
- Verify `OPENAI_API` key in `.env`
- Check OpenAI account has credits
- Check API key has DALL-E access

### "NFT minting failed"
- Check XRPL testnet connection
- Verify platform wallet has XRP balance
- Check creditor address is valid XRPL address

### "Database error"
- Check Supabase connection
- Verify `NFTOKEN` table exists with correct schema
- Check Row Level Security policies allow inserts

---

## 📚 API Endpoint

```
POST /nft/mint
Authorization: Bearer <JWT_TOKEN>

Body:
{
  "invoiceNumber": "INV-2026-001",
  "faceValue": 10000,
  "maturityDate": "2026-04-07",
  "creditorPublicKey": "rCreditorAddress...",
  "debtorPublicKey": "rDebtorAddress..."
}

Response:
{
  "success": true,
  "message": "Invoice NFT minted and transferred successfully",
  "data": {
    "nftokenId": "000816BE...",
    "imageLink": "https://...",
    "metadataUri": "https://...",
    "mintTxHash": "ABC123...",
    "offerTxHash": "DEF456..."
  }
}
```

---

🎉 **You're all set! Create your first invoice NFT and watch the magic happen!**
