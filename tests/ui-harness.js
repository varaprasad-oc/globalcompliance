/* Browser test of src/ui/Index.html with google.script.run mocked by the real pure server logic (Node).
   Usage: node tests/ui-harness.js <screenshotDir>   (uses the pre-installed Playwright) */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = vm.createContext({ console });
['Util.js', 'SeedData.js', 'Pricing.js', 'DocData.js', 'DealLogic.js', 'AiLogic.js', 'GenLogic.js', 'AdminLogic.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src/server', f), 'utf8'), ctx));
const M = ctx.masterFromSeed(ctx.SEED);
M.Templates = ['PROPOSAL', 'ORDER_FORM', 'TOS', 'DPA'].map((t) => ({ doc_type: t, language: 'EN', file_id: 'f-' + t, active: true })).concat([{ doc_type: 'TOS', language: 'AR', file_id: 'f-ar', active: true }]);
let USER = { ok: true, email: 'varaprasad@optculture.com', name: 'Varaprasad SN', role: 'Manager' };
const store = { deals: {}, clients: [], approvals: [] }; let seq = 0;
const api = {
  apiBootstrap: () => ({ user: USER, lists: { markets: M.Markets.map((r) => r.market), currencies: M.Currencies.map((r) => r.code), packages: M.Packages.map((r) => r.package), countries: M.Countries,
    addOns: M.PriceItems.filter((r) => r.category === 'ADDON').map((r) => ({ id: r.item_id, label: r.label, packages: r.packages })),
    oneTimeItems: M.PriceItems.filter((r) => r.category === 'ONE_TIME' && r.item_id !== 'STORE_INSTALL').map((r) => ({ id: r.item_id, label: r.label, unit: r.unit })) } }),
  apiFormLists: () => ({ aiEnabled: true, languages: ctx.availableLanguages(M), countries: M.Countries, entities: M.Entities.map((e) => ({ id: e.entity_id, name: e.legal_name, type: e.type, country: e.country })),
    commsTiers: M.CommsTiers.map((t) => ({ id: t.tier_id, messages: t.messages, label: t.label })), clients: store.clients }),
  apiEvaluateDeal: (d) => { const m = ctx.withSnapshot(M, d.refreshPrices ? null : d.pricingSnapshot); ctx.applyCountryDefaults(m, d); return { deal: d, evaluation: ctx.evaluateDeal(m, d) }; },
  apiSaveDeal: (d) => { ctx.applyCountryDefaults(M, d); const ex = d.dealId ? store.deals[d.dealId] : null; if (!d.dealId) { d.dealId = 'D-TEST-' + (++seq); d.version = 1; d.status = 'Draft'; }
    if (!d.pricingSnapshot || d.refreshPrices) { d.pricingSnapshot = ctx.pricingSnapshot(M); delete d.refreshPrices; }
    const ev = ctx.evaluateDeal(ctx.withSnapshot(M, d.pricingSnapshot), d); const rec = ctx.dealRecord(d, ev, USER.email, new Date().toISOString(), ex); store.deals[d.dealId] = rec; return { deal: d, evaluation: ev, summary: ctx.dealSummary(rec) }; },
  apiListDeals: () => Object.values(store.deals).map(ctx.dealSummary),
  apiGetDeal: (id) => { const r = store.deals[id]; const d = JSON.parse(r.input_json); return { deal: d, evaluation: ctx.evaluateDeal(ctx.withSnapshot(M, d.pricingSnapshot), d), summary: ctx.dealSummary(r) }; },
  apiCloneDeal: (id) => { const c = ctx.cloneDeal(JSON.parse(store.deals[id].input_json), null); c.dealId = null; return api.apiSaveDeal(c); },
  apiPreviewQuote: (i) => ctx.buildQuote(M, i),
  apiDraftNarrative: (d, o) => { ctx.buildNarrativePrompt(M, d, o); return ctx.sanitizeNarrative(JSON.stringify({ executiveSummary: 'FRG is a leading franchisee.\n\nOne program for every brand. It costs USD 70.', journeys: ['Win-back: lapsed shoppers get bonus points.'], multiBrandIntro: 'Shared wallet.' }), M); },
  apiGenerateDocs: (id) => { const rec = store.deals[id]; const d = JSON.parse(rec.input_json); const ev = ctx.evaluateDeal(M, d); const plan = ctx.planGeneration(d, ev, rec.approval_status);
    if (!plan.ok) throw new Error(plan.reason); d.docNos = { PROPOSAL: 'OC-P-2026-0001', ORDER_FORM: 'OC-Q-2026-0001', TOS: 'OC-TOS-2026-0001', DPA: 'OC-DPA-2026-0001' }; d.status = plan.status;
    const nr = ctx.dealRecord(d, ev, USER.email, new Date().toISOString(), rec);
    if (plan.mode === 'DRAFT' && rec.approval_status !== 'Pending') { nr.approval_status = 'Pending'; store.approvals.push({ approvalId: 'A-1', dealId: id, reasons: ev.approvalReasons }); }
    store.deals[id] = nr;
    return { mode: plan.mode, message: plan.reason, deal: d, results: plan.docTypes.map((t) => ({ type: t, label: t, docNo: d.docNos[t], docUrl: 'https://docs.google.com/x', pdfUrl: plan.mode === 'FINAL' ? 'https://drive.google.com/y' : '', warnings: [] })) }; },
  apiDealDocuments: () => [],
  apiListApprovals: () => store.approvals.filter((a) => !a.decision).map((a) => { const r = store.deals[a.dealId]; const q = JSON.parse(r.quote_json); const d = JSON.parse(r.input_json);
    return { approvalId: a.approvalId, dealId: a.dealId, version: 1, requestedAt: '2026-11-14', requestedBy: 'Varaprasad SN', reasons: a.reasons, note: d.approvalNote || '', client: d.client.legalName,
      country: d.client.country, currency: r.currency, summary: ctx.dealSummary(r), comms: [], documents: [],
      packages: q.packages.map((p) => ({ name: p.package, standard: p.standardPricePerSite, final: p.finalPricePerSite, list: p.listPricePerSite, specialDiscountPct: p.specialDiscountPct, effectiveDiscountPct: p.effectiveDiscountPct, firstYear: p.firstYearTotal })) }; }),
  apiDecideApproval: (aid, dec, comment) => { const a = store.approvals.find((x) => x.approvalId === aid); a.decision = dec; const r = store.deals[a.dealId]; r.approval_status = dec; r.status = dec === 'Approved' ? 'Approved' : 'Rejected';
    const gen = dec === 'Approved' ? api.apiGenerateDocs(a.dealId) : null; return { decision: dec, generation: gen }; },
  apiDashboard: () => { const rows = Object.values(store.deals).map(ctx.dealSummary); return { stats: ctx.dashboardStats(rows, [{ email: 'varaprasad@optculture.com', name: 'Varaprasad SN' }]), deals: rows }; },
  apiAdminTabs: () => Object.keys(ctx.ADMIN_TABS),
  apiAdminGetTab: (tab) => ({ tab, headers: ctx.SEED[tab].headers, key: ctx.ADMIN_TABS[tab].key, rows: M[tab].map((r, i) => Object.assign({ _row: i + 2 }, r)) }),
  apiAdminSaveRow: (tab, rowNo, obj) => { const r = ctx.coerceAdminRow(tab, ctx.SEED[tab].headers, obj); if (!r.ok) throw new Error(r.errors.join('; '));
    if (rowNo) M[tab][rowNo - 2] = r.row; else M[tab].push(r.row); return { ok: true, changed: ['x'] }; },
  apiAdminCheckTemplate: () => ({ title: 'Doc', unknown: ['Typo'], ifBalanced: true, ok: false }),
  apiResyncSharing: () => 0,
  apiGoLiveCheck: () => { const f = ctx.goLiveFindings(M, {}); return { summary: { blockers: f.filter((x) => x.level === 'BLOCKER').length, warnings: f.filter((x) => x.level === 'WARN').length }, findings: f }; },
  apiSetDealStatus: (id, st) => { const r = store.deals[id]; if (!ctx.canSetStatus(r.status, st)) throw new Error('not allowed'); r.status = st; return ctx.dealSummary(r); }
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
  // Sprint 7: AI draft + generate
  await p.click('#steps div[data-step="3"]');
  await p.fill('[data-f="narrative.notes"]', 'Franchisee for SKECHERS, ANTA, ECCO; 46 stores; one program.');
  await p.click('#btnAi'); await p.waitForTimeout(500);
  const es = await p.inputValue('[data-f="narrative.executiveSummary"]');
  check('AI fills the summary and strips the money sentence', es.includes('leading franchisee') && !es.includes('USD 70'));
  check('AI fills journeys', (await p.inputValue('[data-f="narrative.journeys"]')).startsWith('Win-back'));
  await p.click('#steps div[data-step="1"]');
  await p.fill('[data-f="client.billingContact.email"]', 'finance@frg.example');
  await p.click('#steps div[data-step="4"]'); await p.waitForTimeout(700);
  check('Generate button enabled when complete', !(await p.isDisabled('#btnGenerate')));
  check('Hint says drafts + approval', (await p.textContent('#genHint')).includes('DRAFTS'));
  await p.click('#btnGenerate'); await p.waitForTimeout(800);
  const gr = await p.textContent('#genResult');
  check('Draft documents listed with numbers', gr.includes('Draft documents created') && gr.includes('OC-DPA-2026-0001'));
  check('Status badge shows Pending approval', (await p.textContent('#dealStatus')).includes('Pending approval'));
  await p.screenshot({ path: path.join(out, 'sprint7-generated.png'), fullPage: true });
  // Sprint 8: Amith approves, dashboard, pipeline status
  USER = { ok: true, email: 'amith.lulla@optculture.com', name: 'Amith Lulla', role: 'Superadmin' };
  await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForSelector('#view-deal:not(.hidden)'); await p.waitForTimeout(500);
  check('Approvals menu shows 1 pending', (await p.textContent('#apprCount')).trim() === '1');
  await p.click('nav a[data-view="appr"]'); await p.waitForTimeout(400);
  const ap = await p.textContent('#appr');
  check('Approval card shows proposed USD 70 and special discount', ap.includes('USD 70') && ap.includes('6.7%'));
  await p.screenshot({ path: path.join(out, 'sprint8-approvals.png'), fullPage: true });
  await p.click('[data-decide="Approved"]'); await p.waitForTimeout(700);
  check('After approval the queue is empty', (await p.textContent('#appr')).includes('Nothing waiting'));
  check('Deal is now final (Generated)', store.deals['D-TEST-1'].status === 'Generated');
  await p.click('nav a[data-view="list"]'); await p.waitForTimeout(400);
  await p.click('[data-status="Sent"][data-id="D-TEST-1"]'); await p.waitForTimeout(500);
  check('Pipeline status Sent saved', store.deals['D-TEST-1'].status === 'Sent');
  await p.fill('#fText', 'nomatch'); await p.waitForTimeout(100);
  check('Search filter works', (await p.textContent('#dealList')).includes('match the filter'));
  await p.fill('#fText', '');
  await p.click('nav a[data-view="dash"]'); await p.waitForTimeout(500);
  const dash = await p.textContent('#dash');
  check('Dashboard shows tiles and breakdowns', dash.includes('Open pipeline') && dash.includes('By Rep') && dash.includes('Varaprasad SN'));
  await p.screenshot({ path: path.join(out, 'sprint8-dashboard.png'), fullPage: true });
  // Sprint 9: admin price change does not affect the saved deal; language hint
  await p.click('nav a[data-view="admin"]'); await p.waitForTimeout(500);
  await p.selectOption('#admTab', 'Packages'); await p.waitForTimeout(400);
  await p.click('[data-adm="1"]'); await p.waitForTimeout(200);
  await p.fill('[data-adm-f="price_per_site_month"]', 'abc'); await p.click('#admSave'); await p.waitForTimeout(300);
  check('Admin validation rejects a non-number price', (await p.textContent('#toast')).includes('must be a number'));
  await p.fill('[data-adm-f="price_per_site_month"]', '130'); await p.click('#admSave'); await p.waitForTimeout(400);
  check('Admin saved new Loyalty price', M.Packages[1].price_per_site_month === 130);
  check('New deals use the new price', ctx.buildQuote(M, { market: 'Developed', currency: 'USD', stores: 1, ecomSites: 0, packages: ['Loyalty'] }).packages[0].standardPricePerSite === 130);
  await p.screenshot({ path: path.join(out, 'sprint9-admin.png'), fullPage: true });
  await p.click('nav a[data-view="list"]'); await p.waitForTimeout(400);
  await p.click('[data-open="D-TEST-1"]'); await p.waitForTimeout(600);
  check('Saved deal keeps frozen price (USD 75 standard)', (await p.textContent('#review')).includes('USD 75'));
  await p.click('#steps div[data-step="2"]'); check('Price-freeze notice shown on step 2', (await p.isVisible('#priceFreeze')) && (await p.textContent('#priceFreezeText')).includes('Prices frozen'));
  await p.click('#steps div[data-step="3"]'); await p.selectOption('#language', 'AR'); await p.waitForTimeout(200);
  const lh = await p.textContent('#langHint');
  check('Language hint: Arabic ToS available, others fall back to English', lh.includes('In Arabic: ToS') && lh.includes('Proposal, Order Form, DPA'));
  await p.click('nav a[data-view="admin"]'); await p.waitForTimeout(300);
  await p.fill('#tplUrl', 'https://docs.google.com/document/d/abc/edit'); await p.click('#tplCheck'); await p.waitForTimeout(300);
  check('Template check reports unknown tags', (await p.textContent('#tplResult')).includes('Typo'));
  await p.click('#btnGoLive'); await p.waitForTimeout(300);
  check('Go-live check lists blockers', (await p.textContent('#goLive')).includes('blocker'));
  await p.screenshot({ path: path.join(out, 'sprint10-golive.png'), fullPage: true });
  check('No page errors', errors.length === 0); if (errors.length) console.log(errors);
  await b.close();
})();
