# Live Environment (Google Drive)

| Item | ID / link |
|---|---|
| Shared Drive "OptCulture Shared Docs" | `0ANyaAwry0iF7Uk9PVA` |
| 01 Proposals | `1_p_KNqiO9A-Pc_xBBmQ9MYDruL74y2Dh` |
| 02 Quotations & Order Forms | `1Ygz6J8pKJrj_m7wGlwwT903n5Nl_O0d2` |
| 03 Terms of Service & PDPL | `1cM72H739Z6-LcWdmFoh-rtMbADRJTUgr` |
| _Templates | `1M1DKOn3F78g266g-i3qQWXbZEAtxWzgX` |
| _Master DB | `1TVTxC63-rHlMQcmp2gUg3IMjDnV5LBEJ` |
| _Archive | `1YN_FITreDWFDhQP_NdT6_HMbWke0TqXZ` |
| **OptCulture Master DB** (Sheet) | `1JhduuRvkkn1m--MqBz6WwKD4Gj2uLCFcF14onzr6fKk` · https://docs.google.com/spreadsheets/d/1JhduuRvkkn1m--MqBz6WwKD4Gj2uLCFcF14onzr6fKk/edit |

| **Web app v1** (domain-only, runs as varaprasad@) | https://script.google.com/a/macros/optculture.com/s/AKfycbwKYpTw0Dd05z3gte-f9eSfAr8ycXRMw6lqpLMzurI-rUq4rvaH4xsTzekLg0vypcLy/exec |
| Self-test output (can be deleted) | Doc `1Ix75HK0mlEuAeJLf0M7-FqHWv0NZgj-Z7Wgdyt8k8UU`, PDF `1eVJmNNr1WTISSVIG9zajuAPiaSIm38-F` (01 Proposals/2026/SELFTEST) |

## Templates (_Templates folder, registered in the Templates tab)
| Doc type | Google Doc | Version | Source |
|---|---|---|---|
| PROPOSAL | `1s72XC8LpRC_NjXt8Ul0-dfmTmm5U__S1t0cr6hqBo_4` | 1.0 | templates/proposal.html |
| ORDER_FORM | `1zWWmZEwdYt0AbIiJ_aLRnRcYvMdipUYV90oJB9IpTKA` | 1.0 | templates/order_form.html |
| TOS (+SLA Schedule 2) | `11DZ90MAPfZjaEovyD0nM_rvsLapia53ZC-Js7FE4nlk` | 0.9-draft | docs/templates/TOS.md + SLA.md → `node tools/md2html.js` |
| DPA | `1WIZSDkWqRzNjObsfkUgZQYb7iKmNZcsTuZlPTgIQI2c` | 0.9-draft | docs/templates/DPA.md → `node tools/md2html.js` |

Logos/branding can be added directly in the Google Docs (static images); keep the {{…}} tags intact.

## Apps Script → Project Settings → Script Properties (paste these)
```
ROOT_FOLDER_ID      0ANyaAwry0iF7Uk9PVA
MASTER_SHEET_ID     1JhduuRvkkn1m--MqBz6WwKD4Gj2uLCFcF14onzr6fKk
FOLDER_PROPOSALS    1_p_KNqiO9A-Pc_xBBmQ9MYDruL74y2Dh
FOLDER_ORDER_FORMS  1Ygz6J8pKJrj_m7wGlwwT903n5Nl_O0d2
FOLDER_LEGAL        1cM72H739Z6-LcWdmFoh-rtMbADRJTUgr
FOLDER_TEMPLATES    1M1DKOn3F78g266g-i3qQWXbZEAtxWzgX
FOLDER_MASTER_DB    1TVTxC63-rHlMQcmp2gUg3IMjDnV5LBEJ
FOLDER_ARCHIVE      1YN_FITreDWFDhQP_NdT6_HMbWke0TqXZ
```
With these set, there's no need to run `setupAll()`; it would just find everything already in place.

## Master Sheet status
- 21 tabs created and loaded from `SeedData.js` (15 master + 6 record tabs) plus README.
- Dropdowns on: Users.role, Features package columns, Entities.type, Countries market/addendum, PriceItems category/basis.
- Protection: master tabs editable by amith.lulla@ and varaprasad@ only; record tabs by varaprasad@ only. Add docs-admin@ to both once it exists.
- Verified 2026-11-14: values read back from the live Sheet produce the same pricing as the automated tests (Emerging/EGP/47 sites: Loyalty EGP 4,020; Developed/USD: 90/125/175).
