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

## Retire demo accounts

Startup no longer creates demo accounts or patent listings. The sign-in page supports regular accounts only.

Preview the cleanup against the database used by your deployment:

```powershell
npm run retire:demo-accounts --prefix backend -- --store mongo --owner ankurgupta@mietjammu.in
```

Use `--store json` for the local fallback file. The command targets only the three seeded email addresses, including duplicate records. It transfers patent listings and related owner references to the destination inventor, preserving analyses and deal history. Historical buyer and audit references remain in the preserved records.

Pause writes while applying the cleanup. Repeat the preview command with `--apply --prompt-password` to enter the inventor password without echoing it or including it in shell history. `OWNER_PASSWORD` in the process environment is also supported. An existing destination must have the owner role. A full backup is saved under `backend/data/backups/` before changes. MongoDB cleanup uses a transaction and never silently falls back to the JSON database. Backups contain account hashes and should remain private; they are excluded from Git.

Deploy the updated backend as part of the cleanup so sessions belonging to deleted users are rejected. Removing the seeded admin also removes that account's access to administration; use a real admin account for approvals.

Cleanup checks: `npm run build:backend`, then `node --test backend/tests/retireDemoAccounts.test.js`.

Provision a real administrator with `npm run provision:admin --prefix backend -- --store mongo --email summar.adm@mietjammu.in` to preview, then add `--apply --prompt-password` to set the account's admin role and password. Use `--store json` to update the local fallback separately. The command backs up existing records, verifies the stored role and password, and preserves inventor accounts and listings.

## Listing review and UI updates

Admins can search all listing statuses under **IP Listings**, review supporting documents and AI assessments, and approve, request changes, or reject a pending submission. Requested changes and rejections require feedback. Decisions retain the reviewer, notes, and time; concurrent decisions return a conflict rather than overwriting another review. Inventors see the feedback under **My IP Assets** and can revise and resubmit the same listing, retaining its review history.

The mobile **More** menu exposes every dashboard section and sign-out. Marketplace cards support grid/list layouts, distinguish access approval from verification, and show missing assessments as **Not assessed**. Dashboard activity charts use stored submission/request dates; fabricated growth, revenue, market-index figures, testimonials, and example briefs have been removed. Subscription revenue remains untracked until billing data is available.

NDA acceptance now requires a typed name and explicit consent, records the account and timestamp, and does not claim Aadhaar verification. The legacy direct-funding endpoint returns `410`; payment funding uses the existing gateway checkout and verification endpoints. Deploy the frontend and backend together for these API changes.

Validate with `npm run build`, `node --test backend/tests/reviewWorkflow.test.js`, and `node backend/tests/uiSmoke.cjs`. The browser check requires local Edge/Chrome, uses isolated HTTP fixtures, and saves screenshots in the ignored `artifacts/ui-preview/` folder. It never connects to MongoDB.

New submissions and resubmissions require an HTTP(S) link to the official approval PDF, an IP type (**Utility Patent**, **Design**, or **Other** with a description), and an explicit grant/registration declaration. Utility patents must be granted; designs must be registered; pending and merely published applications are rejected. IPBridge approval is a separate review step. An admin must manually check the PDF and confirm the grant/registration before publishing; the reviewed document and reviewer are recorded. The API verifies link syntax rather than fetching arbitrary URLs or claiming automatic registry verification.

The IP type appears in marketplace/featured cards, asset portfolios, saved IP, reviews, patent details, dashboard recommendations, and deal views. Older records without a saved type display **Type not specified**. No existing records are automatically classified or certified as granted. Check these rules with `node --test backend/tests/listingRequirements.test.js backend/tests/reviewWorkflow.test.js` after building the backend.

## End-to-end listing flow

Build with `npm run build`, then run `npm run test:e2e --prefix backend` with Node 22 or newer and local Edge/Chrome. The browser uses the production frontend, actual Express API routes, and a temporary JSON database. It covers registration/login, all three IP types, required evidence, admin feedback and resubmission, publication, marketplace tags, NDA acceptance, inventor access approval, and an approved buyer refreshing the full listing. Permission checks reject public administrator signup and public discovery of pending submissions.

The test leaves the workspace database unchanged and saves its report and screenshots under ignored `artifacts/e2e/`. External AI providers, production MongoDB, real patent-registry verification, and payment checkout are outside this test; analysis uses the actual local fallback. `JSON_DB_PATH` overrides the JSON fallback location for isolated runs and defaults to `backend/data/db.json`.

## Gemini configuration

Patent analysis, marketplace AI matching, pricing guidance, and prototype readiness share the same backend AI provider. Set `AI_ANALYSIS_PROVIDER=gemini`, `GEMINI_API_KEY`, and `GEMINI_MODEL=gemini-2.5-flash` in local `backend/.env` or your backend host's environment settings. A configured Gemini key is preferred by default; `AI_ANALYSIS_PROVIDER=miet` or `llm` explicitly selects the legacy gateway first. Provider failures retain the existing gateway/local fallbacks. Existing stored assessments change when an inventor requests reanalysis, pricing, or readiness assessment.

The credential is sent to Google in the `x-goog-api-key` header, never in URLs or frontend code. Google determines which credential formats are accepted. Local environment files are excluded from Git. Validate provider routing with `npm run build:backend` and `node --test backend/tests/geminiProvider.test.js`.
