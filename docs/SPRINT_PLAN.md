# OptCulture Sales Document Generator — 10-Sprint Delivery Plan

**Goal:** The sales team enters one deal in a simple Google-login web app. It produces a standard **Proposal, Quotation & Order Form, Terms of Service, and DPA (PDPL) with SLA schedule** as Google Doc + PDF in Drive, with pricing from the master rate card, Gemini-drafted narrative, role-based visibility and superadmin approval.

**Stack (no high-end tech):** Google Apps Script web app · Google Sheets (master data + records) · Google Docs (templates) · Google Drive / Shared Drive (outputs) · Vertex AI Gemini (drafting) · GitHub + `clasp` (code versioning).

**Sprint length:** 1 week each (≈10 weeks). Owner codes: **OC** = OptCulture team · **DEV** = developer (Claude) · **AMITH** = superadmin sign-off · **LEGAL** = counsel.

---

## How this plan avoids rework

1. **All inputs are collected before Sprint 1** (Sprint 0 checklist below).
2. **Freeze gates.** Each foundational layer is signed off and frozen before anything is built on it:
   | Gate | Frozen at end of | What is frozen |
   |---|---|---|
   | G1 | Sprint 2 | Master Sheet schema (tabs, columns, IDs) |
   | G2 | Sprint 3 | Pricing formulas and outputs (matched to the rate card) |
   | G3 | Sprint 4 | Placeholder dictionary and template syntax |
   | G4 | Sprint 5 | Template wording (English), after legal review |
   | G5 | Sprint 6 | Deal form fields and flow |
3. **Changes after a gate** go into a "Change log" tab and are scheduled into Sprint 9 (polish), not mid-sprint.
4. **Each sub-sprint ends with a demo** to Varaprasad. Amith signs off at each gate.

---

## Sprint 0 — Inputs checklist (before Sprint 1)

| # | Input | Owner | Status |
|---|---|---|---|
| 0.1 | Shared Drive "OptCulture Sales Docs" created; Varaprasad = Content manager | AMITH | ☐ |
| 0.2 | Account `docs-admin@optculture.com` created; added to Shared Drive | OC IT | ☐ |
| 0.3 | Google Cloud project with billing; Vertex AI API enabled | Varaprasad | ☐ |
| 0.4 | User list: name, email, role (Rep / Manager / Superadmin), manager, region, phone | OC | ☐ |
| 0.5 | Entity & partner details: legal name, licence/CR no., address, signatory name and title, logo, countries served, bank details (if shown on Order Form) | OC | ☐ |
| 0.6 | Final feature list per package (reconcile rate card vs FRG proposal: Fraud Alerts, Xio Chatbot, Family Membership, etc.) | OC | ☐ |
| 0.7 | Module description paragraphs (master text for each feature) | OC | ☐ |
| 0.8 | Country → market type defaults, and country → DPA addendum mapping confirmation | OC | ☐ |
| 0.9 | DPA technical inputs: hosting provider and region, security measures, sub-processor list, platform entity for partner deals | OC Tech | ☐ |
| 0.10 | Logos, brand colours, fonts, letterhead/footer | OC | ☐ |
| 0.11 | 2–3 past real proposals and order forms for testing (anonymisable) | OC | ☐ |
| 0.12 | Legal reviewer identified for ToS, DPA and Order Form | AMITH | ☐ |

---

## Sprint 1 — Foundations & Access

**Goal:** Empty but secure app skeleton, live at a URL. Only @optculture.com users can log in and they see their role.

### 1.1 Workspace & Drive setup
1. Confirm Shared Drive access for Varaprasad and `docs-admin@` (0.1, 0.2).
2. Create folder structure:
   - `01 Proposals/`, `02 Quotations & Order Forms/`, `03 Terms of Service & PDPL/`
   - `_Templates/` (Superadmin + DEV edit only), `_Master DB/`, `_Archive/`
3. Decide and document sub-folder rule inside each: `<Year>/<Client Name>/` (file-level sharing controls visibility).
4. Write a Drive permissions matrix (who sees what) into `docs/SECURITY.md`.

### 1.2 Code project & repository
1. Create Apps Script project owned by `docs-admin@`, stored in the Shared Drive.
2. Set up `clasp` and link it to the GitHub repo; folder layout: `src/server/*.gs`, `src/ui/*.html`, `tests/`, `docs/`.
3. Add `appsscript.json` with explicit OAuth scopes (Drive, Docs, Sheets, Gmail send, external request for Vertex).
4. Link the Apps Script project to the Google Cloud project (0.3).
5. Write `docs/DEPLOY.md` covering push, version and deploy steps.

### 1.3 Authentication & role skeleton
1. Deploy the web app as **Execute as: docs-admin@** · **Access: Anyone within optculture.com**.
2. Server reads `Session.getActiveUser().getEmail()`; reject if not `@optculture.com` or not in the Users tab.
3. Minimal "Users" tab (temporary) and role lookup function.
4. Landing page shows name, role and an "Access denied" path for unknown users.
5. Test with three accounts: rep, manager, Amith.

**Exit criteria:** URL works; a non-domain account is blocked; roles display correctly; code is in GitHub.

---

## Sprint 2 — Master Data (Google Sheet)  → Gate G1

**Goal:** One Master Sheet holds every price, rule, list and record. Its schema is frozen at the end.

### 2.1 Schema design
Create tabs, each with an ID column and data validation:
1. `Users`: email, name, role, manager_email, region, phone, active
2. `Entities`: entity_id, type (OptCulture / Partner), legal name, reg type and no., address, signatory, title, logo file ID, countries, currency default, governing law
3. `Countries`: country, default market type, DPA addendum (4A–4F), default currency, tax note, default entity/partner
4. `Markets`: market, discount %
5. `Currencies`: code, FX rate vs USD, rounding step (default 5), symbol
6. `Slabs`: min stores, max stores, discount %
7. `Packages`: package, price/store/month, set-up fee, e-com install fee, overage per 1,000 receipts, receipts included per site
8. `OneTime`: item, unit (fixed / per store / per hour / per tier), USD price, package applicability
9. `AddOns`: item, monthly USD price, applicability per package
10. `Usage`: item (platform fee per 100k, WhatsApp, SMS, storage, Agentic tiers), rate or text, markup %
11. `Features`: feature, Engagement / Loyalty / Advanced = Included / Not included / Add-on, module description (EN), module description (AR), display order
12. `CommercialTerms`: key/value (offer validity days, uplift %, late fee %, payment days, liability cap months, non-solicit months, consulting rates)
13. `Numbering`: doc type, prefix, year, last number
14. `Templates`: doc type, language, template file ID, version, active
15. `AIPrompts`: prompt key, prompt text, model, temperature, example output
16. Records: `Deals`, `DealLines`, `Documents`, `Approvals`, `AuditLog`, `ChangeLog`

### 2.2 Data load
1. Migrate the rate card ("Pricing v2" + Settings) into the new tabs. Move hard-coded values (Agentic 2,500 / 10,000 / 500; data migration ÷4) into tables.
2. Load entities (USA, UAE "RIS Services DMCC", India) and partners (e.g. Congineer).
3. Load users (0.4), countries (0.8) and features with descriptions (0.6, 0.7).
4. Load commercial terms: WhatsApp +17.5%, email/push 250 per 100,000, liability 12 months, non-solicit 24 months, uplift 6%, late fee 1.5%, payment 30 days.

### 2.3 Protection & sign-off
1. Protect all master tabs (edit by Amith and DEV only); records tabs are written only by the app.
2. Add a "Schema" README tab describing every column.
3. Review with Varaprasad, then **Amith signs off → Gate G1 frozen.**

**Exit criteria:** All master data entered and validated; schema documented and frozen.

---

## Sprint 3 — Pricing Engine  → Gate G2

**Goal:** Server-side pricing that reproduces the rate card exactly, with the bugs fixed.

### 3.1 Core calculation
1. `getFactor(market, currency, storeCount, specialDisc)` = (1 − market) × FX × (1 − slab) × (1 − special). Slab is auto-selected from the store count.
2. Package price lines: per store/month, annual per store, total stores × price, e-com sites.
3. One-time lines: set-up, per-store install × stores, e-com install × sites, optional items.
4. Add-ons, usage and overage lines; text items ("custom quote", "at actuals + 17.5%") passed through.
5. Rounding to the currency's step (nearest 5), applied per unit price before totals.

### 3.2 Deal quote object
1. Define the `Quote` JSON (inputs, lines, subtotals, discount breakdown, special-price flag). This is the single object every template reads.
2. "Special price" input per package: compute the implied discount; **any special price/discount → approval required**.
3. Show both standard and special price columns (the Proposal shows both, the Order Form shows final).

### 3.3 Verification
1. Test cases: 10 combinations (each market × currency × slab) compared with the original sheet outputs.
2. Edge cases: 1 store, 99/100 store boundary, e-com only, INR/EGP rounding.
3. Write `tests/pricing.test.gs` with a one-click run and a report.
4. **Amith signs off on the test report → Gate G2 frozen.**

**Exit criteria:** All test cases match (allowing for the documented bug fixes); approval flag correct.

---

## Sprint 4 — Template Engine  → Gate G3

**Goal:** A generic engine that turns any Google Doc template + Quote/Deal data into a finished Doc and PDF.

### 4.1 Placeholder conventions
1. Syntax: `{{Field}}` text · `{{#IF Partner}}…{{/IF}}` conditional blocks · `{{TABLE:FeesOneTime}}` generated tables · `{{BLOCK:ModuleList}}` repeating paragraphs.
2. Formatting rules: currency (`USD 1,800`), dates (`1st November 2026`), percentages, empty-value handling (remove the row, never leave blanks).
3. Write the **Placeholder Dictionary** (`docs/PLACEHOLDERS.md`): every field, its source and example.

### 4.2 Engine build
1. Copy template → target folder → replace text placeholders (body, headers, footers, tables).
2. Conditional block removal.
3. Table builder: fees, feature matrix (✓ / ✕ / Add-on), usage, consulting, signatures; styling copied from a template sample row.
4. Paragraph/list builder for module descriptions and AI text.
5. Image placeholders: entity logo, partner logo.
6. PDF export, file naming `OC-P-2026-0001_<Client>_v1`, sharing (rep + manager + Amith), write to `Documents` tab.
7. Doc numbering with a lock (`LockService`) to avoid duplicate numbers.

### 4.3 Engine tests
1. Build a test template that uses every feature; generate with sample data.
2. Performance check: four documents in under 2 minutes (well within the Apps Script 6-minute limit).
3. **Gate G3: freeze the placeholder dictionary.**

**Exit criteria:** The test template generates a correct Doc + PDF in the correct folder with correct sharing.

---

## Sprint 5 — Document Templates (English)  → Gate G4

**Goal:** All four master templates finalised, legally reviewed and loaded in `_Templates`.

### 5.1 Proposal template
1. Convert the FRG proposal to the brand template: cover, confidentiality, Executive Summary (AI slot), OptCulture intro, `{{BLOCK:ModuleList}}`, optional multi-brand section, fees tables, plan matrix, communication pricing, consulting, notes, T&Cs.
2. Resolve inconsistencies: one validity rule, currency on every amount, no blank special-price rows.

### 5.2 Quotation & Order Form template
1. Sections 1–8 from the draft. "Issued under the MSA or, where none, the OptCulture Terms of Service."
2. Usage table aligned to the rate card; Section 3 driven by package + add-ons; Section 5 by one-time items.
3. Shared Commercial T&C block (same text as the Proposal), from `CommercialTerms`.
4. Signature block: entity or partner signatory filled in automatically.

### 5.3 ToS, DPA & SLA templates
1. ToS: add the 24-month non-solicitation clause, an entity list including RIS Services DMCC and the partner clause, and the Contracting Entity & Jurisdiction Schedule.
2. DPA: core plus addenda 4A–4F (from `docs/templates/DPA.md`); the addendum is auto-selected by country.
3. SLA schedule from the old Exhibit C (99.9% uptime, severity table, escalation matrix with amith.lulla@optculture.com, support hours).
4. Correct errors carried over from the old agreement (5.4, 2.1, 9.8, US-only IP indemnity).

### 5.4 Legal review & freeze
1. Send ToS, DPA, SLA and Order Form to LEGAL with a change summary.
2. Incorporate comments; record versions in the `Templates` tab.
3. **Amith signs off → Gate G4 frozen.**

**Exit criteria:** Four approved templates; each generates correctly with sample data.

---

## Sprint 6 — Sales Web App: Deal Entry  → Gate G5

**Goal:** Reps can create and save a deal with a live price preview.

### 6.1 App shell
1. Layout: header (user, role), left navigation (New Deal, My Deals, Approvals*, Admin*), OptCulture branding. *Visible by role.
2. Simple HTML/CSS (no frameworks beyond light CSS); mobile-friendly.

### 6.2 Deal wizard
1. **Step 1, Client:** legal name, short name, country (sets market default, entity/partner, DPA addendum, currency), address, reg no., contacts (business, billing), website, brands, POS, e-com platform. Reuse existing clients.
2. **Step 2, Commercials:** market (rep-selectable), currency, stores, e-com sites, packages to show, add-ons, optional one-time items, special price per package, subscription term, billing cycle, start date, PO no.
3. **Step 3, Documents:** tick Proposal / Order Form / ToS / DPA; language (EN / AR / bilingual); proposal options (multi-brand section, consulting tiers).
4. **Step 4, Review:** full price preview from the pricing engine, warnings (approval needed, missing fields).
5. Save as draft (`Deals` + `DealLines`), edit later, clone a deal.

### 6.3 Validation & sign-off
1. Required-field rules per document type (e.g. the Order Form needs legal entity and billing contact).
2. UX walkthrough with two reps; adjust labels.
3. **Gate G5: form fields frozen.**

**Exit criteria:** A rep can save a complete deal and see correct pricing.

---

## Sprint 7 — AI Drafting & Document Generation

**Goal:** One click produces the selected documents; the Gemini narrative is reviewed first.

### 7.1 Gemini integration
1. Vertex AI call from Apps Script (`UrlFetchApp` + OAuth token of the Cloud project); model and settings read from `AIPrompts`.
2. Prompt: rep notes + client fields + selected module names + FRG example → JSON `{executiveSummary, journeys[2], multiBrandIntro}`.
3. Guardrails: no prices, no features outside the selected list, length limits, retry and error handling.

### 7.2 Review UI
1. "Draft with AI" button in Step 3 → editable text boxes, Regenerate, tone (formal / concise), language.
2. Store the AI draft and the rep's final version separately in `Deals`.

### 7.3 Generate & version
1. "Generate" → runs the engine for each ticked document → links shown, plus an email to the rep.
2. If approval is needed: generate a **DRAFT-watermarked** Doc only; the final PDF comes after approval.
3. Revisions: edit deal → v2 documents (old versions kept in `_Archive`); a pricing change resets approval.

**Exit criteria:** End-to-end: deal → AI draft → four documents in the correct folders with correct sharing.

---

## Sprint 8 — Roles, Dashboards & Approvals

**Goal:** Everyone sees exactly what they should; Amith approves from the app.

### 8.1 Visibility
1. Server-side filters: Rep = own deals; Manager = team (via `manager_email`); Superadmin = all.
2. Every server function re-checks the role (never trust the browser).
3. Drive sharing re-sync if a rep's manager changes.

### 8.2 Dashboards
1. My Deals: list, status (Draft / Pending approval / Approved / Sent / Won / Lost), search and filters, open documents.
2. Manager view: team deals and pipeline totals.
3. Superadmin view: all deals, by rep / country / package, total contract value, discount given.

### 8.3 Approvals
1. Approval queue for Amith: deal summary, standard vs special price, discount %, margin note, rep comment.
2. Approve / Reject with comment → email to the rep → final documents generated automatically on approval.
3. `AuditLog`: every create, generate, approve, reject and view of a document.

**Exit criteria:** Role tests pass for all three roles; the approval flow works by email and in the app.

---

## Sprint 9 — Arabic, Admin Tools & Polish

**Goal:** Bilingual output, a self-service admin, and fixes from the change log.

### 9.1 Arabic / bilingual
1. Arabic templates (RTL) for ToS, DPA and Order Form; bilingual two-column option where required.
2. Professional legal translation (OC/LEGAL), then load into `Templates` (lang = AR).
3. Arabic module descriptions in `Features`; Gemini Arabic drafting option.
4. Fonts and RTL table checks in PDF.

### 9.2 Admin screens (Superadmin)
1. Manage users, roles and managers.
2. Edit prices, FX rates and commercial terms with an effective date (old deals keep old prices).
3. Upload a new template version (stored with version, old one kept).

### 9.3 Polish
1. Work through the `ChangeLog` items.
2. Error messages, loading states, empty states.
3. Speed tuning (caching master data with `CacheService`).

**Exit criteria:** An Arabic DPA and Order Form generate correctly; Amith can change a price without the developer.

---

## Sprint 10 — Testing, Security, Training & Go-Live

**Goal:** Safe launch to the whole sales team.

### 10.1 UAT
1. Test script: 15 scenarios (each country type, partner deal, special price, revision, Arabic, each role).
2. Pilot with two reps on real deals; fix defects.

### 10.2 Security & reliability
1. Review scopes, sharing and role checks; try access as an outsider and as another rep.
2. Daily backup of the Master Sheet (time-driven trigger copies to `_Archive`).
3. Failure alerts emailed to the admin; quota monitoring.

### 10.3 Launch
1. User guide (2 pages + 5-minute screen recording) and admin guide.
2. 45-minute training session for sales.
3. Go-live: share the app URL, add all users.
4. Two weeks of hypercare: daily check of logs and quick fixes.

**Exit criteria:** All UAT scenarios pass; Amith signs off; the sales team is live.

---

## Summary timeline

| Sprint | Week | Theme | Gate |
|---|---|---|---|
| 0 | before | Inputs collected | — |
| 1 | 1 | Foundations & access | — |
| 2 | 2 | Master Sheet | **G1** schema |
| 3 | 3 | Pricing engine | **G2** pricing |
| 4 | 4 | Template engine | **G3** placeholders |
| 5 | 5 | Templates + legal review | **G4** wording |
| 6 | 6 | Deal entry UI | **G5** form |
| 7 | 7 | AI drafting + generation | — |
| 8 | 8 | Roles, dashboards, approvals | — |
| 9 | 9 | Arabic, admin, polish | — |
| 10 | 10 | UAT, security, go-live | Go-live |

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Legal review delays (Sprint 5) | Send drafts to LEGAL in Sprint 3; the engine work continues in parallel |
| Arabic legal translation takes time | Start translation right after Gate G4; Arabic is optional at launch |
| Feature list keeps changing | Single `Features` tab; changes are data edits, not code changes |
| Apps Script quotas/time limits | Generate one document per call; cache master data; batch Docs API updates |
| Key person leaves | Shared Drive + `docs-admin@` ownership; code in GitHub |
