# User Acceptance Testing (Sprint 10.1)

Run in the live app (web app URL in docs/ENVIRONMENT.md). Use client names starting with **"UAT –"** so test deals are easy to find and delete afterwards.
Record each result in the UAT Google Sheet (Shared Drive → Guides).

| # | Who | Scenario | Steps | Expected result |
|---|---|---|---|---|
| 1 | Rep | UAE direct deal, standard price | New deal → country UAE, 3 stores, Loyalty → all 4 docs → Generate | Entity RIS Services DMCC, AED, 4 final Docs + PDFs, status Generated, email received |
| 2 | Rep | Egypt partner deal | Country Egypt, 46 stores + 1 e-com, Loyalty + Advanced | Market Emerging, USD, Congineer on cover/Order Form, DPA addendum 4D only, OptCulture US listed as sub-processor |
| 3 | Rep | Saudi deal, partner required | Country Saudi Arabia, leave contracting party empty | "Contracting entity / partner" missing; Generate disabled until a partner is chosen |
| 4 | Rep | India deal | Country India, INR | Market India Only (75%), INR prices rounded to nearest 5, DPA addendum 4C |
| 5 | Rep | Special price below standard | Loyalty special price below standard → Generate | DRAFT Docs (red banner, no PDF), status Pending approval, Amith gets email |
| 6 | Amith | Approve | Approvals → review card → Approve | Final Docs + PDFs created automatically, rep emailed, deal Generated |
| 7 | Amith | Reject | Another special-price deal → Reject without comment, then with comment | Without comment: blocked. With comment: rep emailed, deal Rejected → editing returns it to Draft |
| 8 | Rep | Messaging below floor | Negotiated 100k price under floor (e.g. 80) | Approval reason says "BELOW FLOOR" |
| 9 | Rep | AI draft | Step 3 notes → Draft with AI (Formal, then Concise) | Summary + 2 journeys filled, no prices in text, editable |
| 10 | Rep | Revision | Open a Generated deal → change stores → Generate | Version v2, same document numbers, v1 files moved to _Archive |
| 11 | Rep | Clone | My Deals → Clone | New deal id, new document numbers on generation, today's prices |
| 12 | Rep | Visibility | Rep A opens app | Sees only own deals; cannot open Rep B's deal by id |
| 13 | Manager | Team view | Manager → My Deals + Dashboard | Sees own + team deals and totals; no Approvals/Admin menu |
| 14 | Amith | Admin price change | Admin → Packages → change a price | New deals use it; existing deals keep frozen price; ChangeLog row written |
| 15 | Amith | Template check | Admin → paste a template copy with a broken tag → Check | Unknown tag reported; activation refused |
| 16 | Outsider | Domain block | Open URL with a non-optculture Google account | Access denied |
| 17 | Rep | Pipeline | Mark a generated deal Sent → Won | Status updates; Dashboard Won total increases |

**Pass criteria:** all scenarios pass, or failures are fixed and re-tested. The pilot (2 reps, real deals, 1 week) starts after UAT.
