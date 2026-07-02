# IP-Bridge (Patentbaazar)

Patent discovery and commercialization platform — React frontend + Express/TypeScript API.

## Deploy to Render (one click)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/dev-summar/IP-Bridge)

After deploy, set these environment variables in the Render dashboard:

| Variable | Required |
|----------|----------|
| `MONGODB_URI` | Yes (MongoDB Atlas) |
| `JWT_SECRET` | Yes |
| `RAZORPAY_KEY_ID` | Optional |
| `RAZORPAY_KEY_SECRET` | Optional |

`NODE_ENV=production` is set automatically via `render.yaml`.

## Local production

```bash
npm run install:all
npm run build
# Windows
start-production.bat
```

Open http://localhost:5000

## Development

```bash
npm run dev
```

Frontend: http://localhost:3000 · API: http://localhost:5000
