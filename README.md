# Creatrix 🎯
**Turn your content into your income.**

AI creator monetization platform — connects YouTube, TikTok, Instagram, X and tells creators exactly how to earn more.

## Stack
- Node.js + Express
- PostgreSQL (Neon)
- Passport.js (Google OAuth, GitHub OAuth, Magic Link)
- Stripe (subscriptions)
- Resend (email)
- Claude AI (recommendations)
- Railway (hosting)

## Deploy to Railway in 5 minutes

```bash
# 1. Clone
git clone https://github.com/BermudaLocals/creatrix.git
cd creatrix

# 2. Install Railway CLI
npm install -g @railway/cli

# 3. Login
railway login

# 4. Create project
railway init    # name: creatrix

# 5. Add env vars (see .env.example)
railway variables set ANTHROPIC_API_KEY=sk-ant-...
railway variables set DATABASE_URL=postgresql://...
railway variables set SESSION_SECRET=$(openssl rand -base64 32)
railway variables set STRIPE_SECRET_KEY=sk_live_...
railway variables set STRIPE_WEBHOOK_SECRET=whsec_...
railway variables set GOOGLE_CLIENT_ID=...
railway variables set GOOGLE_CLIENT_SECRET=...
railway variables set GITHUB_CLIENT_ID=...
railway variables set GITHUB_CLIENT_SECRET=...
railway variables set RESEND_API_KEY=re_...
railway variables set APP_URL=https://creatrix.up.railway.app
railway variables set NODE_ENV=production

# 6. Deploy
railway up

# 7. Get your URL
railway open
```

## Local Development

```bash
cp .env.example .env
# Fill in .env values
npm install
npm run dev
```

## Stripe Webhook

After deploying, add webhook in Stripe Dashboard:
- URL: `https://your-domain/api/payments/webhook`
- Events: checkout.session.completed, customer.subscription.deleted, invoice.payment_failed

## OAuth Redirect URLs

**Google:** `https://your-domain/auth/google/callback`  
**GitHub:** `https://your-domain/auth/github/callback`

---
Built in Bermuda 🇧🇲 · Dollar Double Empire
