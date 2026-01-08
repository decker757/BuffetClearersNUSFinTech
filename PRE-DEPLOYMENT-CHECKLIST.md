# Pre-Deployment Checklist

Before deploying, make sure you have all the necessary information ready.

## ✅ Required Information

### Supabase
- [ ] Supabase Project URL
  - Found in: Supabase Dashboard → Settings → API
  - Format: `https://xxxxx.supabase.co`
- [ ] Supabase Service Role Key
  - Found in: Supabase Dashboard → Settings → API → service_role (secret)
  - **⚠️ NEVER commit this to Git!**

### XRPL Platform Wallet
- [ ] Platform Wallet Address
  - Current: `rJoESWx9ZKHpEyNrLWBTA95XLxwoKJj59u`
- [ ] Platform Wallet Seed
  - Get from your XRPL wallet backup
  - **⚠️ NEVER commit this to Git!**

### JWT Secret
- [ ] Generate a random JWT secret
  - Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - Copy the output

## ✅ Accounts Needed

- [ ] GitHub account (for version control)
- [ ] Railway account (sign up at https://railway.app)
- [ ] Vercel account (sign up at https://vercel.com)

## ✅ Database Setup

- [ ] All migrations run on production Supabase
  - Check by running a query: `SELECT * FROM "USER" LIMIT 1;`
  - If error, run migrations from `backend/migrations/` folder in order

- [ ] Migration 008 applied (for maturity payments)
  - Run: `backend/migrations/008_add_completed_status.sql`

## ✅ Code Ready

- [ ] Latest changes committed to Git
  ```bash
  git add .
  git commit -m "Prepare for deployment"
  git push origin main
  ```

- [ ] No .env files in Git
  ```bash
  # Check:
  git ls-files | grep .env
  # Should return nothing or only .env.example files
  ```

## ✅ Local Testing

- [ ] Backend runs locally without errors
  ```bash
  cd backend
  npm install
  npm start
  # Should see: "Server is running on port 6767"
  ```

- [ ] Frontend runs locally without errors
  ```bash
  cd frontend
  npm install
  npm run dev
  # Should open browser to http://localhost:5173
  ```

- [ ] Can login with XRPL wallet
- [ ] Can create auction
- [ ] Can place bid

## 🚀 Ready to Deploy?

If all boxes are checked above, you're ready!

### Quick Start Deployment

```bash
# Option 1: Use helper script
./deploy.sh

# Option 2: Manual deployment
# Follow step-by-step guide in DEPLOYMENT.md
```

## 📝 Post-Deployment Tasks

After deployment, remember to:

1. **Update CORS in backend**
   - Add your Vercel URL to allowed origins
   - Redeploy backend

2. **Test production deployment**
   - Visit your Vercel URL
   - Try logging in
   - Test all features

3. **Monitor logs**
   - Railway: `railway logs`
   - Vercel: Check dashboard

4. **Set up custom domain** (optional)
   - Railway: Settings → Networking → Custom Domain
   - Vercel: Settings → Domains

## 🆘 Need Help?

- Railway docs: https://docs.railway.app
- Vercel docs: https://vercel.com/docs
- Supabase docs: https://supabase.com/docs

## 💰 Cost Overview

**Free Tier:**
- Vercel: Free (includes 100GB bandwidth, unlimited sites)
- Supabase: Free (includes 500MB database, 1GB file storage)

**Paid:**
- Railway: Starts at $5/month (includes $5 credit, pay for what you use)

**Expected Monthly Cost: ~$5-10**
