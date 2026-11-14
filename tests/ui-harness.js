/* Browser test of src/ui/Index.html with google.script.run mocked by the real pure server logic (Node).
   Usage: node tests/ui-harness.js <screenshotDir>   (uses the pre-installed Playwright) */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = vm.createContext({ console });
['Util.js', 'SeedData.js', 'Pricing.js', 'DocData.js', 'DealLogic.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src/server', f), 'utf8'), ctx));
const M = ctx.masterFromSeed(ctx.SEED);
const USER = { ok: true, email: 'varaprasad@optculture.com', name: 'Varaprasad SN', role: 'Manager' };
const store = { deals: {}, clients: [] }; let seq = 0;
const api = {
  apiBootstrap: () => ({ user: USER, lists: { markets: M.Markets.map((r) => r.market), currencies: M.Currencies.map((r) => r.code), packages: M.Packages.map((r) => r.package), countries: M.Countries,
    addOns: M.PriceItems.filter((r) => r.category === 'ADDON').map((r) => ({ id: r.item_id, label: r.label, packages: r.packages })),
    oneTimeItems: M.PriceItems.filter((r) => r.category === 'ONE_TIME' && r.item_id !== 'STORE_INSTALL').map((r) => ({ id: r.item_id, label: r.label, unit: r.unit })) } }),
  apiFormLists: () => ({ countries: M.Countries, entities: M.Entities.map((e) => ({ id: e.entity_id, name: e.legal_name, type: e.type, country: e.country })),
    commsTiers: M.CommsTiers.map((t) => ({ id: t.tier_id, messages: t.messages, label: t.label })), clients: store.clients }),
  apiEvaluateDeal: (d) => { ctx.applyCountryDefaults(M, d); return { deal: d, evaluation: ctx.evaluateDeal(M, d) }; },
  apiSaveDeal: (d) => { ctx.applyCountryDefaults(M, d); const ex = d.dealId ? store.deals[d.dealId] : null; if (!d.dealId) { d.dealId = 'D-TEST-' + (++seq); d.version = 1; d.status = 'Draft'; }
    const ev = ctx.evaluateDeal(M, d); const rec = ctx.dealRecord(d, ev, USER.email, new Date().toISOString(), ex); store.deals[d.dealId] = rec; return { deal: d, evaluation: ev, summary: ctx.dealSummary(rec) }; },
  apiListDeals: () => Object.values(store.deals).map(ctx.dealSummary),
  apiGetDeal: (id) => { const r = store.deals[id]; const d = JSON.parse(r.input_json); return { deal: d, evaluation: ctx.evaluateDeal(M, d), summary: ctx.dealSummary(r) }; },
  apiCloneDeal: (id) => { const c = ctx.cloneDeal(JSON.parse(store.deals[id].input_json), null); c.dealId = null; return api.apiSaveDeal(c); },
  apiPreviewQuote: (i) => ctx.buildQuote(M, i)
};
(async () => {
  const out = process.argv[2] || '.';
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1300, height: 1000 } });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.exposeFunction('__api', (fn, argsJson) => JSON.stringify(api[fn](...JSON.parse(argsJson))));
  await p.addInitScript(() => {
    const mk = () => { let s, f; const o = new Proxy({}, { get: (t, k) => k === 'withSuccessHandler' ? (x) => { s = x; return o; } : k === 'withFailureHandler' ? (x) => { f = x; return o; }
      : (...a) => { window.__api(k, JSON.stringify(a)).then((r) => s && s(JSON.parse(r))).catch((e) => f && f(e)); } }); return o; };
    window.google = { script: { get run() { return mk(); } } };
  });
  await p.goto('file://' + path.join(__dirname, '..', 'src/ui/Index.html'), { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#view-deal:not(.hidden)');
  const check = (name, cond) => { console.log((cond ? '  ✓ ' : '  ✗ ') + name); if (!cond) process.exitCode = 1; };

  await p.fill('[data-f="client.legalName"]', 'Fashion Retail Group S.A.E.');
  await p.fill('[data-f="client.shortName"]', 'FRG');
  await p.selectOption('#country', 'Egypt');
  check('Country sets market/currency/partner', (await p.inputValue('#market')) === 'Emerging' && (await p.inputValue('#currency')) === 'USD' && (await p.inputValue('#entity')) === 'P-EG-CONGINEER');
  await p.fill('[data-f="client.address"]', 'Cairo, Egypt');
  await p.fill('[data-f="client.businessContact.email"]', 'buyer@frg.example');
  await p.click('#btnNext');
  await p.fill('[data-f="commercial.stores"]', '46'); await p.fill('[data-f="commercial.ecomSites"]', '1');
  await p.check('input[data-arr="commercial.packages"][value="Advanced"]');
  await p.fill('input[data-map="commercial.specialPrices"][data-key="Loyalty"]', '70');
  await p.check('input[data-arr="commercial.addOns"][value="GIFT_CARDS"]');
  await p.waitForTimeout(900);
  check('Live summary shows approval badge', (await p.textContent('#side')).includes('Needs Amith'));
  check('Order Form package list follows packages', (await p.$$eval('#orderPackage option', (o) => o.map((x) => x.value))).join() === 'Loyalty,Advanced');
  await p.click('#btnNext'); await p.click('#btnNext'); await p.waitForTimeout(600);
  const review = await p.textContent('#review');
  check('Review shows special price USD 70 and approval reason', review.includes('USD 70') && review.includes('Approval required'));
  check('Review flags missing billing contact for Order Form', review.includes('Billing contact email'));
  await p.screenshot({ path: path.join(out, 'sprint6-review.png'), fullPage: true });
  await p.click('#btnSave'); await p.waitForTimeout(400);
  check('Saved: title shows deal id', (await p.textContent('#dealTitle')).includes('D-TEST-1'));
  await p.click('nav a[data-view="list"]'); await p.waitForTimeout(300);
  check('My Deals lists the deal', (await p.textContent('#dealList')).includes('Fashion Retail Group'));
  await p.screenshot({ path: path.join(out, 'sprint6-list.png'), fullPage: true });
  await p.click('[data-clone="D-TEST-1"]'); await p.waitForTimeout(400);
  check('Clone opens a new draft', (await p.textContent('#dealTitle')).includes('D-TEST-2') && (await p.inputValue('[data-f="client.shortName"]')) === 'FRG');
  await p.click('nav a[data-view="list"]'); await p.waitForTimeout(300);
  await p.click('[data-open="D-TEST-1"]'); await p.waitForTimeout(400);
  check('Open restores special price', (await p.inputValue('input[data-map="commercial.specialPrices"][data-key="Loyalty"]')) === '70');
  check('No page errors', errors.length === 0); if (errors.length) console.log(errors);
  await b.close();
})();
