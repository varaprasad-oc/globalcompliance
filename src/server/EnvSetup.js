/**
 * One-click environment setup: run setupScriptProperties() once from the Apps Script editor.
 * Values come from docs/ENVIRONMENT.md (IDs, not secrets).
 */
function setupScriptProperties() {
  requireOperator_();
  PropertiesService.getScriptProperties().setProperties({
    ROOT_FOLDER_ID: '0ANyaAwry0iF7Uk9PVA',
    MASTER_SHEET_ID: '1JhduuRvkkn1m--MqBz6WwKD4Gj2uLCFcF14onzr6fKk',
    FOLDER_PROPOSALS: '1_p_KNqiO9A-Pc_xBBmQ9MYDruL74y2Dh',
    FOLDER_ORDER_FORMS: '1Ygz6J8pKJrj_m7wGlwwT903n5Nl_O0d2',
    FOLDER_LEGAL: '1cM72H739Z6-LcWdmFoh-rtMbADRJTUgr',
    FOLDER_TEMPLATES: '1M1DKOn3F78g266g-i3qQWXbZEAtxWzgX',
    FOLDER_MASTER_DB: '1TVTxC63-rHlMQcmp2gUg3IMjDnV5LBEJ',
    FOLDER_ARCHIVE: '1YN_FITreDWFDhQP_NdT6_HMbWke0TqXZ'
  }, false);
  console.log('Script properties set: ' + JSON.stringify(PropertiesService.getScriptProperties().getProperties()));
}

/** Health check: confirms the app can read the Master Sheet and folders. Run after setupScriptProperties(). */
function healthCheck() {
  requireOperator_();
  var m = getMaster_(true);
  var out = {
    masterTabs: Object.keys(m).length,
    users: m.Users.length,
    packages: m.Packages.map(function (p) { return p.package + ' ' + p.price_per_site_month; }),
    me: getCurrentUser(),
    folders: ['PROPOSALS', 'ORDER_FORMS', 'LEGAL', 'TEMPLATES', 'ARCHIVE'].map(function (k) {
      return k + ': ' + DriveApp.getFolderById(getProp_('FOLDER_' + k)).getName();
    }),
    samplePrice: buildQuote(m, { market: 'Emerging', currency: 'EGP', stores: 46, ecomSites: 1, packages: ['Loyalty'] }).packages[0].standardPricePerSite + ' (expect 4020)'
  };
  console.log(JSON.stringify(out, null, 2));
  return out;
}
