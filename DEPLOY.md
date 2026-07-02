# Deploy Patentbaazar (single service)

One Node process serves the REST API and the built React app. Recommended host: [Render](https://render.com) (free tier).

## Prerequisites

1. **MongoDB Atlas** — create a free cluster and copy the connection string.
2. **GitHub repo** — push this project to GitHub (Render deploys from Git).
3. **Razorpay** (optional) — test or live keys for escrow payments.

## 1. Push to GitHub

```bash
cd Patentbaazar
git init
git add .
git commit -m "Prepare Patentbaazar for deployment"
git remote add origin https://github.com/YOUR_USER/patentbaazar.git
git push -u origin main
```

Do **not** commit `.env` files. Use `.env.example` as a reference.

## 2. Deploy on Render

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**.
2. Connect your GitHub repo and select `render.yaml`.
3. Set environment variables when prompted:
   - `MONGODB_URI` — Atlas URI, e.g. `mongodb+srv://user:pass@cluster.mongodb.net/patentbridge`
   - `JWT_SECRET` — long random string (Render can auto-generate)
   - `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — if using payments
4. Click **Apply**. First deploy takes ~5–10 minutes.

Your app will be live at `https://ipbridge.onrender.com` (or the name you choose).

## 3. MongoDB Atlas network access

In Atlas → **Network Access**, add `0.0.0.0/0` (or Render’s egress IPs) so the server can connect.

## 4. Verify

- `https://YOUR_APP.onrender.com/` — health JSON from API
- `https://YOUR_APP.onrender.com/discover` — React SPA (after build)

## Local production test

```bash
npm run install:all
npm run build
set NODE_ENV=production
npm start
```

Open http://localhost:5000 — same as production.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes (prod) | Set to `production` |
| `PORT` | Auto on Render | Default `5000` locally |
| `MONGODB_URI` | Recommended | Atlas connection string |
| `JWT_SECRET` | Yes | Auth signing key |
| `RAZORPAY_KEY_ID` | Optional | Payment gateway |
| `RAZORPAY_KEY_SECRET` | Optional | Payment gateway |

`VITE_API_URL` is **not** needed for single-service deploy — the frontend calls `/api` on the same origin.

## Railway alternative

1. New project → Deploy from GitHub repo root.
2. **Build:** `npm run install:all && npm run build`
3. **Start:** `npm start`
4. Add the same env vars as above.

## Troubleshooting

- **Build fails** — run `npm run build` locally and fix TypeScript errors first.
- **Blank page** — ensure `NODE_ENV=production` so static files are served.
- **API 502 on free tier** — Render spins down after inactivity; first request may take ~30s.
- **MongoDB timeout** — check Atlas IP allowlist and URI credentials.
