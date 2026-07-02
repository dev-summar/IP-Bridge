# PatentBridge Redesign — Implementation Plan

## Vision
Transform PatentBridge from an academic patent portal into a **startup-grade IP marketplace** (Linear / Stripe / Notion quality) while **keeping the existing Express + MongoDB backend**.

---

## Phases

### Phase 1 — Design system & IA (this sprint)
- [x] `IMPLEMENTATION_PLAN.md`
- [x] Navigation constants (`src/constants/navigation.ts`)
- [x] IP categories & asset types (`src/constants/ip.ts`)
- [x] UI primitives: `Skeleton`, `EmptyState`, `PageHeader`, `ProgressSteps`
- [x] Light public navbar (Discover, Categories, How It Works, Pricing, Sign In, List IP)
- [x] Role-based dashboard sidebar (buyer / inventor / admin only)
- [x] Startup homepage (hero, trust, how it works, featured IP, AI, testimonials)
- [x] Static pages: How It Works, Pricing, List IP
- [x] Route map + legacy redirects

### Phase 2 — Discover & IP profile
- [ ] Marketplace → **Discover IP** with category filters & Product Hunt-style cards
- [ ] `IPAssetCard`: title, industry, asset type, TRL, AI score, licensing value
- [ ] **Unlock Details** 3-step flow (org → NDA → submit) with progress indicator
- [ ] IP Detail page sections: Overview, Commercial, Technical, Inventor, AI Insights
- [ ] Communication layer: Ask Question, Messaging placeholder, Book Meeting (optional)

### Phase 3 — Deal Room
- [ ] `/dashboard/deals/:id` workspace with tabs:
  - Overview, Documents, Negotiation, Milestones, Escrow, Assignment
- [ ] Wire to existing offers, NDAs, transactions APIs
- [ ] Deal progress tracker (NDA → Access → Discussion → Offer → Escrow → Transfer)
- [ ] Success / completion screens

### Phase 4 — Dashboard simplification
- [ ] Remove academic tables; card-based deal lists
- [ ] Buyer: Discover, My Requests, Active Deals, Completed Deals
- [ ] Inventor: My IP Assets, Access Requests, Active Negotiations, Revenue
- [ ] Admin: Users, IP Listings, Deals, Escrow, Reports
- [ ] Deprecate duplicate menus (separate Leads + Meetings + Negotiations for buyers → unified Deals)

### Phase 5 — Polish
- [ ] Loading skeletons on all data pages
- [ ] Empty states with single CTA
- [ ] Mobile responsive pass
- [ ] Accessibility (focus rings, aria labels)
- [ ] Backend: optional `assetType`, `trlLevel` fields on patents (fallback heuristics until then)

---

## Route map

| New path | Maps to / purpose |
|----------|-------------------|
| `/` | Landing |
| `/discover` | Marketplace (alias) |
| `/marketplace` | Discover (keep for bookmarks) |
| `/marketplace/:id` | IP Detail |
| `/how-it-works` | Static |
| `/pricing` | Static |
| `/list-ip` | List IP CTA → auth owner register |
| `/dashboard` | Role home |
| `/dashboard/requests` | Buyer access + interest |
| `/dashboard/deals` | Active deals (offers + escrow) |
| `/dashboard/deals/completed` | Completed deals |
| `/dashboard/deals/:id` | Deal Room |
| `/dashboard/assets` | Owner portfolio |
| `/dashboard/access-requests` | Owner/admin |
| `/dashboard/negotiations` | Owner negotiations |
| `/dashboard/revenue` | Owner revenue summary |
| `/dashboard/listings` | Admin review queue |
| `/dashboard/escrow` | Admin/buyer escrow |
| `/dashboard/reports` | Admin analytics |

Legacy routes (`/dashboard/leads`, `/bookmarks`, etc.) redirect or remain as aliases during transition.

---

## Backend (no breaking changes)
Reuse:
- `GET /api/patents`, `GET /api/patents/:id`
- Interactions, offers, NDAs, transactions
- AI analysis in `patentanalyses`

Optional later:
- `assetType`, `trlLevel` on patent schema
- `industryMatchScore` on analysis

Frontend derives TRL/asset type from `industryClassification` until schema update.

---

## Design tokens
- Primary: indigo-blue `#4F46E5` / existing LVX blue
- Surface: `#FAFAFA` / white cards
- Radius: `12px` cards, `8px` buttons
- Shadow: soft `shadow-sm` / `shadow-md`
- Font: Plus Jakarta Sans (keep) or Inter

---

## Success criteria
1. First-time visitor understands product in &lt; 10 seconds (homepage)
2. Buyer completes Discover → Unlock in ≤ 3 clicks
3. Dashboard ≤ 5 nav items per role
4. Deal Room is the single workspace post-NDA
5. Mobile usable at 375px width
