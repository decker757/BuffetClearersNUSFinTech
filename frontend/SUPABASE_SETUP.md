# Supabase Integration Setup Guide

## 🚀 Quick Start

Your application is now fully integrated with Supabase! Follow these steps to connect to your database:

## Step 1: Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (or create a new one)
3. Click on **Settings** (gear icon) in the left sidebar
4. Navigate to **API** section
5. Copy the following credentials:
   - **Project URL**: `https://[your-project-id].supabase.co`
   - **anon/public key**: A long string starting with `eyJ...`

## Step 2: Update Your Configuration

1. Open the file: `/lib/supabase.ts`
2. Replace the placeholder values:

```typescript
const SUPABASE_URL = 'https://[your-project-id].supabase.co'; // Replace this
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Replace this
```

## Step 3: Verify Your Database Schema

Your database should already have the following tables created. If not, you can find the schema in `/database/migration.sql`:

### Tables:
- **USER**: Stores user accounts (public key, username, role)
- **NFTOKEN**: Stores invoice NFTs
- **AUCTIONLISTING**: Stores active auctions
- **AUCTIONBIDS**: Stores all bids placed on auctions

## Step 4: Test the Connection

1. Sign in to the application using a private key
2. Create a new account (onboarding)
3. You should see a success message if the database connection works!

---

## 🎯 What's Already Integrated

### ✅ User Authentication
- Sign in with public key (derived from private key)
- Create new accounts during onboarding
- Separate dashboards for investors and establishments

### ✅ Marketplace
- Browse active auction listings from database
- Real-time bid tracking
- Place bids and update current bid automatically

### ✅ Establishment Dashboard
- Issue new invoice tokens (create NFTs in database)
- List owned tokens on auction
- Track current bids and time remaining
- View issued vs. owned tokens separately

### ✅ Investor Dashboard
- View won auctions (owned NFTs)
- Track active bids with real-time status
- See if you're winning or outbid
- Monitor time remaining on auctions

---

## 📊 Database Functions Available

All database operations are in `/lib/database.ts`:

### User Operations
- `createUser(publicKey, username, role)`
- `getUserByPublicKey(publicKey)`
- `getUserByUsername(username)`
- `getAllUsers()`

### NFToken Operations
- `createNFToken(nftoken)`
- `getNFTokenById(nftoken_id)`
- `getNFTokensByCreator(publicKey)`
- `getNFTokensByOwner(publicKey)`
- `updateNFToken(nftoken_id, updates)`

### Auction Listing Operations
- `createAuctionListing(listing)`
- `getAuctionListingById(aid)`
- `getAllAuctionListings()`
- `getActiveAuctionListings()`
- `getAuctionListingsByCreator(publicKey)`
- `updateAuctionListing(aid, updates)`

### Auction Bids Operations
- `placeBid(aid, bid_amount, bid_by)` - Automatically updates current_bid
- `getBidsByAuction(aid)`
- `getBidsByUser(publicKey)`
- `getHighestBidForAuction(aid)`

### Real-time Subscriptions
- `subscribeToAuctionListings(callback)`
- `subscribeToAuctionBids(callback)`
- `subscribeToNFTokens(callback)`

---

## 🔐 Security Notes

### ✅ Secure Practices Implemented:
- Public keys used as primary identifiers
- Private keys NEVER stored in database
- Anon key is safe to use in frontend (with RLS enabled)
- All sensitive operations should use Row Level Security (RLS)

### 🛡️ Recommended: Enable Row Level Security

Add these policies to your Supabase tables:

#### USER Table
```sql
-- Allow users to read all users
CREATE POLICY "Users can view all users"
ON public.USER FOR SELECT
TO authenticated, anon
USING (true);

-- Allow users to insert their own account
CREATE POLICY "Users can create their own account"
ON public.USER FOR INSERT
TO authenticated, anon
WITH CHECK (true);
```

#### NFTOKEN Table
```sql
-- Allow anyone to view NFTokens
CREATE POLICY "Anyone can view NFTokens"
ON public.NFTOKEN FOR SELECT
TO authenticated, anon
USING (true);

-- Allow users to create NFTokens they own
CREATE POLICY "Users can create NFTokens"
ON public.NFTOKEN FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Allow users to update NFTokens they created or own
CREATE POLICY "Users can update their NFTokens"
ON public.NFTOKEN FOR UPDATE
TO authenticated, anon
USING (created_by = current_setting('request.jwt.claims', true)::json->>'sub' 
    OR current_owner = current_setting('request.jwt.claims', true)::json->>'sub');
```

#### AUCTIONLISTING Table
```sql
-- Allow anyone to view auction listings
CREATE POLICY "Anyone can view auction listings"
ON public.AUCTIONLISTING FOR SELECT
TO authenticated, anon
USING (true);

-- Allow users to create auction listings
CREATE POLICY "Users can create auction listings"
ON public.AUCTIONLISTING FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Allow system to update auction listings (for current_bid updates)
CREATE POLICY "System can update auction listings"
ON public.AUCTIONLISTING FOR UPDATE
TO authenticated, anon
USING (true);
```

#### AUCTIONBIDS Table
```sql
-- Allow anyone to view bids
CREATE POLICY "Anyone can view bids"
ON public.AUCTIONBIDS FOR SELECT
TO authenticated, anon
USING (true);

-- Allow users to place bids
CREATE POLICY "Users can place bids"
ON public.AUCTIONBIDS FOR INSERT
TO authenticated, anon
WITH CHECK (true);
```

---

## 🐛 Troubleshooting

### Error: "Failed to sign in. Please check your database connection."
- **Solution**: Check that you've updated `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `/lib/supabase.ts`
- Verify your Supabase project is running

### Error: "Failed to create account"
- **Solution**: Check the browser console for detailed error messages
- Verify the USER table exists in your database
- Make sure Row Level Security policies allow inserts

### No auctions showing in marketplace
- **Solution**: Create some test data in your NFTOKEN and AUCTIONLISTING tables
- Or use the Establishment dashboard to issue and list tokens

### Can't place bids
- **Solution**: Check that AUCTIONBIDS table exists
- Verify you're signed in as an investor (not establishment)
- Make sure your bid is higher than the current bid

---

## 🎨 Next Steps

Now that Supabase is integrated, you can:

1. ✅ Test the full user flow from sign up to placing bids
2. ✅ Create test data to populate the marketplace
3. ✅ Monitor real-time updates as users interact with auctions
4. ✅ Add more features like:
   - Email notifications when outbid
   - Automatic auction completion
   - Payment integration with XRPL
   - Analytics dashboard

---

## 📞 Need Help?

- **Supabase Documentation**: https://supabase.com/docs
- **Database Schema**: Check `/database/migration.sql`
- **API Functions**: Review `/lib/database.ts`

Happy building! 🚀
