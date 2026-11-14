# CLAUDE.md — OptCulture Sales Document Generator

Project memory. Read this first in every session.

## What this is
A Google Workspace–only tool for OptCulture's sales team. A rep enters one deal in an Apps Script web app,
and it generates the **Proposal, Quotation & Order Form, Terms of Service, DPA (PDPL) + SLA schedule**
as Google Doc + PDF in a Shared Drive. Pricing comes from a Master Sheet; Gemini (Vertex AI) drafts the narrative.

## Key documents (keep up to date)
- `docs/SPRINT_PLAN.md`: the agreed 10-sprint plan with sub-sprints, tasks and freeze gates (G1–G5). **Follow it in order.**
- `docs/PROGRESS.md`: sprint status tracker. **Update it whenever a task or sprint finishes.**
- `docs/DECISIONS.md`: every business decision made with the user. Don't re-ask anything recorded there.
- `docs/templates/DPA.md`: draft DPA with country addenda (for legal review).

## Working agreements with the user (Varaprasad)
- When a sprint completes, give a **detailed sprint update**: what was built, how it was verified, open items, and what's needed from OptCulture.
- Ask questions as choose-one options (AskUserQuestion), one batch at a time.
- No high-end tech: Apps Script, Sheets, Docs, Drive only (plus Vertex AI Gemini).
- Superadmin and sole approver: Amith (CEO), amith.lulla@optculture.com. Users are all @optculture.com.
- Commit and push work to `main` (the stop hook requires a clean tree).

## Code layout
- `src/` is the clasp root (pushed to Apps Script). `src/server/*.js` (server), `src/ui/*.html` (client).
- `src/server/Pricing.js` and `src/server/SeedData.js` are pure JS and also run in Node for tests.
- `tests/`: Node tests (`npm test`); no dependencies needed.
- Never hard-code prices in code. All prices and rules live in the Master Sheet (seeded from `SeedData.js`).
