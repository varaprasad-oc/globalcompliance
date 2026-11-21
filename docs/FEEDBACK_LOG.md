# Feedback round 1 (2026-11-15) – pending one consolidated deployment

| # | Feedback | Change | Where to test |
|---|---|---|---|
| 1 | Summary showed prices after step 1 | New deals start with no stores/packages; summary shows pricing only after stores + packages; "1 site" grammar | New Deal → step 1 → summary says "Pricing appears once…" |
| 2 | Special-price boxes shown for unselected packages | Boxes appear only for ticked packages (cleared when unticked) | Step 2 → tick Loyalty only |
| 3 | Show what's included as a table, add-ons below, lock unselected packages | New "What's included & add-ons" table: included = fixed ✔, not included = —, add-ons tickable per package; unselected package columns greyed + locked. Add-ons priced per package (e.g. Gift Cards only on Loyalty). AI add-ons listed as "Custom quote". Live Sheet: Features.addon_item_id column + 5 AI add-on rows in PriceItems | Step 2 table; Review / Proposal add-ons table |
| 4 | Order Form terms should be asked only when generating the Order Form; separate the flow | **Two-stage deals.** Stage 1 Proposal: client basics, pricing, proposal text → generates **Proposal only**. After the proposal is generated/sent: **Convert to Order Form** (button on Review and in My Deals). Stage 2: contract details (address, registration, contacts, signatory) + Order Form terms + DPA details → generates **Order Form + ToS/MSA + DPA together**. Same deal, same document numbers, no new version on conversion; proposal files are not archived when contract versions change. Approved proposal pricing carries over (contract docs final); changing prices needs re-approval. Screen now shows "approved by Amith" / "waiting" correctly | New Deal (banner "Stage 1 of 2") → Generate proposal → Convert → "Stage 2 of 2" |
| 5 | Select-all for add-ons and one-time services | "Select all" per package column on the Add-ons row of the table (locked for unselected packages, auto-updates when boxes are ticked individually) and next to "Optional one-time services" | Step 2 (Commercials) |

# Feedback round 2 (2026-11-15)
| # | Feedback | Change | Where to test |
|---|---|---|---|
| 6 | Blank first column in Optional One-Time, Communication Pricing, Consulting tables (PDF OC-P-2026-0001) | Root cause: labels were printed in **white** (engine deleted the tag before inserting text, so Google Docs copied the header's white style). Engine now inserts first, then removes the tag, so text keeps the template style. Same bug caused the wrong cover font sizes (client name small, country huge); fixed too | Generate a new proposal: all table labels visible, cover sizes correct |
| 7 | Journey shown as ": test" | Journeys without "Title:" get "Journey 1", "Journey 2"… | Proposal journeys |
| 8 | "1 stores / 1 sites" | Singular/plural wording (store/site) in proposal text, price table and Order Form. Proposal template v1.2 registered (needs code v12) | 1-store deal |
| 9 | Proposal must not calculate optional services or totals; totals only at Quotation & Order Form | Stage 1: optional services listed at rate-card price only (no hours box, no qty × price); proposal document shows unit prices only (no "Total licence / year", no "Total one-time fees"; install shown "per store"); Live summary and Review show unit prices + "Totals are calculated at the Order Form stage". Stage 2: hours/quantities, totals and first-year value (incl. optional services). Dashboard value for proposal-stage deals excludes optional services | Stage 1 summary/review and proposal PDF vs Stage 2 |
| 10 | Commercials can change at Order Form stage – make it visible | Proposal baseline saved at conversion; Review (stage 2), Live summary and Amith's approval card list "Changed since proposal" (stores, sites, market/currency, packages, price per site, add-ons per package, optional services, messaging prices). Baseline is server-owned | Convert → change stores/add-ons → Review |
| 11 | Currency: only India (INR) and South Africa (ZAR) in local currency; all others USD | Currency fixed by country and locked on the form; server enforces it. Live Countries tab: UAE AED→USD, Saudi Arabia SAR→USD | Step 2 currency field (greyed); UAE deal shows USD |
| 12 | Header looks like a mock – use the original logo | Real OptCulture logo embedded in the app header (white header, red accent line), so "Culture" in black is readable | Any screen, top left |
| 13 | Dashboard for everyone with quick-view reports | Dashboard is now the **home page for all roles** (rep = own deals, manager = team, Amith = all): tiles (open pipeline, won, win rate, proposal→Order Form conversion, waiting for approval, avg discount), **Action needed** list (convert sent proposals, send generated Order Forms, revise rejected, approvals) with one-click buttons, deal funnel, new deals over the last 6 months, top open deals, breakdowns by rep/status, country and package | Open the app |
| 14 | Price calculator too limited – ask add-ons first | Calculator now has: packages to compare, add-ons table per package (select all per package, locked for unticked packages), optional one-time services with hours (select all). Results: price/site, licence/year, add-ons per month & year (custom-quote add-ons named), recurring/year, set-up + installation, optional services, first-year total, overage; optional services breakdown; usage & communication | Price Calculator |
| 15 | Deal id too long; action buttons look ugly | New deals get short ids **D-2026-0001** (yearly counter; live Numbering tab has a DEAL row). My Deals: one "⋯" button per row opens a menu with icons – Open, Clone as new deal, Convert to Order Form (when available), Mark as Sent / Won / Lost; client name is clickable to open | My Deals |
| 16 | Discounts on one-time fees with approval | Step 2 table "One-time fees – current price & special price": per package Set-up, Installation per store, Installation per e-commerce site, plus each ticked optional service – shows standard price and a special-price field; below standard shows "Needs approval" and goes into Amith's approval (reason lists item, special vs standard, quantity). Specials flow into Proposal (unit price) and Order Form totals | Step 2 (Commercials) |
| 17 | Show one-time breakup, not a consolidated figure | Live summary, Review and Price Calculator list each one-time line (set-up, per store × n, per e-commerce site × n, each optional service) then the one-time total; "*" marks special prices | Stage 2 summary/Review, Price Calculator |
| 18 | Greyed Generate button doesn't say what's missing | "What's missing before you can generate" box above the button lists each blocking item (merged across documents) with its step and a **Fix →** link that jumps to the field and outlines all missing fields in red (outline clears as you fill). Hovering the button lists the same. Old duplicate "Missing information" list removed | Step 4 (Review) with an incomplete deal |
| 19 | 6 emails per generation; want one with Doc links and one with PDFs. Will Amith get approval emails? | The 6 emails were Google Drive "shared with you" notices (3 Docs + 3 PDFs). Files are now shared silently (Drive API, advanced service enabled in appsscript.json). The owner gets **2 emails**: (1) all Google Doc links, (2) all PDFs attached; drafts get only the links email marked DRAFT. Confirmed: approval requests email every Superadmin (Amith) with reasons, rep note and app link; the rep is emailed on approve/reject | Generate a contract → inbox |
| 20 | Order Form: column 1 still blank in sections 3/4/5; section 3 should start on page 2 | Real root cause: inserting text at the very start of a cell copies the previous element's style (white header). Engine now inserts inside the tag so it copies the tag's own style; test fake now mimics Google Docs exactly (old code fails it, new passes). New `{{PAGEBREAK}}` tag; Order Form template v1.2 starts "3. Products & Subscription Fees" on a new page | Generate an Order Form |

## 21. My Deals date range + pagination, latest first, dashboard period, idle-deal highlighting
- My Deals: date filter (All time / 7 / 30 / 90 days / This year / Custom from–to), 20 per page with Newer/Older buttons, sorted by last activity (last generated date, else last update), newest on top.
- Open deals with no update for `stale_days` (CommercialTerms, default 60) get a "⚠ No update N days" badge; "Needs follow-up only" filter.
- Dashboard: period selector (30/60/90 days, 6/12 months, All time); trend shows 12 months for long periods; new "Needs follow-up" card listing idle open deals (oldest first) with Open buttons.
- Live Master Sheet: CommercialTerms row `stale_days = 60` added.
- Verified: unit tests (dashboard period/stale), browser harness 70 checks pass.

## 22. Short client id
- New clients get C-0001, C-0002 … from a new Numbering row `CLIENT | C | - | 0` ("-" = never resets, no year). Falls back to the old timestamp id only if that row is missing.
- Deal screen title now shows: Client · D-2026-0001 · C-0001 · v1.
- Live sheet: CLIENT row added (last_no 1); the existing test client renamed C-261115-075620-597 → C-0001 in Clients and Deals.

## 23. MSA reference on the quote / Order Form as annexure of the MSA (hybrid)
- See DECISIONS "Contract pack: hybrid Agreement". Stage 2 step 3 shows "What will be generated" instead of the ToS/DPA tick boxes; Generate button reads "Generate Agreement (MSA + Order Form + DPA)" or "Generate Order Form".
- Engine: parts are generated, then the Order Form and DPA bodies are copied into the MSA after page breaks as Annexure A / B; one Doc + one PDF; part files are trashed.
- Live sheet: Clients columns msa_no, dpa_no, msa_deal_id, msa_date added.
- Tests: 3 new unit tests (Agreement numbers, Order-only citing the client MSA, manual reference); harness checks for the pack box and button.

## 24. Date column in "Generated documents"
- Date + time next to Version; list sorted newest first.

## 25. Partners master + partner performance
- See DECISIONS "Referral partners". Live sheet: Partners tab created (headers only – Superadmin adds partners). Unit test proves no document contains the partner.

## 26. Processing screen while documents are generated
- Full-screen overlay with spinner, elapsed seconds and the steps (save → create → combine → PDF → share/email); then a success dialog with the document links and "Back to My Deals" (automatic after 10 s; "Stay on this deal" or opening a link cancels it). Errors show in the same dialog.
- Also used for Convert to Order Form and Amith's "Approve & generate" (returns to Approvals).

## 27. Step 2 order + subscription special price as a table
- Order (Varaprasad's choice): Pricing basis → One-time fees (current & special) → Optional one-time services → Packages to quote → What's included & add-ons → **Subscription price – current & special** (table: Package | Standard / site / month | Special price | "Needs approval" badge, rows only for ticked packages) → Platform messaging.
- Harness checks the section order, the standard price (USD 75) and the approval badge.

## 28. Superadmin delete (test clean-up)
- My Deals (Superadmin only): tick boxes per deal + "select all on this page", "Delete selected (N)" button, confirm by typing DELETE.
- Server `apiDeleteDeals` (Superadmin only, re-checks role and the DELETE confirmation): moves every Google Doc and PDF of the deals (incl. archived versions) to the Drive trash (recoverable 30 days), trashes client folders left empty (never the root/type folders), deletes Deals, Documents and Approvals rows, and the Clients row if no other deal uses that client. Audit log keeps a DEALS_DELETED entry; document numbers are not reused.
- Tests: planner unit test (rows bottom-up, client kept when still used); harness: button visible for Superadmin, selection count, deal removed.

## 29. Management MSA format replaces generated ToS/DPA (see DECISIONS)
- Logic: CONTRACT docs = ORDER_FORM + MSA (or ORDER_FORM only under an existing MSA); exceptions → approval (re-approval when the text changes); MSA data (parties, online links, initial Order Form, courts, signatories, notice emails); ToS/DPA generation and the Agreement merge retired.
- Templates: live MSA template copied from management's doc + placeholders (all tokens verified against the data); live Order Form paragraph now cites the MSA and the online ToS/DPA/SLA; repo copy templates/msa.html.
- Live sheet: Templates (MSA active; TOS/DPA inactive), Numbering MSA row, Entities courts_city column, CommercialTerms tos_url/dpa_url/sla_url.
- UI: step 1 customer signatory email + notice email; step 3 "MSA – Special Terms and Exceptions (§7)" box (only when an MSA is generated), "What will be generated" box, button "Generate Order Form & MSA"; review shows the exceptions with "Needs Amith's approval".
- Tests: 81 unit tests and 85 browser checks pass.

## 30. Top-up Order Forms (see DECISIONS "Top-ups for Won deals")
- Pricing: `buildTopupQuote` (contracted price lock, contracted slab, installs only, comms packs, WhatsApp credits with approval). Logic: `makeTopUp`, `canTopUp`, `topupInput`; top-up fields server-owned.
- Server: `apiCreateTopUp`. Order Form data: `IsTopUp` header block, parent Order Form/deal refs, licence/add-on/comms lines, "N credits × price" lines. Live Order Form template: Top-up block + "Top-up Term" label.
- UI: ⋯ → Top-up; step 2 "Top-up items" box (licences, new add-ons only, comms packs, WhatsApp credit rows with amounts); top-up live summary; step 3 Order Form only; My Deals badge; dashboard tile.
- Tests: 7 unit tests (topup.test.js) + 7 browser checks.

## 31. Deal ID D-yyyymm-0001
- `numberingPeriod()` makes a Numbering row monthly when its year column holds yyyymm; live DEAL row set to 202611 / 0. Unit test covers month rollover.

## 32. installTriggers failed: missing OAuth scope
- Deploy of c1b763c: `installTriggers` → "Specified permissions are not sufficient to call ScriptApp.getProjectTriggers". Added `https://www.googleapis.com/auth/script.scriptapp` to appsscript.json. New unit test checks that every Apps Script service used in the code has its scope in the manifest.

## 33. Approval view + PDF-only for sales
- Pricing/top-up/evaluation return approvalItems; apiListApprovals adds items + document type; approvalEmailBody lists items; UI approval card redesigned (table + highlighted MSA terms + collapsed context).
- generateDocument always makes a PDF (drafts carry the banner) and shares only the PDF (reader); resync shares PDFs only; generationEmails = one email with PDFs; withoutDocLinks_ hides Doc links for non-Superadmins.
- Tests: approver email + single-email unit tests; harness checks the approval table, collapsed context and PDF link.

## 34. PDF-only for Superadmin too + long exception text wraps
- withoutDocLinks_ applies to every role; UI renders PDF links only.
- Long MSA exception text (incl. unbroken URLs) widened the review table by 368px; wrapping now scoped to free-text cells (.wraptext, li, .appr-terms); repeated exception shortened in the review approval list. Harness checks a very long exception for horizontal overflow.

## 35. Proposal cover page + page breaks + table style (from screenshots)
- New live template "TEMPLATE – Proposal (EN) v1.3" (1Zp5UfBv0IPD9eX_3PJBo-Qu1q_lrJHbd0wM09ApDO0I), registered in Templates (v1.2 kept in notes): cover page with logo, PROPOSAL FOR, client name (navy), country (gold italic), title between gold rules, tagline (red italic), CONFIDENTIAL + date + Tel + Email + Ref; page break after the cover and before "Detailed Break-up of Fees"; H1 headings with gold underline; all headings keep-with-next.
- Engine: generated tables get light-grey first column, padding, centred values, bold amounts (fees, licence); One-time fee table = Scope of Work | Fee | Payment Terms (Advance); proposal template tables get the same first-column shading. Cover logo up to 240px.

## 36. Tables never split across pages
- Engine: every top-level table with 2–22 rows is placed in an invisible 1×1 frame table; after save, the Docs API (advanced service "Docs", added to appsscript.json) marks the frame row preventOverflow, so the whole table moves to the next page. Tables > 22 rows (feature matrix) get a pinned (repeating) header row and no split rows. Pure request planner `tablePagingRequests` unit-tested; request shapes verified against the live Docs API on a scratch doc.

## 37. Flow v2 + client acceptance portal (see DECISIONS "Flow v2")
- Logic: STAGE_DOCS CONTRACT=[ORDER_FORM], MSA=[MSA]; new statuses (Order Form generated/sent/accepted, MSA generated/sent); applyAcceptance, canSendForAcceptance; MSA-stage approval only for §7; commercials locked at MSA stage; canSetStatus (Won = Superadmin override); dashboard "Waiting for client" and "MSA with legal".
- Portal: AcceptLogic.js (pure, tested), Accept.js (send/resend, record signed copy, token API, OTP, certificate PDF, notifications), AcceptPage.js (client page), doGet ?a=token route, Acceptances tab (live sheet created).
- Security hardening: operator tools guarded (requireOperator_), internal workers made private, backup throttled.
- Order Form template (repo + live): governing line until MSA, MSA reference "To follow after acceptance", "signing below or accepting electronically".
- UI: stage 3 (MSA), acceptance panel (Send/Resend, Record signed copy), locked fields, list/dashboard statuses. Tests: 96 unit, 103 browser checks, 8 client-page checks (tests/accept-ui.js).
