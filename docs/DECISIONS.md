# OptCulture Sales Docs – Decisions

## Stack
- Google Apps Script web app (domain-restricted to @optculture.com)
- Google Sheet = master data + log; Google Docs = templates; Drive = outputs
- Owner/runner account: dedicated `docs-admin@optculture.com` (to be created)
- AI drafting: Gemini via Vertex AI (Cloud project set up by Varaprasad)

## Documents
Proposal · Quotation & Order Form · Terms of Service · PDPL (DPA)
- One deal = one data entry; rep ticks which documents to generate, can add more later
- Output: Google Doc + PDF
- Languages: English, with Arabic / bilingual option
- Numbering: OC-P-2026-0001, OC-Q-…, OC-TOS-…, OC-DPA-… (yearly running)
- Revisions allowed as new versions (v2, v3…); pricing change → re-approval

## Pricing (source: Pricing MasterSheet 2026, "Pricing v2")
- Model: flat price per store (v2) + per-store install fee
- Factor = (1 − market disc) × FX rate × (1 − slab disc) × (1 − special disc)  ← fixes sheet bug
- Market: selected by rep (Developed / High Income / Emerging / India Only)
- Store slab: auto from store count
- Special price/discount: allowed, ANY special discount needs superadmin approval
- Rounding: nearest 5 in quote currency
- WhatsApp: Meta actuals + 17.5%
- Move hard-coded values (Agentic Marketing, data migration) into Settings

## Roles
- Rep: own deals/documents only
- Manager: view team's data (no approvals)
- Superadmin: all data, sole approver

## AI draft
- Rep enters 3–4 lines → Gemini drafts Executive Summary + 2 customer journeys
- Narrative only; prices/terms/legal never AI-generated
- Rep edits/regenerates; AI draft + final both logged

## People & storage
- Superadmin: Amith (CEO) – amith.lulla@optculture.com
- Root folder in Amith's Drive with subfolders:
  - Proposals
  - Quotations & Order Forms
  - Terms of Service & PDPL

## Source formats received
- Proposal: OptCulture_Proposal_FRG_2026-11-01
- Order Form: "COMMERCIAL QUOTATION & ORDER FORM" (8 sections, placeholders in [ ])
- ToS: "ToS 2026-11-14" (10 sections; references MSA, Order Form, DPA, SLA, Jurisdiction Schedule)
- Style reference: old Service Agreement (OC202610009) – numbered clauses, Exhibits A modules / B commercials / C SLA

## Open items
- PDPL / DPA format
- Managers & team mapping
- Reconcile feature list (rate card vs FRG proposal)

## Legal & commercial decisions (round 3)
- Deal pack: Proposal → Order Form + ToS + DPA (PDPL) + SLA schedule (from old Exhibit C)
- Order Form issued "under the MSA or, where none exists, the OptCulture Terms of Service"
- Order Form usage table aligned to rate card (receipts overage, platform fee per 100k, WhatsApp Meta +17.5%, SMS custom, storage, Agentic Marketing)
- Shared "Commercial T&Cs" block (6% annual uplift, 1.5%/month late fee, consulting rates) used in Proposal + Order Form
- ToS liability cap: 12 months of fees
- ToS: add 24-month non-solicitation of employees clause
- Email/push platform fee: USD 250 per 100,000 (rate card correct)
- Superadmin / escalation contact: amith.lulla@optculture.com
- Fix old-agreement errors when reusing wording (5.4 Customer, 2.1 "third party", 9.8, IP indemnity not US-only)
- Legal text to be reviewed by counsel before client use

## Entities & DPA (round 4)
- Contracting party: USA → Retail Information Systems, Inc. (dba OptCulture); UAE → RIS Services DMCC (Licence DMCC-33689); India → OptCulture Private Limited; other countries (KSA, Egypt, …) → local partner contracts with the client
- Settings tab holds entities + partners (legal name, licence/CR no., address, signatory, logo, countries)
- DPA: one core DPA + country addendum chosen automatically from client location (KSA PDPL, UAE PDPL, India DPDP, Egypt PDPL, EU/UK GDPR, other)
- When a partner contracts, OptCulture's platform entity is listed as sub-processor
- DPA drafted by Claude for legal review (docs/templates/DPA.md)

## Correction (2026-11-14)
- Amith's Google account is **amith.lulla@optculture.com** (not amith@). Updated in the code, docs and the live Master Sheet (Users, CommercialTerms).

## Pricing sign-off answers (Gate G2, 2026-11-14)
- Store-count slab is calculated on **sites = physical stores + e-commerce sites**.
- Rounding: nearest 5 in the quote currency; amounts below 10 x step (50) round to a whole number.
- Special price **above** standard: no approval. **Below** standard: superadmin approval.
- Platform messaging fees use **volume tiers** (CommsTiers tab): 100,000/month = USD 250 (floor 100); 1,000,000/month = USD 1,500 (floor 500). Currency-converted only, no market or store-count discount. Below list → approval; below floor → flagged in the approval request.
- Egypt default quote currency: **USD** (rep can change).

## Branding (2026-11-14)
- OptCulture logo (red speech bubble "OC" + wordmark) at the top of every document via {{IMAGE:OptCultureLogo}}.
- Headings: OptCulture red #B6262B. Table headers: purple background with white bold text: `brand_table_header_bg` in CommercialTerms (currently #7B3FE4, an approximation of the swatch; replace with the exact brand hex).

## Wallet loyalty cards (2026-11-14)
- Loyalty Cards on Apple Wallet & Google Wallet are **standard (Included)** in Loyalty and Advanced, never an add-on; not included in Engagement. Feature renamed to "Loyalty Cards on Apple Wallet & Google Wallet (standard)" in the Features tab. Gift Cards stay an add-on.
