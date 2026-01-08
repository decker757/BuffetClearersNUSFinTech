#!/bin/bash

# Buffet Clearers Deployment Helper Script

echo "🚀 Buffet Clearers Deployment Helper"
echo "======================================"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo "✅ Prerequisites installed"
echo ""

# Menu
echo "What would you like to deploy?"
echo "1) Backend to Railway"
echo "2) Frontend to Vercel"
echo "3) Both (recommended for first time)"
echo "4) Exit"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "📦 Deploying Backend to Railway..."
        cd backend
        railway login --browserless
        railway up
        echo ""
        echo "✅ Backend deployed!"
        echo "📝 Don't forget to:"
        echo "   1. Set environment variables in Railway dashboard"
        echo "   2. Generate a public domain"
        echo "   3. Update frontend VITE_API_URL"
        ;;
    2)
        echo ""
        echo "🎨 Deploying Frontend to Vercel..."
        cd frontend

        # Check if .env.production exists
        if [ ! -f ".env.production" ]; then
            echo ""
            echo "⚠️  .env.production not found!"
            echo "Creating from example..."
            cp .env.production.example .env.production
            echo ""
            echo "📝 Please edit frontend/.env.production with your Railway backend URL"
            echo "   Then run this script again."
            exit 1
        fi

        vercel --prod
        echo ""
        echo "✅ Frontend deployed!"
        ;;
    3)
        echo ""
        echo "📦 Deploying Backend to Railway first..."
        cd backend
        railway login
        railway up

        echo ""
        echo "⏸️  Backend deployment complete!"
        echo ""
        read -p "Enter your Railway backend URL (from dashboard): " BACKEND_URL

        cd ../frontend
        echo "VITE_API_URL=$BACKEND_URL" > .env.production
        echo "VITE_RLUSD_ISSUER=r9EMUwedCZFW53NVfw9SNHvKoRWJ8fbgu7" >> .env.production

        echo ""
        echo "🎨 Now deploying Frontend to Vercel..."
        vercel --prod

        echo ""
        echo "✅ Both services deployed!"
        echo ""
        echo "📝 Next steps:"
        echo "   1. Set environment variables in Railway dashboard"
        echo "   2. Update CORS in backend/src/index.js with your Vercel URL"
        echo "   3. Redeploy backend: cd backend && railway up"
        ;;
    4)
        echo "Goodbye! 👋"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📚 For detailed instructions, see DEPLOYMENT.md"
