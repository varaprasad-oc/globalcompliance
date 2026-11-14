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
