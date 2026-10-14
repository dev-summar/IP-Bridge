/**
 * IPBridge — IP Attorney Flow Document Generator
 * ==============================================
 * HOW TO USE:
 * 1. Go to https://script.google.com → New project
 * 2. Paste this entire file (replace default Code.gs content)
 * 3. Save → Run `createIPAttorneyFlowDoc`
 * 4. Authorize when prompted (Google Docs access)
 * 5. Open the link printed in Execution log / alert
 *
 * Optional: Run `createIPAttorneyFlowDocInFolder` after setting FOLDER_ID below.
 */

const DOC_TITLE = 'IPBridge — IP Attorney Role & Flow (Detailed Spec)';
const FOLDER_ID = ''; // Optional: paste a Google Drive folder ID

// ─── Main entry points ───────────────────────────────────────────────────────

function onOpen() {
  DocumentApp.getUi()
    .createMenu('IPBridge Docs')
    .addItem('Generate IP Attorney Flow Doc', 'createIPAttorneyFlowDoc')
    .addToUi();
}

function createIPAttorneyFlowDoc() {
  const doc = DocumentApp.create(DOC_TITLE);
  buildDocument(doc);
  const url = doc.getUrl();
  Logger.log('Document created: ' + url);
  DocumentApp.getUi().alert('Document created!\n\n' + url);
  return url;
}

function createIPAttorneyFlowDocInFolder() {
  if (!FOLDER_ID) {
    throw new Error('Set FOLDER_ID at the top of the script first.');
  }
  const doc = DocumentApp.create(DOC_TITLE);
  DriveApp.getFileById(doc.getId()).moveTo(DriveApp.getFolderById(FOLDER_ID));
  buildDocument(doc);
  const url = doc.getUrl();
  Logger.log('Document created in folder: ' + url);
  return url;
}

// ─── Document builder ────────────────────────────────────────────────────────

function buildDocument(doc) {
  const body = doc.getBody();
  body.clear();

  // Cover
  h1(body, 'IPBridge');
  subtitle(body, 'IP Attorney Role — Detailed Flow & Implementation Spec');
  meta(body, [
    'Product: IPBridge (Patentbaazar)',
    'Version: 1.0',
    'Date: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMMM d, yyyy'),
    'Status: Planned feature',
  ]);
  body.appendParagraph('').setSpacingAfter(12);

  // Table of contents note
  callout(body, 'This document defines the IP Attorney role, end-to-end workflows, permissions, UI routes, data models, demo script, and phased rollout plan for IPBridge.');

  // ── 1. Executive Summary ──
  h2(body, '1. Executive Summary');
  p(body, 'IP Attorney is a fourth user role on IPBridge — alongside Buyer, Inventor (Owner), and Admin. Attorneys do not buy, sell, or list intellectual property. They are invited into specific deals by a buyer or inventor to provide legal review at three checkpoints: NDA, offer terms, and assignment deed.');
  bullet(body, [
    'Attorneys are deal-scoped — they only see cases they are invited to.',
    'Attorneys advise and clear documents — they do not move money or approve listings.',
    'Legal review is optional but mirrors real university tech-transfer workflows.',
    'Implementation can roll out in 4 phases without breaking existing flows.',
  ]);

  // ── 2. Role Definition ──
  h2(body, '2. Role Definition');
  table(body,
    ['Attribute', 'Detail'],
    [
      ['Role ID', 'attorney'],
      ['Display name', 'IP Attorney / Legal Counsel'],
      ['Primary job', 'Review NDAs, offer terms, and transfer documents on behalf of clients'],
      ['Cannot do', 'List IP, send offers, accept offers, fund escrow, release payouts, approve marketplace listings'],
      ['Access scope', 'Per-deal invitation only — not platform-wide admin'],
      ['Demo account', 'attorney@patentbridge.com / password123'],
    ]
  );

  // ── 3. Updated Platform Flow ──
  h2(body, '3. Updated Platform Flow (With Attorney)');
  p(body, 'The attorney role inserts optional legal review gates into the existing IPBridge deal pipeline without replacing any current step.');
  numbered(body, [
    'Discover IP — Buyer browses marketplace (unchanged)',
    'Express Interest & Request Access — Buyer submits interest (unchanged)',
    'NDA Signed — Buyer e-signs mutual NDA (unchanged)',
    '★ LEGAL GATE 1 — Attorney reviews NDA (NEW, optional)',
    'Access Approved — Inventor approves buyer access (unchanged)',
    'Meeting & Discussion — Discovery call scheduled (unchanged)',
    'Offer Sent — Buyer sends structured offer with milestones (unchanged)',
    '★ LEGAL GATE 2 — Attorney reviews offer terms (NEW, optional)',
    'Offer Accepted — Inventor accepts → escrow created (unchanged)',
    'Escrow Funded — Buyer pays via Razorpay (unchanged)',
    'Admin Milestone Release — Admin releases payouts (unchanged)',
    '★ LEGAL GATE 3 — Attorney reviews assignment deed (NEW, optional)',
    'Transfer Completed — Deed downloaded, deal closed (unchanged)',
  ]);

  // ── 4. Attorney Touchpoints ──
  h2(body, '4. Attorney Touchpoints — Three Legal Gates');
  table(body,
    ['Gate', 'Stage', 'When', 'Attorney Action', 'Who Invites'],
    [
      ['Gate 1', 'NDA Review', 'After buyer signs NDA, before full unlock', 'Review NDA text, add comments, approve or request changes', 'Buyer or Inventor'],
      ['Gate 2', 'Offer Review', 'Before offer is accepted', 'Review price, milestones, license vs sale scope', 'Buyer or Inventor'],
      ['Gate 3', 'Deed Review', 'Before deed download / deal close', 'Review assignment deed draft, mark legally cleared', 'Buyer or Inventor'],
    ]
  );

  // ── 5. End-to-End Flows ──
  h2(body, '5. End-to-End Flows');

  h3(body, '5.1 Phase A — Attorney Onboarding');
  numbered(body, [
    'Attorney visits Sign Up and selects role: IP Attorney / Legal Counsel.',
    'Registration fields: full name, email, password, law firm name, bar registration number (optional), practice areas (IP, licensing, litigation).',
    'After login, attorney lands on Attorney Dashboard with zero assigned cases.',
    'Attorney can browse Discover IP (read-only) but cannot list or acquire IP.',
  ]);

  h3(body, '5.2 Phase B — Invitation to a Deal');
  numbered(body, [
    'Buyer or Inventor opens an active deal (patent detail or Deal Room).',
    'Clicks button: Invite IP Attorney.',
    'Enters attorney email OR selects registered attorney from platform.',
    'Selects counsel side: Buyer Counsel or Inventor Counsel.',
    'System sends email notification + in-app notification to attorney.',
    'Attorney accepts invitation → deal appears in Assigned Cases.',
    'Attorney sees ONLY that deal — no access to other deals or admin panels.',
  ]);

  h3(body, '5.3 Phase C — NDA Legal Review (Gate 1)');
  numbered(body, [
    'Buyer completes Express Interest and signs NDA (existing flow).',
    'Optional: Buyer or Inventor invites attorney before inventor approves access.',
    'Attorney opens Deal Room → Legal tab → NDA Review.',
    'Attorney reads full NDA text, prior interest form, and party details.',
    'Attorney actions: Add legal comment (visible to buyer + inventor), Mark Approved, or Mark Changes Requested.',
    'Buyer/Inventor address comments if needed; flow continues to Access Approval.',
  ]);
  p(body, 'Deal status progression: NDA Signed → Legal Review (optional) → Access Approved');

  h3(body, '5.4 Phase D — Offer & Negotiation Review (Gate 2)');
  numbered(body, [
    'Buyer and inventor complete meeting (existing flow).',
    'Buyer drafts offer: type (sale/license), price, milestones, notes.',
    'Optional: Either party invites attorney before acceptance.',
    'Attorney opens Deal Room → Legal tab → Offer Terms.',
    'Attorney reviews: price, milestone schedule, license scope, assignment language.',
    'Attorney marks: Terms Cleared or Revisions Needed, with written comments.',
    'Inventor accepts offer only when business + legal sides are aligned.',
  ]);
  p(body, 'Attorney can see: offer details, NDA record, meeting notes (read-only). Attorney cannot: send offer, counter-offer, accept offer, or fund escrow.');

  h3(body, '5.5 Phase E — Escrow & Deed Review (Gate 3)');
  numbered(body, [
    'Buyer funds escrow via Razorpay (unchanged — no attorney involvement).',
    'Admin releases milestone payouts (unchanged — admin only).',
    'System generates Assignment Deed draft when milestones complete.',
    'Optional: Attorney reviews deed before parties download.',
    'Attorney marks: Legally Cleared or Needs Revision.',
    'Both parties download final deed after clearance.',
  ]);

  // ── 6. Attorney Dashboard ──
  h2(body, '6. Attorney Dashboard & Navigation');
  table(body,
    ['Menu Item', 'Route', 'Purpose'],
    [
      ['Dashboard', '/dashboard', 'Summary: active cases, pending reviews count'],
      ['Assigned Cases', '/dashboard/cases', 'All deals attorney is invited to'],
      ['Pending Reviews', '/dashboard/cases?filter=pending', 'NDAs, offers, deeds needing action'],
      ['Completed Reviews', '/dashboard/cases?filter=completed', 'Audit history of cleared documents'],
      ['Discover IP', '/discover', 'Browse public marketplace (read-only)'],
    ]
  );

  h3(body, '6.1 Deal Room — Attorney View');
  p(body, 'When attorney opens a specific case (/dashboard/cases/:id), they see tabs:');
  table(body,
    ['Tab', 'Contents'],
    [
      ['Overview', 'Parties, patent reference, deal status, progress tracker'],
      ['NDA', 'NDA text, signature status, attorney review actions'],
      ['Offer', 'Offer terms, milestones, attorney comments and clearance'],
      ['Documents', 'Patent PDF, NDA record, meeting notes, generated deed'],
      ['Legal Notes', 'Threaded comments visible to buyer + inventor + attorneys'],
      ['Deed', 'Assignment deed draft, attorney clearance action'],
    ]
  );

  // ── 7. Permissions Matrix ──
  h2(body, '7. Permissions Matrix');
  table(body,
    ['Action', 'Buyer', 'Inventor', 'Admin', 'Attorney'],
    [
      ['Browse Discover', '✅', '✅', '✅', '✅'],
      ['List IP', '❌', '✅', '✅', '❌'],
      ['Sign NDA', '✅', '❌', '❌', '❌'],
      ['Review NDA', '❌', '❌', '❌', '✅ (if invited)'],
      ['Approve access', '❌', '✅', '✅', '❌'],
      ['Send offer', '✅', '❌', '❌', '❌'],
      ['Review offer terms', '❌', '❌', '❌', '✅'],
      ['Accept offer', '❌', '✅', '❌', '❌'],
      ['Fund escrow', '✅', '❌', '❌', '❌'],
      ['Release milestones', '❌', '❌', '✅', '❌'],
      ['Review assignment deed', '❌', '❌', '❌', '✅'],
      ['Invite attorney', '✅', '✅', '❌', '❌'],
      ['Approve marketplace listing', '❌', '❌', '✅', '❌'],
    ]
  );

  // ── 8. Data Model ──
  h2(body, '8. Data Model (New)');
  h3(body, '8.1 User Schema — add role');
  code(body, "role: 'admin' | 'owner' | 'buyer' | 'attorney'");
  h3(body, '8.2 Deal Participants (new collection)');
  code(body, `deal_participants {
  _id: string
  patentId: string
  offerId?: string          // linked when offer exists
  userId: string            // attorney user ID
  role: 'attorney'
  side: 'buyer' | 'inventor'
  status: 'invited' | 'active' | 'removed'
  invitedBy: string         // userId of inviter
  createdAt: Date
  updatedAt: Date
}`);
  h3(body, '8.3 Legal Reviews (new collection)');
  code(body, `legal_reviews {
  _id: string
  dealParticipantId: string
  patentId: string
  documentType: 'nda' | 'offer' | 'deed'
  status: 'pending' | 'approved' | 'changes_requested' | 'cleared'
  comments: string
  reviewedBy: string        // attorney userId
  reviewedAt: Date
  createdAt: Date
}`);

  // ── 9. API Endpoints ──
  h2(body, '9. API Endpoints to Add');
  table(body,
    ['Method', 'Endpoint', 'Role', 'Purpose'],
    [
      ['POST', '/api/deals/:patentId/invite-attorney', 'buyer, owner', 'Invite attorney to deal'],
      ['GET', '/api/attorney/cases', 'attorney', 'List assigned cases'],
      ['GET', '/api/attorney/cases/:id', 'attorney', 'Deal room detail'],
      ['POST', '/api/attorney/reviews', 'attorney', 'Submit legal review (NDA/offer/deed)'],
      ['GET', '/api/deals/:patentId/legal-reviews', 'buyer, owner, attorney', 'View review history'],
      ['PUT', '/api/deals/:patentId/legal-reviews/:id', 'attorney', 'Update review status/comments'],
    ]
  );

  // ── 10. Frontend Routes ──
  h2(body, '10. Frontend Routes & Files to Change');
  table(body,
    ['File', 'Change'],
    [
      ['backend/src/models/schemas.ts', "Add 'attorney' to user role enum; add DealParticipant + LegalReview schemas"],
      ['backend/src/middleware/auth.ts', "Extend authorizeRoles() for 'attorney'"],
      ['backend/src/routes/api.ts', 'Attorney invite + review endpoints'],
      ['frontend/src/pages/AuthPage.tsx', '4th signup card: IP Attorney / Legal Counsel'],
      ['frontend/src/context/authStore.ts', "Add 'attorney' to UserRole type"],
      ['frontend/src/constants/navigation.ts', 'ATTORNEY_NAV sidebar items'],
      ['frontend/src/utils/authRoutes.ts', 'Attorney home path + List IP guard'],
      ['frontend/src/constants/ip.ts', 'Add legal review steps to DEAL_PROGRESS_STEPS'],
      ['frontend/src/pages/HowItWorksPage.tsx', 'Add Legal Review step to public flow'],
      ['Deal Room component', 'Invite Attorney button + Legal tab for attorneys'],
    ]
  );

  // ── 11. Updated Deal Progress ──
  h2(body, '11. Updated Deal Progress Steps');
  numbered(body, [
    'NDA Signed',
    'Legal Review — NDA (optional, NEW)',
    'Access Approved',
    'Discussion Complete',
    'Offer Sent',
    'Legal Clearance — Offer (optional, NEW)',
    'Offer Accepted',
    'Escrow Funded',
    'Deed Cleared (optional, NEW)',
    'Transfer Completed',
  ]);

  // ── 12. Demo Script ──
  h2(body, '12. Demo Script (Presenter Notes)');
  quote(body, 'We are adding an IP Attorney role to IPBridge. Attorneys do not buy or sell IP — they are invited into specific deals by the buyer or inventor.');
  quote(body, 'They can review the NDA before sensitive data is shared, comment on offer terms before acceptance, and clear the assignment deed before transfer.');
  quote(body, 'This mirrors how real tech-transfer deals work: business teams use IPBridge, and legal counsel stays in the loop on the same platform.');
  p(body, 'Demo flow (5 min):');
  numbered(body, [
    'Login as buyer → open patent → show Invite IP Attorney button (planned).',
    'Switch to attorney account → show Assigned Cases with pending NDA review.',
    'Attorney approves NDA → switch to inventor → approve access.',
    'Continue existing flow → at offer stage, attorney reviews terms.',
    'At deed stage, attorney marks legally cleared → parties download deed.',
  ]);

  // ── 13. Rollout Plan ──
  h2(body, '13. Phased Rollout Plan');
  table(body,
    ['Phase', 'Scope', 'Effort', 'Demo-ready?'],
    [
      ['Phase 1', 'attorney role + signup + empty dashboard + demo account', '1–2 days', 'Partial'],
      ['Phase 2', 'Invite attorney to deal + assigned cases list', '2–3 days', 'Yes'],
      ['Phase 3', 'NDA / offer / deed review tabs + legal comments', '3–5 days', 'Yes — full story'],
      ['Phase 4', 'Optional legal gates (block proceed until cleared) + trust badges', '2–3 days', 'Production'],
    ]
  );

  // ── 14. Out of Scope v1 ──
  h2(body, '14. Explicitly Out of Scope for v1');
  bullet(body, [
    'Attorney listing patents on marketplace',
    'Attorney approving marketplace listings (admin only)',
    'Attorney funding or releasing escrow',
    'Platform-wide attorney access without per-deal invitation',
    'Attorney public profiles on Discover (future Phase 4+)',
    'Multi-attorney firm accounts / team management',
  ]);

  // ── 15. Success Criteria ──
  h2(body, '15. Success Criteria');
  bullet(body, [
    'Attorney can sign up, log in, and see an empty dashboard.',
    'Buyer or inventor can invite attorney by email to a specific deal.',
    'Attorney sees only invited deals — not other users\' data.',
    'Attorney can review NDA, offer, and deed with comments and status.',
    'Existing buyer/inventor/admin flows work unchanged when attorney is not invited.',
    'Deal progress tracker shows optional legal review steps.',
  ]);

  // Footer
  body.appendHorizontalRule();
  p(body, '— End of document —');
  p(body, 'IPBridge / Patentbaazar · Confidential product spec');

  doc.saveAndClose();
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

function h1(body, text) {
  body.appendParagraph(text)
    .setHeading(DocumentApp.ParagraphHeading.HEADING1)
    .setSpacingAfter(6);
}

function h2(body, text) {
  body.appendParagraph(text)
    .setHeading(DocumentApp.ParagraphHeading.HEADING2)
    .setSpacingBefore(14)
    .setSpacingAfter(6);
}

function h3(body, text) {
  body.appendParagraph(text)
    .setHeading(DocumentApp.ParagraphHeading.HEADING3)
    .setSpacingBefore(10)
    .setSpacingAfter(4);
}

function subtitle(body, text) {
  body.appendParagraph(text)
    .setHeading(DocumentApp.ParagraphHeading.SUBTITLE)
    .setSpacingAfter(4);
}

function p(body, text) {
  body.appendParagraph(text)
    .setSpacingAfter(8)
    .setLineSpacing(1.15);
}

function bullet(body, items) {
  items.forEach(function (item) {
    body.appendListItem(item).setSpacingAfter(2);
  });
  body.appendParagraph('').setSpacingAfter(6);
}

function numbered(body, items) {
  items.forEach(function (item) {
    body.appendListItem(item)
      .setGlyphType(DocumentApp.GlyphType.NUMBER)
      .setSpacingAfter(2);
  });
  body.appendParagraph('').setSpacingAfter(6);
}

function quote(body, text) {
  body.appendParagraph('"' + text + '"')
    .setIndentStart(36)
    .setItalic(true)
    .setForegroundColor('#444444')
    .setSpacingAfter(8);
}

function callout(body, text) {
  const para = body.appendParagraph(text);
  para.setBackgroundColor('#EEF2FF');
  para.setSpacingBefore(8);
  para.setSpacingAfter(12);
  para.setIndentStart(12);
  para.setIndentEnd(12);
}

function code(body, text) {
  body.appendParagraph(text)
    .setFontFamily('Courier New')
    .setFontSize(9)
    .setBackgroundColor('#F4F4F5')
    .setSpacingAfter(8);
}

function meta(body, lines) {
  lines.forEach(function (line) {
    body.appendParagraph(line)
      .setFontSize(10)
      .setForegroundColor('#666666')
      .setSpacingAfter(2);
  });
}

function table(body, headers, rows) {
  const numCols = headers.length;
  const table = body.appendTable();
  const headerRow = table.appendTableRow();
  headers.forEach(function (h) {
    headerRow.appendTableCell(h).setBackgroundColor('#E0E7FF').setBold(true);
  });
  rows.forEach(function (row) {
    const tr = table.appendTableRow();
    row.forEach(function (cell) {
      tr.appendTableCell(String(cell));
    });
  });
  body.appendParagraph('').setSpacingAfter(10);
}
