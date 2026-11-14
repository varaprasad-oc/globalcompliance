# Security & Access Model

## Who sees what
| Item | Rep | Manager | Superadmin (Amith) | App account (docs-admin@) |
|---|---|---|---|---|
| Web app | ✅ own deals | ✅ own + team deals | ✅ all deals | runs the app |
| Generated Docs / PDFs | Editor on own files only | Editor on team files | Shared Drive manager (all) | Content manager |
| Master Sheet – price tabs | ✕ | ✕ | Edit | Edit |
| Master Sheet – record tabs | ✕ | ✕ | View | Edit (the app writes them) |
| `_Templates` folder | ✕ | ✕ | Edit | Edit |

## Rules
1. **Reps and managers must NOT be members of the Shared Drive.** Shared Drive members can see every file. Access is granted per file by the app.
2. Shared Drive members: Amith (Manager), Varaprasad (Content manager, setup/admin), docs-admin@ (Content manager).
3. Shared Drive setting: **turn on "Only people in OptCulture can access"**. It's currently off.
4. The web app is deployed **Execute as: docs-admin@** and **Access: Anyone within optculture.com**. The server re-checks the user's role on every call (`requireUser_`); the browser is never trusted.
5. Price changes are made only in the Master Sheet's protected tabs (Superadmin).
6. Every create, generate, approve and reject action is written to `AuditLog`.
7. Vertex AI (Gemini) runs inside OptCulture's own Google Cloud project; prompts contain only the rep's notes and standard module text, never prices.
