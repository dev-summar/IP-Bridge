# PatentBridge — Full End-to-End Demo Script

**Duration:** 12–18 minutes  
**App URL:** http://localhost:3000  
**API:** http://localhost:5000  
**Password (all accounts):** `password123`

---

## Pre-demo checklist (5 minutes before audience)

```bash
# From project root
npm run dev
```

- [ ] Browser open at http://localhost:3000
- [ ] Backend log shows: `PatentBridge API running at http://localhost:5000`
- [ ] MongoDB connected (Atlas)
- [ ] Optional fresh start: `cd backend && npm run clear:interactions`
- [ ] Optional refresh AI scores: `cd backend && npm run reanalyze:patents`
- [ ] Three browser profiles OR use incognito + normal windows for quick role switching

---

## Demo accounts

| Role | Email | Display name | Organization |
|------|-------|--------------|--------------|
| **Admin** | `admin@patentbridge.com` | Rajesh Sharma (Admin) | PatentBridge India |
| **Inventor / Owner** | `owner@patentbridge.com` | Prof. Ankur Gupta (Inventor) | MIET |
| **Corporate buyer** | `buyer@patentbridge.com` | Vikram Malhotra (Corporate Acquirer) | Tata Innovation Labs |

---

## Listed patents (marketplace)

| Patent | Ref number | Asking price | Type |
|--------|------------|--------------|------|
| Biomechanical monitoring & footwear analysis | IN-202611064342 | ₹1,25,00,000 | Sale + License |
| Smart home data sovereignty & IoT integrity | IN-202611042595 | ₹85,00,000 | License |

Both show **AI commercial potential scores** (~87–88/100 after re-analysis) and industry tags on the marketplace cards.

---

## Opening (30 seconds)

> *"Today I'll show PatentBridge — an Indian IP marketplace where university inventors list patents, corporate buyers discover them with AI commercial briefs, sign NDAs, negotiate deals, and pay through a secure Razorpay escrow vault. Admin releases milestone payouts to the inventor. At the end, both parties get a legal IP Assignment Deed."*

---

# ACT 1 — Public marketplace (Buyer view, not logged in)

**Time:** ~2 minutes

### Steps

1. Open **http://localhost:3000** — show landing page hero.
2. Click **Marketplace** (or **Explore** / **Start Discovering**).
3. Point at a patent card:
   - **Potential: XX/100** — AI commercial score
   - **Readiness: High / Medium / Low**
   - **Locked** badge — title masked as *"Confidential … Innovation"*
   - **Asking price** in INR
   - Short technology teaser only

### What to say

> *"Before login, buyers see a curated directory. AI scores help prioritize IP. Sensitive title and full brief stay locked until the inventor approves access."*

4. Click a card to open patent detail — show **locked** overlay and **Express Interest & Request Access** CTA.

---

# ACT 2 — Buyer expresses interest + NDA

**Time:** ~3 minutes  
**Login:** `buyer@patentbridge.com` / `password123`

Buyer lands on **Marketplace** after login.

### Steps

1. Open **Smart Home / Data Sovereignty** patent (or footwear patent).
2. Click **Express Interest & Request Access**.
3. Fill the interest form (company need, timeline, etc.) → **Submit**.
4. If **NDA eSign** opens:
   - **Full legal name:** Vikram Malhotra
   - **Aadhaar:** any 12 digits (demo)
   - Click **Request OTP eSign**
   - **OTP:** `123456`
   - Click **Authenticate & Sign NDA**

### What to say

> *"One click does two things: records corporate interest and sends an unlock request to the MIET inventor. The mutual NDA is e-signed under the IT Act before deep technical disclosure."*

5. Show pending state on the patent page if access is not yet approved.

---

# ACT 3 — Inventor approves access

**Time:** ~2 minutes  
**Logout → Login:** `owner@patentbridge.com` / `password123`

Inventor lands on **Dashboard**.

### Steps

1. Sidebar → **Access Requests**.
2. Find request from **Vikram Malhotra / Tata Innovation Labs**.
3. Click **Approve Access**.

### What to say

> *"The inventor controls who sees claims, PDFs, and the full AI commercial brief. This mirrors real university tech-transfer workflows."*

4. Optional: **Leads Management** — show the buyer’s interest record.

---

# ACT 4 — Buyer unlocks full AI brief

**Time:** ~2 minutes  
**Logout → Login:** `buyer@patentbridge.com`

### Steps

1. **Marketplace** → open the same patent.
2. Show **unlocked** content:
   - Real **title** and **patent number**
   - **Technology Profile Summary** (AI)
   - Problem solved, key innovation, value proposition
   - **Commercial Applications** — industries, use cases, adoption paths
   - **AI Market Intelligence** — market opportunity, potential acquirers
   - Sidebar: **Commercial Potential Score** ring + **AI Commercial Breakdown** radar
   - **Technology Keywords**
   - **Original Registry Abstract** + PDF link

### What to say

> *"The score on the card matches the detail page. Gemini/Qwen generated this executive brief from the patent abstract — buyers don’t need to read 40 pages on day one."*

3. Click **Book Meeting** — schedule a discovery call (fill date/time/message → submit).
4. *(If meeting required for offer)* Wait for owner to accept meeting in **Meetings** tab, OR proceed if offer button is already active.

---

# ACT 5 — Meeting + formal offer

**Time:** ~2 minutes

### Owner accepts meeting (if needed)

**Login:** `owner@patentbridge.com`  
→ **Meetings scheduled** → **Accept** buyer’s meeting.

### Buyer sends offer

**Login:** `buyer@patentbridge.com`  
→ Patent detail → **Acquire / License**  
→ Offer form example:

| Field | Demo value |
|-------|------------|
| Type | Sale or License |
| Price | ₹2,00,000 *(use lower amount for quick escrow demo)* or match asking price |
| Milestones | e.g. `Initial deposit`, `IP transfer signatures`, `Registry update` |
| Notes | Strategic acquisition for smart building division |

→ **Send Offer**

### What to say

> *"After NDA and meeting, the buyer sends a structured offer with milestones. Those milestones become the escrow release schedule."*

---

# ACT 6 — Inventor accepts offer → Escrow created

**Time:** ~1 minute  
**Login:** `owner@patentbridge.com`

### Steps

1. **Negotiations** → find buyer’s offer.
2. **Accept** offer.

### What to say

> *"Acceptance auto-creates an escrow transaction: status `escrow_pending`, 5% platform fee deducted from inventor payout, milestones attached."*

---

# ACT 7 — Buyer funds escrow (Razorpay)

**Time:** ~2 minutes  
**Login:** `buyer@patentbridge.com`

### Steps

1. Sidebar → **Escrow Ledger**.
2. Find transaction → **Fund Escrow Vault**.
3. Modal shows total price and **PatentBridge Escrow Services** as custodian.
4. Click **Open Razorpay Gateway**.
5. Razorpay **Sandbox** payment:

| Method | Test details |
|--------|----------------|
| **Card** | `4111 1111 1111 1111` |
| **Expiry** | Any future date (e.g. `12/28`) |
| **CVV** | Any 3 digits |
| **UPI** | Razorpay test UPI flow in sandbox |

6. Complete payment → verify signature on backend → status **escrow funded**.

### What to say

> *"Funds sit in the platform vault — not with the inventor yet. Razorpay handles the payment; PatentBridge admin acts as escrow custodian and releases milestones."*

---

# ACT 8 — Admin releases milestones

**Time:** ~2 minutes  
**Login:** `admin@patentbridge.com` / `password123`

### Steps

1. **Escrow Ledger** — see all platform transactions.
2. Open funded deal → milestone list (typically 3: 25% / 50% / 25%).
3. Click **Release Payout** on **Milestone 1** → confirm.
4. Repeat for milestones 2 and 3.
5. Status becomes **completed**.
6. Optional: **Security Audits** — show `ESCROW_FUNDED`, `MILESTONE_RELEASED`, `TRANSACTION_COMPLETED` logs.

### What to say

> *"Only admin releases payouts — protecting both buyer and inventor. Each release is audited. When all milestones clear, the deal is legally complete."*

---

# ACT 9 — Download IP Assignment Deed

**Time:** ~1 minute  
**Login:** buyer or inventor (or admin)

### Steps

1. **Escrow Ledger** → **Download Assignment Deed** (.docx).
2. Open file — show parties, patent number, consideration, e-sign blocks.

### What to say

> *"PatentBridge generates the Deed of Patent Assignment & Transfer — ready for records and Indian Patent Office follow-up."*

---

## Closing summary (30 seconds)

> *"We went from discovery → AI brief → NDA → meeting → offer → Razorpay escrow → admin milestone release → IP deed. One platform for MIET inventors and corporate acquirers like Tata Innovation Labs, with PatentBridge admin as trusted custodian."*

---

## Role cheat sheet (quick switching)

| Step | Account |
|------|---------|
| Browse / interest / pay | `buyer@patentbridge.com` |
| Approve access / accept offer / meetings | `owner@patentbridge.com` |
| Release escrow milestones / audits | `admin@patentbridge.com` |

---

## Reset between demos

```bash
cd backend
npm run clear:interactions
```

**Clears:** interest, access requests, meetings, offers, NDAs, transactions, audit logs  
**Keeps:** users, patents, AI analyses

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Razorpay: "Failed to create order" | Hard refresh (`Ctrl+Shift+R`); receipt length bug is fixed in latest code |
| Razorpay popup won’t load | Set Wi‑Fi DNS to `8.8.8.8` and `1.1.1.1` |
| Card score ≠ detail score | Run `npm run reanalyze:patents` in backend |
| Approve button invisible | Fixed (`bg-emerald-600`); hard refresh |
| Buyer lands on wrong dashboard | Buyers go to `/marketplace`; owners/admins to `/dashboard` |
| Empty AI summary after unlock | `npm run reanalyze:patents` then hard refresh |

---

## Hinglish short version (for informal demos)

1. **Buyer login** → marketplace → patent kholo → *"Interest & Access"* ek click  
2. **NDA** → OTP `123456`  
3. **Owner login** → Access Requests → **Approve**  
4. **Buyer** → full AI summary dekho → meeting book → offer bhejo (₹2L demo)  
5. **Owner** → Negotiations → **Accept**  
6. **Buyer** → Escrow Ledger → Razorpay se pay (`4111…`)  
7. **Admin** → Escrow → har milestone **Release Payout**  
8. **Done** → Assignment Deed download  

**Sab ka password:** `password123`

---

## NPM scripts reference

```bash
npm run dev                  # Start frontend + backend
npm run clear:interactions   # Reset demo flow data
npm run reanalyze:patents    # Refresh AI scores & summaries
```

---

*PatentBridge Demo Script — MIET / Patentbaazar*
