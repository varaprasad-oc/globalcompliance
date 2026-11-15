# OptCulture Sales Docs – Admin Guide (Amith / Superadmin)

## Daily
- **Approvals** (menu shows a count; you also get an email): check proposed vs standard price, discount and first-year value → **Approve & generate final documents** or **Reject** with a comment.
- **Dashboard:** pipeline, won value, pending approvals, average discount; by status, rep, country, package.

## Admin screen
- **Master data:** pick a tab (Users, Packages, PriceItems, CommsTiers, Markets, Currencies, Slabs, Features, CommercialTerms, Entities, Countries, SubProcessors, Templates, AIPrompts) → **Edit** or **+ Add row** → give a reason → Save. Input is validated (e.g. discounts as 0.25, emails @optculture.com). Every change goes to ChangeLog and AuditLog. New deals use changes immediately; saved deals keep their frozen prices.
- **Add a sales rep:** Users → + Add row: email, name, role **Rep**, manager_email, phone, active TRUE. Do **not** add reps to the Shared Drive.
- **Change a rep's manager:** edit Users, then **Re-apply document sharing**.
- **Brand colour / logo / terms:** CommercialTerms (brand_table_header_bg, optculture_logo_file_id, payment_days, …).
- **New template version or Arabic template:** copy the template in _Templates, edit/translate keeping every {{tag}}, then **Register a new template version** → Check & activate (see docs/TRANSLATION.md).
- **Run go-live check** any time: lists blockers and data gaps.

## Safety nets
- Daily backup of the Master Sheet at 02:00 (Dubai) into _Archive/Backups (last 30 kept). To restore: copy the backup's tabs back, or point MASTER_SHEET_ID to the backup copy.
- Failure alerts are emailed to superadmins (and to `alert_email` in CommercialTerms, if set).
- Records tabs (Deals, Documents, Approvals, AuditLog, ChangeLog, Clients) are written by the app. Don't edit them by hand.
