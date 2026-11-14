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
 *   addOns: ['GIFT_CARDS'],                      // optional ADDON item_ids
 *   oneTimeItems: [{ id: 'MIGRATION_100K', qty: 1 }]   // optional ONE_TIME items (STORE_INSTALL is automatic)
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
  if (stores < 0 || ecom < 0 || (stores + ecom) < 1) errs.push('Enter at least 1 store or e-commerce site');
  if (!input.packages || !input.packages.length) errs.push('Select at least one package');
  (input.packages || []).forEach(function (p) { if (!packages[p]) errs.push('Unknown package: ' + p); });
  Object.keys(input.specialPrices || {}).forEach(function (p) {
    var v = input.specialPrices[p];
    if (v !== '' && v !== null && v !== undefined && !(Number(v) > 0)) errs.push('Special price for ' + p + ' must be a positive number');
  });
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
  var slab = findSlab(master, sites);

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
    var oneTimeTotal = oneTime.reduce(function (s, l) { return s + (l.total || 0); }, 0);

    var addOns = items.filter(function (i) {
      return i.category === 'ADDON' && (input.addOns || []).indexOf(i.item_id) !== -1 && _appliesTo(i, name);
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
    return it ? itemLine(it, Number(sel.qty) || 1) : null;
  }).filter(Boolean);

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
    usage: byCat('USAGE'),
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
      return { feature: f.feature, values: v, description: f.description_en, descriptionAr: f.description_ar };
    });
}
