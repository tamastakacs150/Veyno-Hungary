# 🚀 Veyno Webshop – One‑Click Deploy (Render + Vercel)

The backend serves the built SPA, so **one Render Web Service** can host both API and frontend.

## Option A — Single Render service
**Settings**
- Root: `/`
- Build: `npm install && npm run build`
- Start: `npm start`
- Node: 20+

**Env (Render → Environment tab)** – copy from `server/.env.example`:
```
MONGO_URI=
JWT_SECRET=
JWT_EXPIRES_IN=7d
CLIENT_URL=
FRONTEND_URL=
API_URL=
COOKIE_DOMAIN=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# AI + Chat
DEEPSEEK_API_KEY=
RUNWAYML_API_SECRET=
GOOGLE_CLIENT_ID=

# Social
FB_PAGE_ACCESS_TOKEN=
IG_USER_ID=
TIKTOK_ACCESS_TOKEN=

# Storage/CDN
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_BASE=
CDN_PUBLIC_BASE=
```

> The root `start` runs:  
> `node -r dotenv/config server/index.js dotenv_config_path=server/.env`

## Option B — Split (Vercel + Render)
- **Frontend** (Vercel): build `npm ci && npm run build`, output `dist`  
  Set `VITE_API_BASE_URL=https://<your-render-app>.onrender.com`
- **Backend** (Render): build `npm ci`, start `npm start`

## Health Check
- Open `/api/health` → `{ ok: true }`
- Try `/api/rates` for EUR/HUF rates
- Stripe webhook at `/webhook`

## Custom Domain (Cloudflare)
- Add CNAME `@` → your Render hostname
- SSL/TLS: **Full (Strict)**, “Always Use HTTPS”: ON
- Update `.env` URLs to your domain (CLIENT/FRONTEND/API)

## Local Dev
```bash
npm install
npm run dev
npm run build
npm start
```
