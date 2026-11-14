/**
 * Sprint 4.3: run engineSelfTest() from the Apps Script editor once folders + Master Sheet exist.
 * It creates a throw-away template that uses every placeholder feature, generates a Proposal from a sample deal,
 * and logs the result URLs and any warnings. Expected: 0 warnings.
 */
function engineSelfTest() {
  var master = getMaster(true);
  var deal = {
    dealId: 'SELFTEST', version: 1,
    client: { legalName: 'Sample Retail LLC', shortName: 'Sample', country: 'United Arab Emirates', address: 'Dubai, UAE',
      businessContact: { name: 'Test', email: 'test@example.com' }, billingContact: { email: 'billing@example.com' } },
    entityId: 'OC-AE',
    commercial: { market: 'High Income', currency: 'AED', stores: 12, ecomSites: 1, packages: ['Loyalty', 'Advanced'],
      specialPrices: { Loyalty: 300 }, addOns: ['GIFT_CARDS'], orderPackage: 'Loyalty', termMonths: 12 },
    proposal: { multiBrand: true },
    narrative: { executiveSummary: 'First paragraph.\n\nSecond paragraph.', journeys: ['Win-back: lapsed shopper gets bonus points.'] }
  };
  var quote = buildQuote(master, deal.commercial);
  var data = buildDocData('PROPOSAL', master, deal, quote, { docNo: 'SELFTEST-0001', docDate: new Date(), user: getCurrentUser() });

  var tplDoc = DocumentApp.create('_ENGINE_SELFTEST_TEMPLATE');
  var b = tplDoc.getBody();
  b.appendParagraph('Proposal {{DocNo}} for {{ClientShortName}} – {{DocDate}}').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  b.appendParagraph('Inline: {{#IF IsPartner}}PARTNER{{/IF IsPartner}}{{#IF !IsPartner}}OPTCULTURE ENTITY{{/IF IsPartner}}');
  b.appendParagraph('{{TEXT:ExecutiveSummary}}');
  b.appendParagraph('{{#IF MultiBrand}}');
  b.appendParagraph('This block appears only for multi-brand groups.');
  b.appendParagraph('{{/IF MultiBrand}}');
  b.appendParagraph('{{#IF HasMsa}}');
  b.appendParagraph('THIS SHOULD BE REMOVED');
  b.appendParagraph('{{/IF HasMsa}}');
  b.appendListItem('{{LIST:Modules}}{{title}}: {{text}}');
  b.appendParagraph('{{TABLE:PriceSummary}}');
  b.appendParagraph('{{TABLE:PlanMatrix}}');
  var t = b.appendTable([['Item', 'Price'], ['{{EACH:Usage}}{{label}}', '{{price}}']]);
  b.appendParagraph('Valid until {{ValidUntil}}. Prepared by {{RepName}}.');
  tplDoc.saveAndClose();

  var res = generateDocument('PROPOSAL', data, { templateFileId: tplDoc.getId(), clientName: 'SELFTEST', version: 1 });
  DriveApp.getFileById(tplDoc.getId()).setTrashed(true);
  console.log(JSON.stringify(res, null, 2));
  return res;
}

/**
 * Sprint 5 check: generates all 4 documents for a sample partner deal (Egypt) and a sample UAE deal,
 * using the ACTIVE templates from the Templates tab. Document numbers are SAMPLE-… (the real counter is not used).
 * Output goes to the normal folders under client "SAMPLE – …". Logs links + warnings.
 */
function generateSampleDocs() {
  var master = getMaster(true);
  var user = getCurrentUser();
  var deals = [
    {
      dealId: 'SAMPLE-EG', version: 1,
      client: { legalName: 'Sample Fashion Group S.A.E.', shortName: 'SFG', country: 'Egypt', address: 'New Cairo, Egypt',
        regType: 'Commercial Registration', regNo: 'CR-000000', brands: 'Brand A, Brand B, Brand C', pos: 'Retail Pro', ecomPlatform: 'Shopify',
        businessContact: { name: 'Sample Buyer', email: 'buyer@example.com', phone: '+20 100 000 0000' }, billingContact: { name: 'Finance', email: 'finance@example.com' },
        signatoryName: 'Sample Signatory', signatoryTitle: 'CEO' },
      entityId: 'P-EG-CONGINEER',
      commercial: { market: 'Emerging', currency: 'USD', stores: 46, ecomSites: 1, packages: ['Loyalty', 'Advanced'], specialPrices: { Loyalty: 70 },
        addOns: ['GIFT_CARDS'], oneTimeItems: [{ id: 'MIGRATION_100K', qty: 1 }], orderPackage: 'Loyalty', termMonths: 12, startDate: '2027-01-01', billingCycle: 'Annual' },
      proposal: { tagline: 'Earn anywhere. Redeem everywhere. One member, every brand, in-store and online.', multiBrand: true },
      narrative: {
        executiveSummary: 'Sample Fashion Group is a multi-brand retailer operating 46 stores and an online store.\n\nOptCulture proposes a single loyalty and customer-engagement platform — one program, one wallet, one member profile — across every brand, store and the online store.',
        journeys: ['Cross-channel activation: a first-time store shopper receives bonus points on her first online order.', 'Lifecycle win-back: a shopper silent for 120 days receives a curated reward on her most-shopped brand.'],
        multiBrandIntro: 'This section sets out the design principles for the group-wide program.' },
      dpa: { hostingRegion: 'To be confirmed' }
    },
    {
      dealId: 'SAMPLE-AE', version: 1,
      client: { legalName: 'Sample Boutique L.L.C', shortName: 'Sample Boutique', country: 'United Arab Emirates', address: 'Dubai, UAE',
        regType: 'Trade Licence', regNo: '0000000', pos: 'Retail Pro', businessContact: { name: 'Owner', email: 'owner@example.com' },
        billingContact: { name: 'Accounts', email: 'accounts@example.com' }, signatoryName: 'Owner', signatoryTitle: 'Manager' },
      entityId: 'OC-AE',
      commercial: { market: 'High Income', currency: 'AED', stores: 3, ecomSites: 0, packages: ['Engagement', 'Loyalty'], orderPackage: 'Engagement', termMonths: 12, billingCycle: 'Annual' },
      proposal: { multiBrand: false, showConsulting: false },
      narrative: { executiveSummary: 'Sample Boutique operates 3 stores in Dubai.\n\nOptCulture will unify its customer data and digital receipts.', journeys: [] },
      dpa: {}
    }
  ];
  var results = [];
  deals.forEach(function (deal) {
    var quote = buildQuote(master, deal.commercial);
    var related = { PROPOSAL: deal.dealId + '-P', ORDER_FORM: deal.dealId + '-Q', TOS: deal.dealId + '-TOS', DPA: deal.dealId + '-DPA' };
    DOC_TYPES.forEach(function (type) {
      var data = buildDocData(type, master, deal, quote, { docNo: related[type], docDate: new Date(), user: user, related: related });
      try {
        var r = generateDocument(type, data, { clientName: 'SAMPLE – ' + deal.client.shortName, version: 1 });
        results.push({ deal: deal.dealId, type: type, doc: r.docUrl, pdf: r.pdfUrl, warnings: r.warnings });
      } catch (e) {
        results.push({ deal: deal.dealId, type: type, error: String(e) });
      }
    });
  });
  console.log(JSON.stringify(results, null, 2));
  return results;
}
