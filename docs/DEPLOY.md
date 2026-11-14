# Setup & Deployment

One-time setup is done by Varaprasad, or by docs-admin@ once it exists.

## A. Apps Script project
1. Sign in to Google as **docs-admin@optculture.com** (or Varaprasad until it exists).
2. Go to https://script.google.com and click **New project**. Name it "OptCulture Sales Docs".
3. Open **Project Settings**:
   - Tick "Show appsscript.json".
   - Copy the **Script ID**.
   - Under "Google Cloud Platform (GCP) Project", link the Cloud project used for Vertex AI (Sprint 7).
4. Under **Script Properties**, add:
   - `ROOT_FOLDER_ID` = `0ANyaAwry0iF7Uk9PVA` (the Shared Drive ID)

## B. Push the code from this repo (one-time install of clasp on any computer)
```bash
npm install -g @google/clasp
```
```bash
clasp login
```
```bash
cp .clasp.json.example .clasp.json
```
Then edit `.clasp.json` and paste the Script ID.
```bash
clasp push
```

If you can't install clasp, you can copy-paste each file in `src/server/` and `src/ui/` into the Apps Script editor with the same names.

## C. Create folders + Master Sheet
1. In the Apps Script editor, select the function **setupAll** and click **Run**. Approve the permissions.
2. Check the log for the Master Sheet URL. All folders now exist in the Shared Drive.
3. Optional: run **engineSelfTest** and check the log shows `"warnings": []`.

## D. Deploy the web app
1. Click **Deploy**, then **New deployment**, and choose type **Web app**.
2. Set Execute as: **Me (docs-admin@)** and Who has access: **Anyone within optculture.com**.
3. Share the web app URL with the team.
4. For later updates: `clasp push`, then **Deploy > Manage deployments > Edit > New version**, so the URL stays the same.

## Tests (any computer with Node.js)
```bash
npm test
```
```bash
npm run placeholders
```
