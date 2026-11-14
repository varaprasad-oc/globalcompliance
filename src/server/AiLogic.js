/**
 * Sprint 7: Gemini narrative drafting – pure parts (prompt building + guardrails). Runs in Apps Script and Node.
 * The narrative is the ONLY AI-written content; prices, terms and legal text always come from the Sheet and templates.
 */

/** Build the prompt for the proposal narrative from the rep's notes and standard module text. */
function buildNarrativePrompt(master, deal, opts) {
  opts = opts || {};
  var row = (master.AIPrompts || []).filter(function (r) { return r.key === 'PROPOSAL_NARRATIVE'; })[0] || {};
  var c = deal.client || {}, com = deal.commercial || {};
  var pk = com.packages || [];
  var modules = featureMatrix(master, pk)
    .filter(function (f) { return pk.some(function (p) { return f.values[p] === 'Included'; }); })
    .map(function (f) { return '- ' + f.feature + (f.description ? ': ' + f.description : ''); });
  var tone = opts.tone === 'concise' ? 'Concise: short sentences, no more than 2 paragraphs in the executive summary.' : 'Formal and persuasive B2B tone, 3 paragraphs in the executive summary.';
  var lang = opts.language === 'AR' ? 'Write in Modern Standard Arabic.' : 'Write in British English.';
  var parts = [
    String(row.prompt || ''),
    'TONE: ' + tone,
    'LANGUAGE: ' + lang,
    'RULES: Do not mention any price, discount, fee, currency or number of money. Do not invent features, integrations, clients or results that are not in the notes or modules. Refer to the client by its short name. Return valid JSON only.',
    'CLIENT: ' + (c.shortName || c.legalName || '') + ' (' + (c.legalName || '') + '), ' + (c.country || ''),
    'BRANDS: ' + (c.brands || 'n/a') + ' · STORES: ' + (com.stores || 0) + ' · E-COMMERCE SITES: ' + (com.ecomSites || 0) +
      ' · POS: ' + (c.pos || 'n/a') + ' · E-COMMERCE PLATFORM: ' + (c.ecomPlatform || 'n/a') + ' · WEBSITE: ' + (c.website || 'n/a'),
    'MULTI-BRAND GROUP: ' + ((deal.proposal || {}).multiBrand ? 'yes – also write multiBrandIntro' : 'no – return multiBrandIntro as an empty string'),
    'CLIENT NOTES (from the sales rep):\n' + ((deal.narrative || {}).notes || '(none)'),
    'MODULES (only these may be mentioned):\n' + modules.join('\n'),
    'OUTPUT JSON SCHEMA: {"executiveSummary": "paragraphs separated by a blank line", "journeys": ["Title: one-sentence journey", "Title: one-sentence journey"], "multiBrandIntro": "string"}'
  ];
  return parts.join('\n\n');
}

/** Parse Gemini's reply and apply guardrails. Returns {ok, narrative, warnings} – never throws. */
function sanitizeNarrative(rawText, master) {
  var warnings = [];
  var txt = String(rawText || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  var obj;
  try { obj = JSON.parse(txt); } catch (e) { return { ok: false, narrative: null, warnings: ['AI reply was not valid JSON'] }; }
  var codes = (master.Currencies || []).map(function (c) { return c.code; }).concat(['\\$', '€', '£', 'USD', 'dollars?', 'dirhams?', 'riyals?', 'rupees?', 'pounds?']);
  var moneyRe = new RegExp('((' + codes.join('|') + ')\\s?\\d[\\d,.]*)|(\\d[\\d,.]*\\s?(' + codes.join('|') + '))|(\\d+(\\.\\d+)?\\s?%\\s*(off|discount))', 'i');
  function clean(s, maxLen) {
    s = String(s || '').trim();
    var sentences = s.split(/(?<=[.!?])\s+/);
    var kept = sentences.filter(function (x) { if (moneyRe.test(x)) { warnings.push('Removed a sentence mentioning money: "' + x.slice(0, 60) + '…"'); return false; } return true; });
    s = kept.join(' ').replace(/ ?\n ?/g, '\n');
    if (s.length > maxLen) { s = s.slice(0, maxLen).replace(/\s+\S*$/, '') + '…'; warnings.push('Shortened a long section'); }
    return s;
  }
  var paras = String(obj.executiveSummary || '').split(/\n\s*\n/).map(function (p) { return clean(p, 1200); }).filter(String);
  var narrative = {
    executiveSummary: paras.slice(0, 4).join('\n\n'),
    journeys: (Array.isArray(obj.journeys) ? obj.journeys : []).slice(0, 3).map(function (j) { return clean(j, 400); }).filter(String),
    multiBrandIntro: clean(obj.multiBrandIntro, 800)
  };
  if (!narrative.executiveSummary) return { ok: false, narrative: null, warnings: warnings.concat(['AI reply had no executive summary']) };
  return { ok: true, narrative: narrative, warnings: warnings };
}
