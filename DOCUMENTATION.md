# 🏷️ Veyno Webshop – Full Documentation (FEATURE-COMPLETE)

## Overview
**Veyno Webshop** is a fully custom full‑stack e‑commerce platform with a React (Vite + Tailwind + TypeScript) frontend and a Node.js (Express + MongoDB) backend. It ships with:
- Customer storefront
- Admin dashboard
- Authentication (JWT)
- Cart, Favorites, Orders
- Coupons & Discounts
- Stripe checkout + Webhook
- Newsletter engine (templates, logs, subscribe/unsubscribe + 1×1 tracking GIF)
- Email automation (welcome, order, custom campaigns)
- AI Chat Assistant (DeepSeek proxy)
- AI Marketing Assistant (Google GenAI + RunwayML image/video, plus social publishing)
- Social publisher (Instagram Graph API, TikTok)
- Currency rates endpoint
- Image processing & CDN/S3 upload helpers

The backend also serves the built SPA (`client/dist`), so a **single web service** can host everything.

---

## Tech Stack
- **Frontend:** React 19, Vite, Tailwind CSS, TypeScript
- **Backend:** Node.js 20+, Express 5, Mongoose, Helmet, CORS, Rate limiting
- **Auth:** JWT (cookies or Bearer supported)
- **DB:** MongoDB (Atlas recommended), Mongoose models
- **Payments:** Stripe Checkout + webhook (`/webhook`)
- **Emails:** Nodemailer + templating; tracking pixel for newsletters
- **AI:** Google Generative AI, RunwayML API
- **Chatbot:** DeepSeek Chat proxy at `/api/chat`
- **Social:** Instagram Graph API, TikTok publish/status webhooks
- **Storage/CDN:** S3‑compatible (R2/S3) via AWS SDK; optional CDN base
- **Build/Dev:** Workspaces (`client` + `server`), Vite, concurrently

---

## Folder Structure
```
veyno/
├─ client/                     # React + Vite + Tailwind + TS
│  ├─ src/
│  │  ├─ pages/                # e.g., Cart, Checkout, Account, Favorites, Chatbot, Verify, etc.
│  │  ├─ components/
│  │  │  └─ admin/             # AdminDashboard, ProductsManager, OrdersManager, SalesManager,
│  │  │                         # CustomerEmails, AiMarketingAssistant
│  │  ├─ context/              # CartContext, CurrencyContext
│  │  ├─ utils/                # api.js, resolveImg.js, toast.js, rates.js
│  │  └─ styles/               # CSS for admin/marketing/chatbot/etc.
│  ├─ dist/                    # Production build
│  └─ vite.config.js
│
├─ server/
│  ├─ index.js                 # App entry; serves client/dist; mounts routes; webhook; health
│  ├─ routes/
│  │  ├─ admin.js              # Admin CRUD + uploads, coupons, emails, contact replies
│  │  ├─ auth.js               # Register, login, verify, reset
│  │  ├─ cart.js               # Public cart by username + authed cart ops
│  │  ├─ checkout.js           # Coupon validate
│  │  ├─ favorites.js          # Toggle & list favorites (auth)
│  │  ├─ newsletter.js         # subscribe/list/preview/send/send-file/unsubscribe + pixel
│  │  ├─ social.js             # Publish to IG/TikTok, status + webhook
│  │  ├─ aiMarketing.js        # Gen text/image, Runway video start/status
│  │  └─ rates.js              # USD→EUR/HUF frankfurter API with fallback
│  ├─ controllers/
│  │  ├─ aiMarketingController.js
│  │  └─ newsletterController.js
│  ├─ middleware/
│  │  ├─ auth.js               # authMiddleware
│  │  └─ requireAdmin.js
│  ├─ models/                  # User, Product, Order, Coupon, Newsletter(+Log), EmailLog, ContactMessage
│  ├─ services/                # imagePrep, upload (S3/R2), instagram, tiktok
│  ├─ mailer/                  # mailer.js (welcome/newsletter/custom builders)
│  ├─ scripts/                 # seeders & helpers (seedProducts, set-sale, clear-sale, CreateProduct, etc.)
│  └─ .env.example             # example environment variables
│
├─ DOCUMENTATION.md
├─ README-DEPLOY.md
└─ render.yaml
```

---

## Frontend Features (client/)
### Pages
- **Home / Catalog / Product detail**
- **Cart (`/cart`)** – quantity, remove, totals
- **Checkout** – success screen (`/checkout/success`)
- **Account (`/account`)** – profile + order history (auth)
- **Auth** – register/login, reset password, email verification flow (`/verify`, `/verify-wait`)
- **Favorites (`/favorites`)** – saved items (auth)
- **Newsletter unsubscribe success** page
- **Chatbot (`/chat`)** – AI assistant widget + floating opener

### Components
- Admin widgets: **AdminDashboard**, **ProductsManager**, **OrdersManager**, **SalesManager**, **CustomerEmails**, **AiMarketingAssistant**
- UI: filters, sidebar, search, currency selector, stars, consent banner, toast, etc.
- Context: **CartContext**, **CurrencyContext**
- Utils: `api` wrapper, image resolution helper, currency rates helper

### AI Chatbot (client)
- Floating chat widget with greeting, history, typing indicator, minimize/close confirmation
- Calls **`POST /api/chat`** with `{ messages: [{role, content}, ...] }`
- Displays assistant replies; handles error states gracefully

---

## Backend Features (server/)

### Auth (`/api/auth/*`)
- `POST /register` – name/email/password, basic validation
- `POST /login` – JWT issue; cookie/Bearer supported
- Email verification workflow (mailer utility)
- Optional Google OAuth client ID support (env)
- Password reset endpoints (client pages included)

### Products & Media (admin)
- **Create/Update/Delete products** with:
  - name, description, price, category, images
  - **variants** (sizes) + stock aggregation
  - **currentSale** object (type `percentage|fixed`, value, endDate)
- **Image uploads** via `multer` + **sharp** resizing
- Server‑side **slug** + storage under category/name
- **CDN/S3** upload supported via `services/upload.js`
- Safe file handling + directory ensure with `fs-extra`

### Orders
- List orders, view details in admin
- Update order status (e.g., paid/fulfilled/shipped)
- Customer order history in `/account`

### Cart (`/api/cart/*`)
- Public **GET `/:username`** to fetch cart by username (for demos)
- Authed operations to add/update/remove items
- Cart persisted in `User` model with `productId` refs

### Favorites (`/api/favorites/*`)
- Auth‑required toggle/list favorites; populates product refs

### Coupons (`/api/checkout/coupons/validate`)
- **Coupon model** with fields: code, discountType (percentage/fixed), value, start/end, minPurchase, maxUses/currentUses, active
- `isCurrentlyValid(orderTotal)` helper
- Validation returns normalized discount + amount and message

### Newsletter Engine (`/api/newsletter/*`)
- **Subscribe / Unsubscribe** (with redirect back to FRONTEND_URL)
- **List all** subscribers (admin)
- **Send newsletter** (subject + html/text)
- **Preview from file** & **send from file** using template loader
- **Open tracking pixel**: 1×1 GIF endpoint embeds `emailId`
- **Logs** stored in `NewsletterLog` (success/fail/total)

### Email Automation (mailer/)
- `sendWelcomeEmail`, `sendNewsletterEmail`, `buildCustomEmailHtml`
- Configurable SMTP via env; supports reply‑to / from branding

### AI Chat Assistant (`POST /api/chat`)
- Proxies to **DeepSeek Chat** (`https://api.deepseek.com/v1/chat/completions`)
- Requires `DEEPSEEK_API_KEY`
- Returns raw completion JSON; client formats reply
- 20s timeout + error handling

### AI Marketing Assistant (`/api/ai-marketing/*`)
- `POST /generate-post` – text generation (Google GenAI)
- `POST /generate-image` – image generation
- `POST /video/start` – starts a **RunwayML** video job
- `GET  /video/status/:id` – fetch job status
- `POST /runway/webhook` – receives Runway callbacks
- Integrates with **Products** for context‑aware prompts

### Social Publisher (`/api/social/*`)
- `POST /publish` – publish to platforms listed in `platforms[]`
  - **Instagram**: create/upload container + publish
  - **TikTok**: init publish + status polling
- `GET /tiktok/status` – check status by id
- `POST /tiktok/webhook` – receive TikTok status webhooks
- Uses `imagePrep` to resize to platform‑recommended sizes
- Uses `upload` to push images to **S3/R2**, returns CDN URL

### Currency Rates (`/api/rates`)
- Fetches latest **USD→EUR/HUF** from `frankfurter.app`
- Built‑in fallback rates if external API fails
- Returns `{ base: "USD", rates: { EUR, HUF }, updatedAt }`

### Health & SPA
- `GET /api/health` → `{ ok: true }`
- SPA fallback serves `client/dist/index.html` for non‑API routes

---

## Data Models (high level)
- **User**: email, name, password (bcrypt), googleId/provider, phone, defaultAddress, `newsletterOptIn`, role, **cart[]**, **favorites[]**
- **Product**: name, price, description, category, images, **variants (sizes + stock)**, **currentSale**
- **Order**: items, totals, user, status, timestamps
- **Coupon**: code, type, value, window, min/max usage, active, validation helper
- **Newsletter** + **NewsletterLog**
- **EmailLog**
- **ContactMessage** with admin reply route

---

## Environment Variables
Create `server/.env` from `.env.example` and set:

**Core**
```
NODE_ENV=production
PORT=
MONGO_URI=
JWT_SECRET=
JWT_EXPIRES_IN=7d
CLIENT_URL=https://veyno.hu
FRONTEND_URL=https://veyno.hu
API_URL=https://veyno.hu
COOKIE_DOMAIN=.veyno.hu
```

**Stripe (optional but enabled in code)**
```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

**AI**
```
DEEPSEEK_API_KEY=         # /api/chat
GOOGLE_CLIENT_ID=         # optional OAuth
RUNWAYML_API_SECRET=      # RunwayML video jobs
```

**Social / Marketing**
```
FB_PAGE_ACCESS_TOKEN=     # Instagram Graph API publish
IG_USER_ID=               # Instagram professional account id
TIKTOK_ACCESS_TOKEN=      # TikTok publish/status
```

**Storage / CDN (optional)**
```
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_BASE=           # e.g., https://s3.yourcdn.com/
CDN_PUBLIC_BASE=          # e.g., https://cdn.veyno.hu/
```

---

## Install / Dev / Build
```bash
# repo root
npm install
npm run dev        # client + server concurrently
npm run build      # builds client (and noop server build)
npm start          # serves API + built SPA
```

---

## Deployment
See **README-DEPLOY.md** for Render one‑click (single service) or split (Vercel+Render).  
For custom domain via Cloudflare:
- point `veyno.hu` CNAME to Render URL
- SSL mode **Full (Strict)**, Always HTTPS ON
- set `.env` URLs to `https://veyno.hu`

---

## Testing the Demo
- Open `/` – storefront
- `/api/health` → server ok
- Register/Login → JWT flow ok
- Add to cart → quantities update
- Favorites toggle → reflects in `/favorites`
- Admin panel → CRUD products, sales, orders
- Coupon validate → `/api/checkout/coupons/validate`
- Newsletter → subscribe + send + unsubscribe
- Chatbot → open widget, ask a question
- AI Marketing → generate text/image, start Runway job
- Social publish → push a demo image to IG sandbox

---

## Notes
- Production security hardened with Helmet, CORS, cookie config
- Rate‑limits recommended for auth/newsletter endpoints
- Replace placeholder external tokens with your own
- Newsletter templates can be extended under `server/newsletter-templates`
