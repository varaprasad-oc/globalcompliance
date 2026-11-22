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

## Launch without AI (2026-11-15)
- Go-live without Gemini. The AI button is hidden while Script Property GCP_PROJECT_ID is empty; reps type the narrative. Enabling later = connect Vertex AI (docs/DEPLOY.md §E), no code change.

## Go-live decisions (2026-11-15)
| # | Topic | Decision |
|---|---|---|
| 1 | Legal review | **Amith reviews internally** the ToS, DPA and SLA, commenting in the Google Docs; Claude applies the changes and re-registers them as non-draft. |
| 2 | Signatories | **Different per entity**: entered in Admin → Entities (signatory_name, signatory_title). |
| 3 | Congineer | Varaprasad asks Congineer for reg. no., address and signatory; documents show "To be provided" until then. |
| 4 | DPA hosting | Varaprasad asks the tech team; stays "To be confirmed" (go-live check amber). |
| 5 | Shared Drive | Amith turns on "Only people in OptCulture can access". Clients get PDFs by email. |
| 6 | GitHub | Make private. The session proxy can't change repo settings, so **Varaprasad does it** (Settings → Danger Zone → Change visibility). |
| 7 | App owner | Stays under varaprasad@ for launch; move to docs-admin@ after the pilot. |
| 8 | Table header colour | Keep #7B3FE4. |
| 9 | Arabic | After launch. |
| 10 | Test files | Keep until UAT ends, then delete before go-live. |
| 11 | Go-live | **In 1 week (target 2026-11-22)**: short UAT, pilot overlapping launch. |
| 12 | Pilot | Varaprasad names 2 reps (emails pending), added as Reps in Users. |
| — | AI | Launch without AI (see above). |

## Add-ons per package (2026-11-15)
- Add-ons are chosen per package in a features table (included features fixed). AI add-ons (Recommendations, Reporting, Grouping & Clustering, Predictive Segmentation, Assisted Campaigns) are priced "Custom quote" and don't add to totals. Features.addon_item_id links a feature to its PriceItems row.

## Two-stage deal flow (2026-11-15)
- Stage 1 **Proposal** → generates the Proposal only (contract details not required).
- **Convert to Order Form** once the proposal is generated or marked Sent.
- Stage 2 **Order Form**: contract details + Order Form terms → Order Form + Terms of Service (MSA) + DPA generated together. "MSA" = our Terms of Service document.
- Statuses: Draft → (Pending approval) → Proposal generated → (Sent) → Contract draft → (Pending approval) → Contract generated → Sent → Won/Lost.

## Proposal = price reference, Order Form = totals (2026-11-15)
- Proposal (stage 1) shows unit/rate-card prices only; optional one-time services are listed with their rate-card price, not calculated.
- Totals (recurring per year, one-time, first-year value) appear only in stage 2 and on the Quotation & Order Form.

## Currency per country (2026-11-15)
- **INR** for India, **ZAR** for South Africa, **USD** for every other country (incl. UAE, KSA, Egypt, GCC). Fixed by country, not editable by reps; enforced on the server. Countries without a row default to USD.

## One-time special prices (2026-11-15)
- Reps may set special unit prices for set-up, per-store and per-e-commerce installation (per package) and for optional services. Below standard → superadmin approval (same flow as licence special prices). Above standard → allowed.
- One-time fees are always shown line by line (no consolidated figure except the final total).

## Contract pack: hybrid Agreement (2026-11-15, Varaprasad)
- **First contract for a client** → ONE Agreement document: MSA / Terms of Service (+ Schedule 2 SLA), **Annexure A** Quotation & Order Form, **Annexure B** DPA. Number = the MSA (OC-TOS) number; annexures keep their OC-Q / OC-DPA numbers. All three numbers are reserved together, so the Order Form always cites the MSA number.
- **Existing client** (deal marked **Won** with an Agreement → MSA saved on the Clients tab: msa_no, dpa_no, msa_deal_id, msa_date) → standalone Quotation & Order Form citing that MSA/DPA.
- MSA signed outside the app: type it in "Existing MSA reference" (or fill msa_no in the Clients tab) → Order Form only.
- Rep can tick "Issue a new MSA anyway" (new entity / expired MSA).

## Referral partners (2026-11-15, Varaprasad)
- New master tab **Partners** (partner_id, name, type, country, contact, commission_pct, active, notes), edited by the Superadmin in Admin → Partners.
- Rep picks an optional **Referral partner** on the deal (step 1). **Internal only: never printed in any document.**
- Superadmin dashboard: **Partner performance** (deals, open, won, lost, win rate, pipeline USD, won USD) for the selected period.

## Pilot reps (2026-11-15)
- Nihaar Akula (nihaar@optculture.com) and Muskan Agarwal (muskan.agarwal@optculture.com): role Rep, manager Varaprasad, region MEA. Added to the live Users tab.

## Contract documents: management MSA format (2026-11-15, Varaprasad) – SUPERSEDES "Contract pack: hybrid Agreement"
- Source: management's MSA (Google Doc "MSA - 2026-11-14"). ToS, DPA and SLA are **online documents** (optculture.com/terms-of-service, /DPA, /SLA) incorporated by the MSA – **no longer generated per client**. Links editable in CommercialTerms (tos_url, dpa_url, sla_url).
- Flow: Deal → **Proposal** → **Quotation & Order Form + MSA** (two separate documents).
- References both ways: Order Form cites the Proposal No. and the MSA No.; MSA cites the initial Order Form No. Numbers reserved together (OC-Q-…, OC-MSA-…).
- Existing client (MSA saved on the client when a deal with an MSA is **Won**, or typed in "Existing MSA reference") → **Order Form only**; "Issue a new MSA anyway" override.
- **MSA §7 Special Terms and Exceptions**: text box on the deal (step 3); empty prints "None.". **Any text needs Amith's approval**; editing it after approval needs approval again.
- MSA template = a copy of management's doc in _Templates ("TEMPLATE – MSA (EN) v1.0", 18bQ-iwrqEhZtP7tQ4DOYB3LSao0nN8n_8fxPynDcULg) with placeholders; old ToS/DPA templates deactivated.
- New data: Entities.courts_city (jurisdiction city; falls back to governing_law), customer signatory email + notice email on the deal.
- Open (OptCulture): Amith to confirm the three online pages are live and complete (incl. country DPA addenda formerly drafted here); OptCulture signatory per entity; courts city per entity.

## Top-ups for Won deals (2026-11-15, Varaprasad)
- A **Won** deal (not itself a top-up) has a **Top-up** action. It creates a new deal (own D-number, "Top-up of D-…") at the contract stage that produces a **Top-up Quotation & Order Form only**, under the client's MSA, supplementing the original Order Form.
- Content (all optional): additional stores / e-commerce sites, new add-ons, communication packs, **WhatsApp credits**, optional one-time services. Installation fees only for added stores/sites; no set-up fee.
- **Pricing: contracted** – the original deal's price snapshot, market, currency and slab; licence = its final per-site price. Below contracted (or below standard for one-time/comms) needs approval.
- **Term: own term** (start date, 12/24/36 months, billing cycle) – not co-termed.
- **WhatsApp credits**: types Transactional, Promotional, Authentication; rep enters credit count and price per credit freely; **every WhatsApp credit line needs Amith's approval**. Prepaid (one-time section). The proposal still shows the standard WhatsApp markup.
- Dashboard: "Top-ups (upsell)" tile (won value, count, open value).

## Deal ID format (2026-11-16, Varaprasad)
- Deal IDs are **D-yyyymm-0001** (e.g. D-202611-0001); the counter restarts each month. Numbering tab DEAL row: year column holds the month (202611). Existing deals keep their old IDs. Client IDs stay C-0001.

## App address (2026-11-16, Varaprasad)
- Team URL: **https://salestools.optculturecx.com** (Netlify site optculture-salestools, Netlify DNS, wildcard HTTPS) → 302 redirect to the Apps Script /exec URL. Netlify site is **public**; access control stays with Google: @optculture.com sign-in (deployment access DOMAIN) + active row in the Users tab. Iframe embedding not used (sign-in unreliable in frames).

## Approvals show only what needs approval; reps get PDFs only (2026-11-16, Varaprasad)
- Every approval trigger is a structured item (area, item, reference price + label, proposed, % difference, note; MSA exceptions carry their text). Amith's card and email lead with "Needs your approval (N)"; full pricing is collapsed; draft PDF link.
- Reps/managers: one email with the PDFs attached (drafts: watermarked DRAFT PDFs, "do not send"); no Google Doc links in emails or in the app; only the PDF is shared with them (view only). The Superadmin keeps Doc links. Changes are made in the app and generated again.

## No Google Doc links for anyone (2026-11-16, Varaprasad)
- Amith (Superadmin) also gets PDF links only – emails, generation dialog, Generated documents / version history and approval cards. Google Docs stay in the Shared Drive only.

## Flow v2: Order Form first, client acceptance, MSA later (2026-11-21, Varaprasad)
- Proposal → **Quotation & Order Form** (commercial essentials only) → **sent to the client** → client **accepts online** (name, designation, one-time code by email, "I accept") **or uploads a signed PDF** → **MSA stage** (standard MSA, deviations only in §7, Amith approves §7) → MSA sent → accepted/uploaded → **Won**.
- Clients with an existing MSA, and top-ups: **Won when the Order Form is accepted**.
- Interim terms: until the MSA is signed, the Order Form is governed by the online ToS, DPA and SLA (governing line in the Order Form).
- Won only after the MSA (manual "Mark Won" = Superadmin override only). Commercials and parties are locked at the MSA stage.
- Link delivery: the app emails the client (PDF attached, secure link), reply-to/CC = rep. Links: random 64-hex token (only its SHA-256 stored, Acceptances tab), one document + version, expire (Order Form: quote validity; MSA: 30 days), single use, revoked on resend/regeneration, locked after 5 wrong codes. Client never gets Drive access (PDF streamed into the page; uploads saved by the app).
- Online acceptance adds an "Electronic Acceptance Certificate" page (name, designation, verified email, date/time Dubai + UTC, reference) to the accepted PDF. Reps can also record a signed copy received by email.
- Public page = a second deployment of the same project with access "Anyone" (Script property PUBLIC_EXEC_URL; optional ACCEPT_BASE_URL via Netlify /accept/:token). Every internal API still requires an @optculture.com user; owner tools require owner/Superadmin (requireOperator_); internal workers are private (getMaster_, nextDocNo_, generateDocument_).
- Open: Amith/legal to confirm electronic acceptance with email code for UAE, Egypt, KSA, India.

## Superadmin account (2026-11-22, Varaprasad)
- Amith's Superadmin account is **amith@optculture.com** (replaces amith.lulla@optculture.com permanently). All approvals are done from this account. Live Users tab, manager of Varaprasad and CommercialTerms.executive_contact_email updated.

## Acceptance page v2 + client emails (2026-11-22, Varaprasad)
- Client page: enter the code → **Verify** → "Verified as …" → step 3 (accept online / upload) unlocks for 30 minutes (separate session ticket; code is single-use).
- Client may add up to 5 extra addresses ("Also send the signed copy to"); saved on the deal (clientCc) and CC'd on later emails (MSA link and confirmations, top-ups).
- After acceptance/upload: ONE confirmation email with the signed PDF – To: client; CC: added addresses, rep (deal owner + sender) and Amith; reply-to rep. The separate internal "[Accepted]" email is dropped (next steps show in Action needed).
- Client email wording lives in the **EmailTemplates** tab (OF_SENT, CODE, OF_CONFIRMED, MSA_SENT, MSA_CONFIRMED) and is **editable by the Superadmin in Admin**; placeholders {Name} are validated on save. Every email carries the "system generated – contact your rep for changes" note. Users tab has a `title` column for the rep signature.

## Single stage – Proposal removed (2026-11-22, Varaprasad) – SUPERSEDES the two-step Proposal → Order Form flow
- New Deal → all Order Form information → **Generate Order Form** → send to client (accept online / upload signed) → MSA → Won. No Proposal document and no Convert step.
- The Proposal's page 1 becomes **page 1 of the Order Form** (cover: logo, "ORDER FORM FOR" client, country, title between gold rules, tagline, CONFIDENTIAL, date, Tel, Email, Ref). Title/tagline editable in step 3 ("Cover page").
- The document is named **ORDER FORM** everywhere (was "Quotation & Order Form").
- Order Form adds **Plan Inclusions** (what the chosen package includes). Executive summary, modules text, journeys and consulting rates are dropped.
- Packages: compare several in the app, pick one for the Order Form; only that package is printed and only its special prices need approval.
- Existing proposal-stage deals become Order Form drafts when opened (data kept; Order Form package defaults to the first quoted package).
- Order Form numbers: **OC-Q-yyyy-mm-0001**, counter restarts each month (Numbering row ORDER_FORM, year column "2026-11").
- Live template: "TEMPLATE – Order Form (EN) v1.3" (1ysPBpePlyq1wJ40tTeRnxFRhk329Oy3FNxQFUwJhLyc), registered after the code deploy; Proposal template deactivated then.
