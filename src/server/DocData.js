/**
 * Sprint 4: builds the data every template reads. Pure JS (runs in Apps Script and Node).
 *
 * Output shape (consumed by DocEngine.js):
 *   fields  { Name: 'text' }                 -> {{Name}}
 *   flags   { Name: true/false }             -> {{#IF Name}} … {{/IF Name}}  (use {{#IF !Name}} for "not")
 *   lists   { Name: [ {key: 'text'} ] }      -> repeating table row {{EACH:Name}} or paragraph {{LIST:Name}}, with {{key}} inside
 *   tables  { Name: {headers:[], rows:[[]]} } -> {{TABLE:Name}} (generated table, dynamic columns)
 *   texts   { Name: 'para1\n\npara2' }        -> {{TEXT:Name}} (multi-paragraph text)
 *   images  { Name: driveFileId }            -> {{IMAGE:Name}}
 *
 * deal = {
 *   dealId, version,
 *   client: { legalName, shortName, country, address, regType, regNo, billingAddress, website, brands, pos, ecomPlatform,
 *             businessContact: {name, email, phone}, billingContact: {name, email, phone}, signatoryName, signatoryTitle },
 *   entityId,                                   // OptCulture entity or partner (Entities tab)
 *   commercial: { market, currency, stores, ecomSites, packages, specialPrices, addOns, oneTimeItems,
 *                 orderPackage, termMonths, startDate, billingCycle, autoRenew, paymentMethod, poNumber, msaRef, specialTerms },
 *   proposal: { title, tagline, multiBrand, showConsulting },
 *   narrative: { executiveSummary, journeys: [], multiBrandIntro },
 *   dpa: { hostingRegion, extraDataSubjects, extraDataTypes, sensitiveData }
 * }
 * ctx = { docNo, docDate (Date), user: {name, email, phone}, related: {PROPOSAL: 'OC-P-…', ORDER_FORM: …} }
 */

var DOC_TYPES = ['PROPOSAL', 'ORDER_FORM', 'TOS', 'DPA'];

function _v(x) { return x === undefined || x === null ? '' : String(x); }
function _contact(c) { c = c || {}; return [c.name, c.email, c.phone].filter(function (s) { return s; }).join(', '); }
function _addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + Number(n || 0)); return x; }
function _addMonths(d, n) { var x = new Date(d); x.setMonth(x.getMonth() + Number(n || 0)); x.setDate(x.getDate() - 1); return x; }
function _yesNo(b) { return b ? 'Yes' : 'No'; }

function buildDocData(docType, master, deal, quote, ctx) {
  if (DOC_TYPES.indexOf(docType) === -1) throw new Error('Unknown document type: ' + docType);
  var cur = quote.currency;
  var m = function (v) { return v === null || v === undefined ? '' : formatMoney(cur, v); };
  var terms = quote.terms || {};
  var c = deal.client || {};
  var com = deal.commercial || {};
  var entity = (master.Entities || []).filter(function (e) { return e.entity_id === deal.entityId; })[0] || {};
  var isPartner = entity.type === 'Partner';
  var country = (master.Countries || []).filter(function (r) { return r.country === c.country; })[0] || {};
  var date = ctx.docDate ? new Date(ctx.docDate) : new Date();
  var user = ctx.user || {};

  var fields = {
    DocNo: _v(ctx.docNo),
    DocDate: formatLongDate(date),
    DocVersion: 'v' + (deal.version || 1),
    ValidUntil: formatLongDate(_addDays(date, docType === 'ORDER_FORM' ? terms.quote_valid_days : terms.offer_validity_days)),
    ProposalNo: _v((ctx.related || {}).PROPOSAL), OrderFormNo: _v((ctx.related || {}).ORDER_FORM),
    TosNo: _v((ctx.related || {}).TOS), DpaNo: _v((ctx.related || {}).DPA),

    ClientLegalName: _v(c.legalName), ClientShortName: _v(c.shortName || c.legalName), ClientCountry: _v(c.country),
    ClientAddress: _v(c.address), ClientBillingAddress: _v(c.billingAddress || 'Same as registered address'),
    ClientRegType: _v(c.regType || 'Registration'), ClientRegNo: _v(c.regNo), ClientWebsite: _v(c.website), ClientBrands: _v(c.brands),
    ClientPOS: _v(c.pos), ClientEcomPlatform: _v(c.ecomPlatform),
    ClientBusinessContact: _contact(c.businessContact), ClientBillingContact: _contact(c.billingContact),
    ClientSignatoryName: _v(c.signatoryName), ClientSignatoryTitle: _v(c.signatoryTitle),

    EntityName: _v(entity.legal_name), EntityShortName: _v(entity.short_name), EntityRegType: _v(entity.reg_type),
    EntityRegNo: _v(entity.reg_no), EntityAddress: _v(entity.address), EntityCountry: _v(entity.country),
    EntitySignatoryName: _v(entity.signatory_name), EntitySignatoryTitle: _v(entity.signatory_title),
    GoverningLaw: _v(entity.governing_law),

    RepName: _v(user.name), RepEmail: _v(user.email), RepPhone: _v(user.phone),

    Currency: cur, Market: quote.market, Stores: String(quote.stores), EcomSites: String(quote.ecomSites), Sites: String(quote.sites),
    MarketDiscount: formatPct(quote.discounts.marketPct), SlabLabel: quote.discounts.slabLabel, SlabDiscount: formatPct(quote.discounts.slabPct),

    OfferValidityDays: _v(terms.offer_validity_days), PriceLockMonths: _v(terms.price_lock_months),
    AnnualUpliftPct: formatPct(terms.annual_uplift_pct || 0), LateFeePct: formatPct(terms.late_fee_pct_month || 0),
    PaymentDays: _v(terms.payment_days), LiabilityCapMonths: _v(terms.liability_cap_months), NonSolicitMonths: _v(terms.non_solicit_months),
    WhatsAppMarkup: formatPct(terms.whatsapp_markup_pct || 0), ConsultingFreeMonths: _v(terms.consulting_free_months),
    RenewalNoticeDays: _v(terms.renewal_notice_days), DataExportDays: _v(terms.data_export_days),
    UptimePct: _v(terms.uptime_pct), SupportEmail: _v(terms.support_email), SupportPhone: _v(terms.support_phone),
    SupportHours: _v(terms.support_hours), ExecutiveName: _v(terms.executive_contact_name), ExecutiveEmail: _v(terms.executive_contact_email),
    LegalEmail: _v(terms.legal_email)
  };
  var rel = ctx.related || {};
  var flags = { IsPartner: isPartner, IsOptCultureEntity: !isPartner, HasMsa: !!com.msaRef, HasPO: !!com.poNumber,
    HasProposalNo: !!rel.PROPOSAL, HasOrderFormNo: !!rel.ORDER_FORM, HasTosNo: !!rel.TOS, HasDpaNo: !!rel.DPA };
  var lists = {}, tables = {}, texts = {}, images = {};
  if (entity.logo_file_id) images.EntityLogo = entity.logo_file_id;
  if (terms.optculture_logo_file_id) images.OptCultureLogo = terms.optculture_logo_file_id;
  var style = { tableHeaderBg: _v(terms.brand_table_header_bg) || '#7B3FE4', headingColor: _v(terms.brand_heading_color) || '#B6262B' };

  var pkgNames = quote.packages.map(function (p) { return p.package; });

  if (docType === 'PROPOSAL') {
    var p = deal.proposal || {};
    var n = deal.narrative || {};
    fields.ProposalTitle = _v(p.title || 'Unified Omnichannel Loyalty & Customer Engagement Platform');
    fields.ProposalTagline = _v(p.tagline);
    fields.PackagesList = pkgNames.join(' and ');
    flags.MultiBrand = !!p.multiBrand;
    flags.ShowConsulting = p.showConsulting !== false;
    flags.HasSpecialPrice = quote.packages.some(function (x) { return x.specialPricePerSite !== null; });
    flags.HasEcom = quote.ecomSites > 0;
    flags.HasPOS = !!c.pos;
    flags.HasEcomPlatform = !!c.ecomPlatform;
    flags.HasJourneys = (n.journeys || []).length > 0;
    flags.HasMultiBrandIntro = !!n.multiBrandIntro;
    texts.ExecutiveSummary = _v(n.executiveSummary);
    texts.MultiBrandIntro = _v(n.multiBrandIntro);
    lists.Journeys = (n.journeys || []).map(function (j) {
      var parts = String(j).split(':'); // "Title: text" convention
      return parts.length > 1 ? { title: parts.shift().trim(), text: parts.join(':').trim() } : { title: '', text: String(j) };
    });

    // Modules: features included in at least one selected package that have a description
    lists.Modules = featureMatrix(master, pkgNames)
      .filter(function (f) { return f.description && pkgNames.some(function (pn) { return f.values[pn] === 'Included'; }); })
      .map(function (f) { return { title: f.feature, text: f.description }; });

    tables.PlanMatrix = {
      headers: ['Capability'].concat(pkgNames),
      rows: featureMatrix(master, pkgNames).map(function (f) {
        return [f.feature].concat(pkgNames.map(function (pn) { return { 'Included': '✓', 'Not included': '✕', 'Add-on': 'Add-on' }[f.values[pn]] || ''; }));
      })
    };

    var priceRows = [
      ['Licence fee / site / month (standard)'].concat(quote.packages.map(function (x) { return m(x.standardPricePerSite); }))
    ];
    if (flags.HasSpecialPrice) priceRows.push(['Licence fee / site / month (special price)'].concat(quote.packages.map(function (x) { return x.specialPricePerSite === null ? m(x.standardPricePerSite) : m(x.specialPricePerSite); })));
    priceRows.push(['Billed annually – per site'].concat(quote.packages.map(function (x) { return m(x.annualPerSite) + ' / year'; })));
    priceRows.push(['Total licence – ' + quote.sites + ' sites / year'].concat(quote.packages.map(function (x) { return m(x.licenceAnnual); })));
    priceRows.push(['Receipts included / site / month'].concat(quote.packages.map(function (x) { return x.receiptsIncludedPerSite.toLocaleString('en-US'); })));
    priceRows.push(['Per additional 1,000 receipts'].concat(quote.packages.map(function (x) { return m(x.overagePer1000); })));
    tables.PriceSummary = { headers: ['Recurring charges'].concat(pkgNames), rows: priceRows };

    var oneTimeIds = [];
    quote.packages.forEach(function (x) { x.oneTime.forEach(function (l) { if (oneTimeIds.indexOf(l.id) === -1) oneTimeIds.push(l.id); }); });
    tables.OneTimeFees = {
      headers: ['One-time fees'].concat(pkgNames),
      rows: oneTimeIds.map(function (id) {
        var label = '';
        var cells = quote.packages.map(function (x) {
          var l = x.oneTime.filter(function (o) { return o.id === id; })[0];
          if (!l) return '';
          label = l.label;
          return l.qty > 1 ? m(l.unitPrice) + ' × ' + l.qty + ' = ' + m(l.total) : m(l.total);
        });
        return [label].concat(cells);
      }).concat([['Total one-time fees'].concat(quote.packages.map(function (x) { return m(x.oneTimeTotal); }))])
    };

    var addOnIds = [];
    quote.packages.forEach(function (x) { x.addOns.forEach(function (a) { if (addOnIds.indexOf(a.id) === -1) addOnIds.push(a.id); }); });
    flags.HasAddOns = addOnIds.length > 0;
    tables.AddOns = {
      headers: ['Add-on (per month)'].concat(pkgNames),
      rows: addOnIds.map(function (id) {
        var label = '';
        var cells = quote.packages.map(function (x) {
          var a = x.addOns.filter(function (o) { return o.id === id; })[0];
          if (a) label = a.label;
          return a ? m(a.total) : 'Not available';
        });
        return [label].concat(cells);
      })
    };

    lists.OptionalOneTime = quote.optionalOneTime.map(function (l) { return { label: l.label, amount: l.text || (m(l.unitPrice) + (l.unit === 'per hour' ? ' per hour' : '')) }; });
    flags.HasOptionalOneTime = lists.OptionalOneTime.length > 0;
    lists.Usage = quote.usage.map(function (l) { return { label: l.label, price: l.text || (m(l.unitPrice) + ' ' + l.unit) }; });
    lists.Consulting = quote.consulting.map(function (l) { return { label: l.label, price: m(l.unitPrice) + ' ' + l.unit }; });
  }

  if (docType === 'ORDER_FORM') {
    var op = quote.packages.filter(function (x) { return x.package === (com.orderPackage || pkgNames[0]); })[0];
    var start = com.startDate ? new Date(com.startDate) : null;
    var term = Number(com.termMonths || 12);
    fields.OrderPackage = op.package;
    fields.SubscriptionStartDate = start ? formatLongDate(start) : 'On go-live';
    fields.SubscriptionTerm = term + ' months';
    fields.SubscriptionEndDate = start ? formatLongDate(_addMonths(start, term)) : term + ' months from go-live';
    fields.RenewalTerm = term + ' months';
    fields.AutoRenewal = _yesNo(com.autoRenew !== false);
    fields.BillingCycle = _v(com.billingCycle || 'Annual');
    fields.PaymentMethod = _v(com.paymentMethod || 'Bank Transfer');
    fields.PONumber = _v(com.poNumber || 'Not applicable');
    fields.MsaRef = _v(com.msaRef);
    fields.SpecialTerms = _v(com.specialTerms || 'None.');
    fields.TotalRecurringMonthly = m(op.recurringMonthly);
    fields.TotalRecurringAnnual = m(op.recurringAnnual);
    fields.TotalOneTime = m(op.oneTimeTotal + quote.optionalOneTimeTotal);
    fields.FirstYearTotal = m(op.firstYearTotal + quote.optionalOneTimeTotal);
    fields.FinalPricePerSite = m(op.finalPricePerSite);

    lists.SubscriptionLines = [{
      product: 'OptCulture ' + op.package + ' Plan – platform licence',
      scope: op.sites + ' sites (' + quote.stores + ' stores' + (quote.ecomSites ? ' + ' + quote.ecomSites + ' e-commerce' : '') + ') @ ' + m(op.finalPricePerSite) + ' / site / month',
      billing: fields.BillingCycle + ', in advance',
      amount: m(op.licenceAnnual) + ' / year'
    }].concat(op.addOns.map(function (a) {
      return { product: a.label, scope: 'Add-on', billing: fields.BillingCycle + ', in advance', amount: m(a.total * 12) + ' / year' };
    }));

    lists.UsageLines = [{
      metric: 'Receipts', included: op.receiptsIncludedPerSite.toLocaleString('en-US') + ' per site / month', rate: m(op.overagePer1000) + ' per additional 1,000'
    }].concat(quote.usage.map(function (l) {
      return { metric: l.label, included: /^COMMS_/.test(l.id) ? Number(l.messages).toLocaleString('en-US') + ' conversations / month' : '—', rate: l.text || (m(l.unitPrice) + ' ' + l.unit) };
    }));

    lists.OneTimeLines = op.oneTime.concat(quote.optionalOneTime).map(function (l) {
      return { description: l.label, scope: l.qty > 1 ? l.qty + ' × ' + m(l.unitPrice) : (l.unit || ''), amount: l.text || m(l.total) };
    });
  }

  if (docType === 'TOS') {
    lists.OptCultureEntities = (master.Entities || []).filter(function (e) { return e.type === 'OptCulture' && isTrue(e.active); })
      .map(function (e) { return { country: e.country, name: e.legal_name }; });
  }

  if (docType === 'DPA') {
    var d = deal.dpa || {};
    var addendum = country.dpa_addendum || '4F';
    ['4A', '4B', '4C', '4D', '4E', '4F'].forEach(function (a) { flags['Addendum' + a] = a === addendum; });
    fields.DpaAddendum = addendum;
    fields.HostingRegion = _v(d.hostingRegion || terms.default_hosting_region || 'To be confirmed');
    fields.ExtraDataSubjects = d.extraDataSubjects ? '; ' + d.extraDataSubjects : '';
    fields.ExtraDataTypes = d.extraDataTypes ? '; ' + d.extraDataTypes : '';
    fields.SensitiveData = _v(d.sensitiveData || 'None');
    var platform = (master.Entities || []).filter(function (e) { return e.entity_id === (d.platformEntityId || 'OC-US'); })[0] || {};
    fields.PlatformEntityName = _v(platform.legal_name);
    fields.PlatformEntityCountry = _v(platform.country);
    lists.SubProcessors = (isPartner ? [{ name: platform.legal_name, service: 'Operation of the OptCulture platform', location: platform.country }] : [])
      .concat((master.SubProcessors || []).filter(function (s) { return isTrue(s.active); })
        .sort(function (a, b) { return a.display_order - b.display_order; })
        .map(function (s) { return { name: s.name, service: s.service + (s.condition ? ' (' + s.condition + ')' : ''), location: s.location }; }));
  }

  return { docType: docType, fields: fields, flags: flags, lists: lists, tables: tables, texts: texts, images: images, style: style };
}

/** Required inputs per document; returns missing-field messages. */
function missingForDoc(docType, deal) {
  var c = deal.client || {}, com = deal.commercial || {};
  var req = {
    PROPOSAL: [[c.legalName, 'Client legal name'], [c.country, 'Country']],
    ORDER_FORM: [[c.legalName, 'Client legal name'], [c.address, 'Registered address'], [c.businessContact && c.businessContact.email, 'Business contact email'],
      [c.billingContact && c.billingContact.email, 'Billing contact email'], [deal.entityId, 'Contracting entity / partner'], [com.termMonths, 'Subscription term']],
    TOS: [[c.legalName, 'Client legal name'], [deal.entityId, 'Contracting entity / partner']],
    DPA: [[c.legalName, 'Client legal name'], [c.address, 'Registered address'], [c.country, 'Country'], [deal.entityId, 'Contracting entity / partner']]
  }[docType] || [];
  return req.filter(function (r) { return !r[0]; }).map(function (r) { return r[1]; });
}

/** Find every {{…}} token in template text and report ones the data cannot fill. */
function checkTemplateTokens(text, data) {
  var tokens = (String(text).match(/\{\{[^}]+\}\}/g) || []).map(function (t) { return t.slice(2, -2).trim(); });
  var unknown = [];
  var listKeys = {};
  Object.keys(data.lists).forEach(function (k) { (data.lists[k] || []).forEach(function (it) { Object.keys(it).forEach(function (kk) { listKeys[kk] = true; }); }); });
  tokens.forEach(function (t) {
    var ok;
    var mIf = t.match(/^[#\/]IF\s+!?(\w+)$/);
    var mTag = t.match(/^(EACH|LIST|TABLE|TEXT|IMAGE):(\w+)$/);
    if (mIf) ok = mIf[1] in data.flags;
    else if (mTag) ok = mTag[1] === 'IMAGE' ? ['OptCultureLogo', 'EntityLogo'].indexOf(mTag[2]) !== -1 : { EACH: data.lists, LIST: data.lists, TABLE: data.tables, TEXT: data.texts }[mTag[1]].hasOwnProperty(mTag[2]);
    else ok = t in data.fields || t in listKeys;
    if (!ok && unknown.indexOf(t) === -1) unknown.push(t);
  });
  return unknown;
}
