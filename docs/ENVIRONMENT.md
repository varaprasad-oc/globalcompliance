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
