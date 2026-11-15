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

| **Web app v1** (domain-only, runs as varaprasad@; v4 live, v5 pending) | https://script.google.com/a/macros/optculture.com/s/AKfycbwKYpTw0Dd05z3gte-f9eSfAr8ycXRMw6lqpLMzurI-rUq4rvaH4xsTzekLg0vypcLy/exec |
| Self-test output (can be deleted) | Doc `1Ix75HK0mlEuAeJLf0M7-FqHWv0NZgj-Z7Wgdyt8k8UU`, PDF `1eVJmNNr1WTISSVIG9zajuAPiaSIm38-F` (01 Proposals/2026/SELFTEST) |

## Guides (Shared Drive → Guides `1zwXr_96_iEKQ-jH4XytbbIXZLoKgUvAB`)
| Guide | Google file |
|---|---|
| User Guide (Sales) | `1oyUog00ya_j8XyT6rutNA0Zj7Ov7VHtpIiW8xy7QB3Y` |
| Admin Guide | `1s_7sarPF4lfEqkNfa3Xd0hO3zV1i-J6gdIn2n-TpwTU` |
| Go-live Plan | `12fnn8VTnNL4nop4vy9NrlNp4J-Xno4UW8Fe6qDZka0w` |
| UAT Checklist (Sheet) | `1RHq_Ts-cQ95vSKUJyFe9run16ysbI-V1kp_cczUPtl8` |

## Templates (_Templates folder, registered in the Templates tab)
| Doc type | Google Doc | Version | Source |
|---|---|---|---|
| PROPOSAL | `15P0tySL51h0nO4jOD_Xz9MtYL2Y0R9GoS5aAkEm4dc8` | 1.2 | templates/proposal.html |
| ORDER_FORM | `1murHdOTD1S4BEpUXKmjCuEu_ulI4If8H7rMRm4anU04` | 1.1 | templates/order_form.html |
| TOS (+SLA Schedule 2) | `1QKr3CwlWgbpLTElTxTaOFG-gLuwyWKXM66gTHK2u--k` | 1.2-draft | docs/templates/TOS.md + SLA.md → `node tools/md2html.js` |
| DPA | `1hFHe5yts99MqTMaf2QHHieMc4LST23HR_ZquSdpD1ZI` | 1.2-draft | docs/templates/DPA.md → `node tools/md2html.js` |

v1 templates moved to _Archive. OptCulture logo: `1dURALQP4yA58Fp5eSZY509NrB3gqagb9` (_Templates/OptCulture logo.png), referenced by CommercialTerms.optculture_logo_file_id.
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
