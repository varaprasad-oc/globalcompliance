/**
 * App configuration. Environment-specific IDs are stored in Script Properties (Project Settings > Script Properties),
 * never in code:
 *   MASTER_SHEET_ID   – the Master DB spreadsheet (set automatically by setupMasterSheet)
 *   ROOT_FOLDER_ID    – the Shared Drive / root folder Amith shares
 *   GCP_PROJECT_ID    – Google Cloud project for Vertex AI (Sprint 7)
 *   GCP_LOCATION      – e.g. me-central2 or us-central1 (Sprint 7)
 */
var CONFIG = {
  APP_NAME: 'OptCulture Sales Docs',
  ALLOWED_DOMAIN: 'optculture.com',
  ROLES: { REP: 'Rep', MANAGER: 'Manager', SUPERADMIN: 'Superadmin' },
  FOLDERS: {
    PROPOSALS: '01 Proposals',
    ORDER_FORMS: '02 Quotations & Order Forms',
    LEGAL: '03 Terms of Service & PDPL',
    TEMPLATES: '_Templates',
    MASTER_DB: '_Master DB',
    ARCHIVE: '_Archive'
  },
  MASTER_SHEET_NAME: 'OptCulture Master DB',
  CACHE_SECONDS: 300
};

function getProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function setProp_(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
}
