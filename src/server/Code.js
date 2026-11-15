/** Web app entry point and client-callable API (google.script.run). */

function doGet() {
  var t = uiTemplate_();
  return t.evaluate()
    .setTitle(CONFIG.APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/** First call from the browser: who am I + lists needed by the forms. */
function apiBootstrap() {
  var user = getCurrentUser();
  if (!user.ok) return { user: user };
  var m = getMaster();
  return {
    user: user,
    lists: {
      markets: m.Markets.map(function (r) { return r.market; }),
      currencies: m.Currencies.map(function (r) { return r.code; }),
      packages: m.Packages.filter(function (r) { return isTrue(r.active); }).map(function (r) { return r.package; }),
      features: featureMatrix(m, m.Packages.filter(function (r) { return isTrue(r.active); }).map(function (r) { return r.package; })),
      countries: m.Countries,
      addOns: m.PriceItems.filter(function (r) { return r.category === 'ADDON' && isTrue(r.active); })
        .map(function (r) { return { id: r.item_id, label: r.label, packages: r.packages }; }),
      oneTimeItems: m.PriceItems.filter(function (r) { return r.category === 'ONE_TIME' && r.item_id !== 'STORE_INSTALL' && isTrue(r.active); })
        .map(function (r) { return { id: r.item_id, label: r.label, unit: r.unit }; })
    }
  };
}

/** Live price preview (Sprint 3 / used by the deal wizard in Sprint 6). */
function apiPreviewQuote(input) {
  requireUser_();
  return buildQuote(getMaster(), input);
}

/** UI file is "ui/Index" when pushed with clasp, "Index" when pasted from dist/. */
function uiTemplate_() {
  try { return HtmlService.createTemplateFromFile('ui/Index'); } catch (e) { return HtmlService.createTemplateFromFile('Index'); }
}
