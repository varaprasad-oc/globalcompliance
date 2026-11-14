# Progress Tracker

Legend: ✅ done · 🟡 in progress · ⏳ blocked (waiting on input) · ☐ not started

| Sprint | Theme | Status | Notes |
|---|---|---|---|
| 0 | Inputs checklist | 🟡 | Shared Drive access received ✅. Still open: docs-admin@ account, DPA tech inputs, feature descriptions, legal reviewer |
| 1 | Foundations & access | ✅ | Folders, Apps Script project, web app v1 deployed (domain-only), healthCheck passed. Follow-up: move ownership to docs-admin@ when created |
| 2 | Master Sheet | ✅ build · ⏳ G1 | Live and read by the app (14 master tabs, correct). Awaiting Amith sign-off (G1) |
| 3 | Pricing engine | ✅ · G2 answered | 5 assumptions confirmed (docs/DECISIONS.md). Comms volume tiers live in web app v2. Amith to countersign G2 |
| 4 | Template engine | ✅ | engineSelfTest in Google: 0 warnings; Doc + PDF created in 01 Proposals/2026/SELFTEST; IF blocks, lists, TEXT, TABLE, EACH rows and fields verified in the output. Gate G3 (placeholders) ready to freeze |
| 5 | Templates + legal | ✅ build · ⏳ G4 | All 4 templates generate correctly live (8/8 sample docs, 0 warnings, reviewed). Logo + brand colours. Remaining: legal review of ToS/DPA/SLA and OC inputs (entity signatories, DPA tech details) → Gate G4. Deploy v5 for clean party lines |
| 6 | Deal entry UI | ✅ build · ⏳ G5 | 4-step wizard, live summary, review with approval/missing checks, save/open/clone drafts, My Deals with role filtering (32 unit tests + 10 browser checks). Needs v6 deploy + rep walkthrough → Gate G5 |
| 7 | AI + generation | ✅ build · ⏳ live | Gemini drafting via Vertex AI (guardrails: no prices, JSON, length), one-click generation of selected docs, stable doc numbers, DRAFT+approval request vs FINAL+PDF, versions archived, email to owner (40 unit tests + 16 browser checks). Needs Cloud project link + v7 deploy |
| 8 | Roles, dashboards, approvals | ✅ build · ⏳ live | Approvals queue (approve → final docs auto-generated; reject needs comment; emails both ways), Amith notified on request, Dashboard (manager: team; superadmin: all), My Deals search/filter + Sent/Won/Lost, audit of views/decisions, sharing re-sync tool (43 unit tests + 23 browser checks). Needs v7+v8 deploy |
| 9 | Arabic, admin, polish | ✅ build · ⏳ live | Arabic/bilingual support (RTL, AR dates, AR module text, per-document fallback to EN), Admin screens (14 master tabs, validation, ChangeLog), template registration with tag check, price snapshot per deal (old deals keep old prices), sharing re-sync, clone fix (48 unit tests + 30 browser checks). Arabic templates await professional translation (docs/TRANSLATION.md) |
| 10 | UAT & go-live | ☐ | |

## Log
- 2026-11-14: Plan agreed. Repo scaffolded. Offline work started on Sprints 1–3 while waiting for the Drive.
- 2026-11-14: Pricing engine + 14 tests passing; Apps Script scaffold, auth, Master Sheet setup script, price calculator UI committed. Shared Drive received (view-only access, so it's blocked).
- 2026-11-14: Sprint 4 engine built offline (21/21 tests). SECURITY.md and DEPLOY.md written. Drive access is still view-only.
- 2026-11-14: Revised ToS and SLA schedule drafted for legal review (22/22 tests).
- 2026-11-14: Shared Drive access granted. Created 6 folders and the Master DB Sheet (21 tabs, dropdowns, protection). Read-back check found 2 text values that Sheets had mis-parsed (phone numbers, 99.9%); fixed, and the setup script hardened. Live pricing verified.
- 2026-11-14: Amith's email corrected to amith.lulla@optculture.com everywhere, including the live Sheet.
- 2026-11-14: Web app v1 deployed by Varaprasad via Claude in Chrome. healthCheck OK; engineSelfTest OK (0 warnings), output document reviewed and correct. Sprints 1 and 4 complete.
- 2026-11-14: G2 pricing answers recorded. Platform comms switched to volume tiers (100k = 250, floor 100; 1M = 1,500, floor 500). Live Sheet: CommsTiers tab added, old PLATFORM_COMMS row deactivated. dist/ rebuilt — redeploy pending.
- 2026-11-14: Web app v2 deployed (comms tiers). healthCheck OK (15 master tabs, EGP 4,020). Sprint 5 started.
- 2026-11-14: Sprint 5: Proposal, Order Form, ToS (+SLA) and DPA templates created as Google Docs and registered. generateSampleDocs() added; v3 deploy pending.
- 2026-11-14: v3 sample run: Proposal/Order Form/ToS OK for both deals and reviewed; DPA failed (engine bug: emptying the last paragraph of a document). Fixed. Templates v1.1 uploaded (logo, red headings, purple table headers from a Sheet setting, add-ons table in the proposal). v4 deploy + re-run pending.
- 2026-11-14: v4 sample run: 8/8 documents OK incl. both DPAs (4D Egypt w/ partner sub-processor; 4B UAE). Logo inline, purple/white headers verified in document JSON. Fixed blank partner reg/address text → ToS/DPA v1.2 (needs v5 deploy).
- 2026-11-14: Sprint 6 built: DealLogic.js (pure, tested), Deals.js (Sheet storage + API with server-side access checks), new UI (wizard, My Deals, calculator). Browser harness passes 10/10.
- 2026-11-14: Sprint 7 built: AiLogic.js/GenLogic.js (pure, tested), Ai.js (Vertex), Generate.js (numbering, Documents/Approvals records, archive, email), UI AI + Generate. Awaiting GCP project for live AI.
- 2026-11-14: Sprint 8 built: Approvals.js, dashboard stats (pure), generation refactor (generateForDeal_), approver notification, UI Dashboard/Approvals/filters/status. Browser harness 23/23.
- 2026-11-14: Sprint 9 built: AdminLogic.js (pure), Admin.js, RTL in engine, Arabic data, price snapshots, UI Admin/language hints. Fixed: clones no longer reuse document numbers. Browser harness 30/30.
