# Progress Tracker

Legend: ✅ done · 🟡 in progress · ⏳ blocked (waiting on input) · ☐ not started

| Sprint | Theme | Status | Notes |
|---|---|---|---|
| 0 | Inputs checklist | 🟡 | Shared Drive access received ✅. Still open: docs-admin@ account, DPA tech inputs, feature descriptions, legal reviewer |
| 1 | Foundations & access | ✅ | Folders, Apps Script project, web app v1 deployed (domain-only), healthCheck passed. Follow-up: move ownership to docs-admin@ when created |
| 2 | Master Sheet | ✅ build · ⏳ G1 | Live and read by the app (14 master tabs, correct). Awaiting Amith sign-off (G1) |
| 3 | Pricing engine | ✅ build · ⏳ G2 | Live price check in Google: EGP 4,020 ✓. Awaiting Amith sign-off on 5 assumptions (G2) |
| 4 | Template engine | ✅ | engineSelfTest in Google: 0 warnings; Doc + PDF created in 01 Proposals/2026/SELFTEST; IF blocks, lists, TEXT, TABLE, EACH rows and fields verified in the output. Gate G3 (placeholders) ready to freeze |
| 5 | Templates + legal | 🟡 | Legal drafts ready for counsel: DPA.md, TOS.md (revised), SLA.md. ToS/SLA placeholders verified by test. DPA.md placeholders to be aligned to the dictionary when the Google Doc templates are built. |
| 6 | Deal entry UI | ☐ | |
| 7 | AI + generation | ☐ | |
| 8 | Roles, dashboards, approvals | ☐ | |
| 9 | Arabic, admin, polish | ☐ | |
| 10 | UAT & go-live | ☐ | |

## Log
- 2026-11-14: Plan agreed. Repo scaffolded. Offline work started on Sprints 1–3 while waiting for the Drive.
- 2026-11-14: Pricing engine + 14 tests passing; Apps Script scaffold, auth, Master Sheet setup script, price calculator UI committed. Shared Drive received (view-only access, so it's blocked).
- 2026-11-14: Sprint 4 engine built offline (21/21 tests). SECURITY.md and DEPLOY.md written. Drive access is still view-only.
- 2026-11-14: Revised ToS and SLA schedule drafted for legal review (22/22 tests).
- 2026-11-14: Shared Drive access granted. Created 6 folders and the Master DB Sheet (21 tabs, dropdowns, protection). Read-back check found 2 text values that Sheets had mis-parsed (phone numbers, 99.9%); fixed, and the setup script hardened. Live pricing verified.
- 2026-11-14: Amith's email corrected to amith.lulla@optculture.com everywhere, including the live Sheet.
- 2026-11-14: Web app v1 deployed by Varaprasad via Claude in Chrome. healthCheck OK; engineSelfTest OK (0 warnings), output document reviewed and correct. Sprints 1 and 4 complete.
