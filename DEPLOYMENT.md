# Deployment Guide

This guide walks you through deploying the Buffet Clearers application with:
- **Frontend** on Vercel
- **Backend** on Railway

## Prerequisites

- GitHub account
- Vercel account (sign up at https://vercel.com)
- Railway account (sign up at https://railway.app)
- Your Supabase credentials

---

## Part 1: Deploy Backend to Railway

### 1.1 Install Railway CLI

```bash
npm install -g @railway/cli
```

### 1.2 Login to Railway

```bash
railway login
```

This will open your browser to authenticate.

### 1.3 Initialize Railway Project

```bash
cd backend
railway init
```

- Select "Create a new project"
- Give it a name: `buffet-clearers-backend`

### 1.4 Add Environment Variables

Run these commands to set environment variables:

```bash
railway variables set SUPABASE_URL=your_supabase_url
railway variables set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
railway variables set JWT_SECRET=your_random_secret
railway variables set PLATFORM_WALLET_ADDRESS=rJoESWx9ZKHpEyNrLWBTA95XLxwoKJj59u
railway variables set PLATFORM_WALLET_SEED=your_wallet_seed
railway variables set PORT=6767
railway variables set NODE_ENV=production
```

**OR** set them in the Railway dashboard:
1. Go to https://railway.app/dashboard
2. Select your project
3. Go to "Variables" tab
4. Add each variable

### 1.5 Deploy Backend

```bash
railway up
```

Wait for deployment to complete. You'll get a URL like:
`https://buffet-clearers-backend-production-xxxx.up.railway.app`

### 1.6 Enable Public Domain

1. Go to Railway dashboard
2. Click on your service
3. Go to "Settings" tab
4. Under "Networking", click "Generate Domain"
5. Copy the generated URL (you'll need this for frontend)

---

## Part 2: Deploy Frontend to Vercel

### 2.1 Update Frontend Environment Variables

First, create a `.env.production` file in the `frontend` folder:

```bash
cd ../frontend
```

Create `.env.production`:
```
VITE_API_URL=https://your-railway-backend-url.up.railway.app
VITE_RLUSD_ISSUER=r9EMUwedCZFW53NVfw9SNHvKoRWJ8fbgu7
```

Replace `your-railway-backend-url.up.railway.app` with your actual Railway URL.

### 2.2 Install Vercel CLI

```bash
npm install -g vercel
```

### 2.3 Deploy to Vercel

```bash
vercel
```

Follow the prompts:
- **Set up and deploy?** Y
- **Which scope?** (Choose your account)
- **Link to existing project?** N (first time)
- **Project name?** buffet-clearers-frontend
- **In which directory is your code located?** ./
- **Want to modify settings?** N

### 2.4 Add Environment Variables to Vercel

After first deployment:

```bash
vercel env add VITE_API_URL production
# Enter your Railway backend URL when prompted

vercel env add VITE_RLUSD_ISSUER production
# Enter: r9EMUwedCZFW53NVfw9SNHvKoRWJ8fbgu7
```

### 2.5 Redeploy with Environment Variables

```bash
vercel --prod
```

---

## Part 3: Update Backend CORS

Your backend needs to allow requests from your Vercel domain.

1. Go to `backend/src/index.js`
2. Update CORS configuration to include your Vercel URL:

```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://your-vercel-app.vercel.app'  // Add your Vercel URL
];
```

3. Commit and push changes
4. Redeploy backend: `railway up`

---

## Part 4: Database Migrations

Make sure all migrations are run on your production Supabase:

1. Go to Supabase Dashboard
2. Open SQL Editor
3. Run migrations in order:
   - `001_initial_schema.sql`
   - `002_auction_system.sql`
   - `003_escrow_system_complete.sql`
   - `004_switch_to_checks_system.sql`
   - `005_maturity_payment_system.sql`
   - `006_auction_improvements.sql`
   - `007_direct_payment_system.sql`
   - `008_add_completed_status.sql`

---

## Verification

### Backend Health Check
Visit: `https://your-railway-url.up.railway.app/`

Should return: `{"message":"Buffet Clearers API is running"}`

### Frontend
Visit: `https://your-vercel-url.vercel.app`

Should load the application.

### Test Authentication
Try logging in with an XRPL wallet to ensure backend connection works.

---

## Auto-Deploy on Git Push

### For Railway (Backend):
1. Go to Railway dashboard
2. Connect your GitHub repository
3. Future `git push` to main branch will auto-deploy

### For Vercel (Frontend):
Vercel automatically sets up GitHub integration.
Every push to main will trigger a deployment.

---

## Troubleshooting

### Backend not responding
- Check Railway logs: `railway logs`
- Verify environment variables are set
- Check Supabase connection

### Frontend can't reach backend
- Verify CORS is configured correctly
- Check VITE_API_URL is set correctly
- Check browser console for errors

### Scheduler not running
- Check Railway logs for cron job output
- Verify the scheduler is starting (check logs for "Auction finalization scheduler started")

---

## Cost Estimate

- **Railway**: ~$5-10/month (with usage)
- **Vercel**: Free tier (sufficient for this project)
- **Supabase**: Free tier (sufficient for development)

**Total**: ~$5-10/month
