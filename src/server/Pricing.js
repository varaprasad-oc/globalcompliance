/**
 * Pricing engine (Sprint 3). Pure JS — runs in Apps Script and Node.
 *
 * Reproduces "Pricing v2" with these agreed fixes:
 *  - Special discount is applied on top: factor = (1 - market) x FX x (1 - slab); special price overrides the licence fee.
 *  - The store-count slab is calculated from sites (stores + e-commerce sites), not picked from a dropdown.
 *  - Discount % shown is computed in USD terms (not distorted by FX).
 *  - Unit prices are rounded to the currency's rounding step (nearest 5); small values are rounded to whole numbers.
 *  - Any special price below the standard price (i.e. a special discount) requires superadmin approval.
 *
 * input = {
 *   market, currency, stores, ecomSites,
 *   packages: ['Loyalty', 'Advanced'],          // packages to quote
 *   specialPrices: { Loyalty: 150 },             // optional, per site per month, in quote currency
 *   addOns: ['GIFT_CARDS'],                      // optional ADDON item_ids (all quoted packages)
 *   addOnsByPackage: { Loyalty: ['GIFT_CARDS'] },  // optional, per package – overrides addOns for that package
 *   oneTimeItems: [{ id: 'MIGRATION_100K', qty: 1 }],  // optional ONE_TIME items (STORE_INSTALL is automatic)
 *   specialComms: { COMMS_100K: 200 },            // optional negotiated platform-comms price per tier, in quote currency
 *   specialOneTime: { Loyalty: { SETUP: 1000, STORE_INSTALL: 100, ECOM_INSTALL: 500 } },  // optional unit prices per package
 *   specialOptional: { MIGRATION_100K: 800 }      // optional unit prices for optional one-time services
 * }
 */

function _index(rows, key) {
  var o = {};
  (rows || []).forEach(function (r) { o[r[key]] = r; });
  return o;
}

function _termsMap(master) {
  var t = {};
  (master.CommercialTerms || []).forEach(function (r) { t[r.key] = r.value; });
  return t;
}

/** Find the slab for a site count. */
function findSlab(master, sites) {
  var slabs = master.Slabs || [];
  for (var i = 0; i < slabs.length; i++) {
    if (sites >= Number(slabs[i].min_sites) && sites <= Number(slabs[i].max_sites)) return slabs[i];
  }
  return { label: 'None', discount: 0 };
}

/** Round to the currency step; values below step x N are rounded to a whole number. */
function roundPrice(value, currencyRow, terms) {
  var step = Number(currencyRow.rounding_step) || 1;
  var wholeBelow = step * (Number(terms.round_whole_below_steps) || 10);
  if (value < wholeBelow) return Math.round(value);
  return Math.round(value / step) * step;
}

function _appliesTo(item, pkg) {
  var p = String(item.packages || 'ALL');
  if (p === 'ALL') return true;
  return p.split(',').map(function (s) { return s.trim(); }).indexOf(pkg) !== -1;
}

/** Validate input and return a list of error messages (empty = OK). */
function validateQuoteInput(master, input) {
  var errs = [];
  var markets = _index(master.Markets, 'market');
  var currencies = _index(master.Currencies, 'code');
  var packages = _index(master.Packages, 'package');
  if (!markets[input.market]) errs.push('Unknown market: ' + input.market);
  if (!currencies[input.currency]) errs.push('Unknown currency: ' + input.currency);
  var stores = Number(input.stores || 0), ecom = Number(input.ecomSites || 0);
  if (stores < 0 || ecom < 0 || (!input.allowZeroSites && (stores + ecom) < 1)) errs.push('Enter at least 1 store or e-commerce site');
  if (!input.packages || !input.packages.length) errs.push('Select at least one package');
  (input.packages || []).forEach(function (p) { if (!packages[p]) errs.push('Unknown package: ' + p); });
  Object.keys(input.specialPrices || {}).forEach(function (p) {
    var v = input.specialPrices[p];
    if (v !== '' && v !== null && v !== undefined && !(Number(v) > 0)) errs.push('Special price for ' + p + ' must be a positive number');
  });
  var neg = function (v) { return v !== '' && v !== null && v !== undefined && (isNaN(Number(v)) || Number(v) < 0); };
  Object.keys(input.specialOneTime || {}).forEach(function (p) {
    Object.keys(input.specialOneTime[p] || {}).forEach(function (k) { if (neg(input.specialOneTime[p][k])) errs.push('Special one-time price (' + p + ' ' + k + ') must be 0 or more'); });
  });
  Object.keys(input.specialOptional || {}).forEach(function (k) { if (neg(input.specialOptional[k])) errs.push('Special price for ' + k + ' must be 0 or more'); });
  return errs;
}

/** Build the full Quote object used by every document template. */
function buildQuote(master, input) {
  var errors = validateQuoteInput(master, input);
  if (errors.length) return { ok: false, errors: errors };

  var terms = _termsMap(master);
  var cur = _index(master.Currencies, 'code')[input.currency];
  var mkt = _index(master.Markets, 'market')[input.market];
  var pkgIdx = _index(master.Packages, 'package');
  var items = (master.PriceItems || []).filter(function (i) { return isTrue(i.active); });

  var stores = Number(input.stores || 0);
  var ecomSites = Number(input.ecomSites || 0);
  var sites = stores + ecomSites;
  var slab = findSlab(master, input.slabSites !== undefined ? Number(input.slabSites) : sites);  // top-ups keep the contracted slab

  var fx = Number(cur.fx_rate);
  var marketDisc = Number(mkt.discount);
  var slabDisc = Number(slab.discount);
  var discountFactor = (1 - marketDisc) * (1 - slabDisc); // USD terms
  var factor = discountFactor * fx;                        // quote-currency multiplier

  function price(usd, basis) {
    if (basis === 'TEXT' || usd === '' || usd === null) return null;
    var raw = Number(usd) * (basis === 'FX_ONLY' ? fx : factor);
    return roundPrice(raw, cur, terms);
  }
  function textOf(item) {
    return String(item.text_value || '').replace('{whatsapp_markup_pct}', formatPct(terms.whatsapp_markup_pct || 0));
  }
  function itemLine(item, qty) {
    var unitPrice = price(item.usd_price, item.basis);
    return {
      id: item.item_id, label: item.label, unit: item.unit, qty: qty || 1,
      unitPrice: unitPrice, total: unitPrice === null ? null : unitPrice * (qty || 1),
      text: item.basis === 'TEXT' ? textOf(item) : ''
    };
  }

  var approvalReasons = [];
  /** Special unit price for a one-time line: keeps the standard price, recalculates the total, flags discounts for approval. */
  function applyOneTimeSpecial(l, sp, prefix) {
    l.standardUnitPrice = l.unitPrice;
    l.specialUnitPrice = null;
    if (sp === '' || sp === null || sp === undefined || l.unitPrice === null) return;
    sp = Number(sp);
    l.specialUnitPrice = sp;
    l.unitPrice = sp;
    l.total = sp * (l.qty || 1);
    if (sp < l.standardUnitPrice) {
      approvalReasons.push(prefix + l.label + ': special ' + formatMoney(input.currency, sp) + ' vs standard ' + formatMoney(input.currency, l.standardUnitPrice) +
        (l.qty > 1 ? ' (× ' + l.qty + ')' : ''));
    }
  }
  var storeInstall = items.filter(function (i) { return i.item_id === 'STORE_INSTALL'; })[0];

  var packages = input.packages.map(function (name) {
    var p = pkgIdx[name];
    var listLocal = Number(p.price_per_site_month) * fx;               // list price in quote currency, no discounts
    var standard = price(p.price_per_site_month, 'FULL');
    var sp = (input.specialPrices || {})[name];
    var special = (sp === '' || sp === null || sp === undefined) ? null : Number(sp);
    var finalPrice = special === null ? standard : special;
    if (special !== null && special < standard) {
      approvalReasons.push(name + ': special price ' + formatMoney(input.currency, special) +
        ' vs standard ' + formatMoney(input.currency, standard) + ' per site/month');
    }

    var oneTime = [];
    oneTime.push({ id: 'SETUP', label: 'Set-up and Training', unit: 'one-time', qty: 1,
      unitPrice: price(p.setup_fee, 'FULL'), total: price(p.setup_fee, 'FULL'), text: '' });
    if (stores > 0 && storeInstall) oneTime.push(itemLine(storeInstall, stores));
    if (ecomSites > 0) {
      var e = price(p.ecom_install_fee, 'FULL');
      oneTime.push({ id: 'ECOM_INSTALL', label: 'Installation per e-commerce site', unit: 'per site', qty: ecomSites,
        unitPrice: e, total: e * ecomSites, text: '' });
    }
    var spOT = (input.specialOneTime || {})[name] || {};
    oneTime.forEach(function (l) { applyOneTimeSpecial(l, spOT[l.id], name + ': '); });
    var oneTimeTotal = oneTime.reduce(function (s, l) { return s + (l.total || 0); }, 0);

    var addOns = items.filter(function (i) {
      var chosen = (input.addOnsByPackage && input.addOnsByPackage[name]) ? input.addOnsByPackage[name] : (input.addOns || []);
      return i.category === 'ADDON' && chosen.indexOf(i.item_id) !== -1 && _appliesTo(i, name);
    }).map(function (i) { return itemLine(i, 1); });
    var addOnsMonthly = addOns.reduce(function (s, l) { return s + (l.total || 0); }, 0);

    var licenceMonthly = finalPrice * sites;
    return {
      package: name,
      listPricePerSite: Math.round(listLocal * 100) / 100,
      standardPricePerSite: standard,
      specialPricePerSite: special,
      finalPricePerSite: finalPrice,
      effectiveDiscountPct: listLocal ? Math.round((1 - finalPrice / listLocal) * 10000) / 10000 : 0,
      specialDiscountPct: special === null ? 0 : Math.round((1 - special / standard) * 10000) / 10000,
      annualPerSite: finalPrice * 12,
      sites: sites,
      licenceMonthly: licenceMonthly,
      licenceAnnual: licenceMonthly * 12,
      addOns: addOns,
      addOnsMonthly: addOnsMonthly,
      recurringMonthly: licenceMonthly + addOnsMonthly,
      recurringAnnual: (licenceMonthly + addOnsMonthly) * 12,
      overagePer1000: price(p.overage_per_1000_receipts, 'FULL'),
      receiptsIncludedPerSite: Number(p.receipts_included_per_site),
      oneTime: oneTime,
      oneTimeTotal: oneTimeTotal,
      firstYearTotal: oneTimeTotal + (licenceMonthly + addOnsMonthly) * 12
    };
  });

  var optionalOneTime = (input.oneTimeItems || []).map(function (sel) {
    var it = items.filter(function (i) { return i.item_id === sel.id && i.category === 'ONE_TIME'; })[0];
    if (!it) return null;
    var l = itemLine(it, Number(sel.qty) || 1);
    applyOneTimeSpecial(l, (input.specialOptional || {})[sel.id], '');
    return l;
  }).filter(Boolean);

  // Platform comms: volume tiers, FX only. Special price below list -> approval; below floor is flagged.
  var comms = (master.CommsTiers || []).filter(function (t) { return isTrue(t.active); })
    .sort(function (a, b) { return a.display_order - b.display_order; })
    .map(function (t) {
      var list = price(t.list_usd, 'FX_ONLY');
      var floor = price(t.floor_usd, 'FX_ONLY');
      var sp = (input.specialComms || {})[t.tier_id];
      var special = (sp === '' || sp === null || sp === undefined) ? null : Number(sp);
      var fin = special === null ? list : special;
      if (special !== null && special < list) {
        approvalReasons.push('Platform comms (' + Number(t.messages).toLocaleString('en-US') + ' / month): special ' + formatMoney(input.currency, special) +
          ' vs list ' + formatMoney(input.currency, list) + (special < floor ? ' — BELOW FLOOR ' + formatMoney(input.currency, floor) : ''));
      }
      return { id: t.tier_id, label: t.label, unit: 'per month', qty: 1, messages: Number(t.messages),
        listPrice: list, floorPrice: floor, specialPrice: special, unitPrice: fin, total: fin, text: '', belowFloor: special !== null && special < floor };
    });

  var byCat = function (cat) {
    return items.filter(function (i) { return i.category === cat; })
      .sort(function (a, b) { return a.display_order - b.display_order; })
      .map(function (i) { return itemLine(i, 1); });
  };

  return {
    ok: true,
    currency: input.currency,
    market: input.market,
    stores: stores,
    ecomSites: ecomSites,
    sites: sites,
    discounts: {
      marketPct: marketDisc,
      slabLabel: slab.label,
      slabPct: slabDisc,
      combinedPct: Math.round((1 - discountFactor) * 10000) / 10000
    },
    fxRate: fx,
    packages: packages,
    optionalOneTime: optionalOneTime,
    optionalOneTimeTotal: optionalOneTime.reduce(function (s, l) { return s + (l.total || 0); }, 0),
    comms: comms,
    usage: comms.concat(byCat('USAGE')),
    consulting: byCat('CONSULTING'),
    rateCardOneTime: byCat('ONE_TIME'),
    rateCardAddOns: byCat('ADDON'),
    needsApproval: approvalReasons.length > 0,
    approvalReasons: approvalReasons,
    terms: terms
  };
}

/** Feature matrix for the selected packages: [{feature, values: {Loyalty: 'Included'|...}, description}] */
function featureMatrix(master, packageNames) {
  return (master.Features || [])
    .slice()
    .sort(function (a, b) { return a.display_order - b.display_order; })
    .map(function (f) {
      var v = {};
      packageNames.forEach(function (p) { v[p] = f[p]; });
      return { feature: f.feature, values: v, description: f.description_en, descriptionAr: f.description_ar, addonItemId: f.addon_item_id || '' };
    });
}

/** WhatsApp credit types offered in top-ups (Meta categories). */
var WHATSAPP_CREDIT_TYPES = ['Transactional', 'Promotional', 'Authentication'];

/**
 * Top-up quote for a Won deal (decision 2026-11-15): only the added items, at the CONTRACTED prices of the original deal
 * (its price snapshot, market, currency and slab; licence = its final per-site price). Own term.
 * input = { market, currency, termMonths, package, contractedPricePerSite, baseSites, addStores, addEcomSites,
 *           licencePrice, addOns:[ids], oneTimeItems, specialOptional, specialInstall:{STORE_INSTALL, ECOM_INSTALL},
 *           commsTiers:[ids], specialComms:{id: price}, whatsapp:[{type, credits, pricePerCredit}] }
 * Returns a quote with the same shape the Order Form uses (packages[0], optionalOneTime, usage, …) plus .topup.
 */
function buildTopupQuote(master, input) {
  var addStores = Number(input.addStores || 0), addEcom = Number(input.addEcomSites || 0), added = addStores + addEcom;
  var tiers = input.commsTiers || [];
  var specialComms = {};
  tiers.forEach(function (id) { if ((input.specialComms || {})[id] !== undefined) specialComms[id] = input.specialComms[id]; });
  var q = buildQuote(master, {
    market: input.market, currency: input.currency, stores: addStores, ecomSites: addEcom, allowZeroSites: true,
    slabSites: Number(input.baseSites || 0) || added, packages: [input.package],
    addOnsByPackage: (function () { var o = {}; o[input.package] = input.addOns || []; return o; })(),
    oneTimeItems: input.oneTimeItems || [], specialOptional: input.specialOptional || {},
    specialOneTime: (function () { var o = {}; o[input.package] = input.specialInstall || {}; return o; })(),
    specialComms: specialComms
  });
  if (!q.ok) return q;
  var cur = input.currency, errors = [], reasons = q.approvalReasons.slice();
  var p = q.packages[0];
  var contracted = Number(input.contractedPricePerSite || p.standardPricePerSite);
  var lp = input.licencePrice;
  var licencePrice = (lp === '' || lp === null || lp === undefined) ? contracted : Number(lp);
  if (added > 0 && licencePrice < contracted) {
    reasons.push('Top-up licence: ' + formatMoney(cur, licencePrice) + ' vs contracted ' + formatMoney(cur, contracted) + ' per site/month');
  }
  var licenceMonthly = added > 0 ? licencePrice * added : 0;
  var installs = p.oneTime.filter(function (l) { return l.id !== 'SETUP'; });  // no set-up fee on a top-up
  var comms = q.comms.filter(function (c) { return tiers.indexOf(c.id) !== -1; });
  var commsMonthly = comms.reduce(function (s, c) { return s + (c.total || 0); }, 0);
  var whatsapp = (input.whatsapp || []).filter(function (w) { return w && (Number(w.credits) > 0 || Number(w.pricePerCredit) > 0); }).map(function (w) {
    var credits = Number(w.credits || 0), ppc = Number(w.pricePerCredit || 0);
    if (WHATSAPP_CREDIT_TYPES.indexOf(w.type) === -1) errors.push('WhatsApp credit type must be one of ' + WHATSAPP_CREDIT_TYPES.join(', '));
    if (!(credits > 0) || !(ppc > 0)) errors.push('WhatsApp ' + (w.type || '') + ' credits: enter credit count and price per credit');
    var total = Math.round(credits * ppc * 100) / 100;
    reasons.push('WhatsApp ' + w.type + ' credits: ' + credits.toLocaleString('en-US') + ' × ' + formatMoney(cur, ppc) + ' = ' + formatMoney(cur, total));
    return { id: 'WA_' + String(w.type).toUpperCase(), label: 'WhatsApp ' + w.type + ' credits', unit: 'per credit', qty: credits, unitPrice: ppc, total: total, text: '', credits: credits };
  });
  var oneTime = installs.concat(whatsapp);
  var oneTimeTotal = oneTime.reduce(function (s, l) { return s + (l.total || 0); }, 0);
  var recurringMonthly = licenceMonthly + p.addOnsMonthly + commsMonthly;
  if (!added && !p.addOns.length && !comms.length && !whatsapp.length && !q.optionalOneTime.length) errors.push('Add at least one item to the top-up');
  if (errors.length) return { ok: false, errors: errors };
  var term = Number(input.termMonths || 12);
  var pkg = {
    package: p.package, standardPricePerSite: contracted, contractedPricePerSite: contracted, specialPricePerSite: licencePrice === contracted ? null : licencePrice,
    finalPricePerSite: licencePrice, listPricePerSite: p.listPricePerSite, effectiveDiscountPct: p.listPricePerSite ? Math.round((1 - licencePrice / p.listPricePerSite) * 10000) / 10000 : 0,
    specialDiscountPct: licencePrice < contracted ? Math.round((1 - licencePrice / contracted) * 10000) / 10000 : 0,
    sites: added, licenceMonthly: licenceMonthly, licenceAnnual: licenceMonthly * 12, addOns: p.addOns, addOnsMonthly: p.addOnsMonthly,
    commsMonthly: commsMonthly, recurringMonthly: recurringMonthly, recurringAnnual: recurringMonthly * 12,
    overagePer1000: p.overagePer1000, receiptsIncludedPerSite: p.receiptsIncludedPerSite,
    oneTime: oneTime, oneTimeTotal: oneTimeTotal, firstYearTotal: oneTimeTotal + recurringMonthly * 12,
    termTotal: oneTimeTotal + q.optionalOneTimeTotal + recurringMonthly * term
  };
  return Object.assign({}, q, {
    packages: [pkg], needsApproval: reasons.length > 0, approvalReasons: reasons,
    topup: { addStores: addStores, addEcomSites: addEcom, addedSites: added, baseSites: Number(input.baseSites || 0), contractedPricePerSite: contracted,
      comms: comms, whatsapp: whatsapp, termMonths: term }
  });
}
