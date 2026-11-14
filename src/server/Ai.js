/**
 * Sprint 7: Gemini via Vertex AI. Uses the web app owner's Google token (cloud-platform scope) and the
 * Google Cloud project linked to this Apps Script project.
 * Script Properties: GCP_PROJECT_ID (required), GCP_LOCATION (optional, default "global").
 */

function callGemini_(prompt, model, temperature) {
  var project = getProp_('GCP_PROJECT_ID');
  if (!project) throw new Error('AI drafting is not set up yet (Script Property GCP_PROJECT_ID missing). You can type the narrative manually.');
  var loc = getProp_('GCP_LOCATION') || 'global';
  var host = loc === 'global' ? 'aiplatform.googleapis.com' : loc + '-aiplatform.googleapis.com';
  var url = 'https://' + host + '/v1/projects/' + project + '/locations/' + loc + '/publishers/google/models/' + (model || 'gemini-2.5-flash') + ':generateContent';
  var payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: Number(temperature || 0.4), maxOutputTokens: 2048, responseMimeType: 'application/json' }
  };
  var lastErr;
  for (var attempt = 1; attempt <= 2; attempt++) {
    var res = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, payload: JSON.stringify(payload)
    });
    var code = res.getResponseCode();
    if (code === 200) {
      var body = JSON.parse(res.getContentText());
      var cand = (body.candidates || [])[0];
      var text = cand && cand.content && cand.content.parts ? cand.content.parts.map(function (p) { return p.text || ''; }).join('') : '';
      if (text) return text;
      lastErr = 'Empty AI response' + (cand && cand.finishReason ? ' (' + cand.finishReason + ')' : '');
    } else {
      lastErr = 'Vertex AI error ' + code + ': ' + res.getContentText().slice(0, 300);
      if (code !== 429 && code < 500) break;
      Utilities.sleep(1500);
    }
  }
  throw new Error(lastErr);
}

/** Draft the proposal narrative. opts = { tone: 'formal' | 'concise', language: 'EN' | 'AR' } */
function apiDraftNarrative(deal, opts) {
  var user = requireUser_();
  var m = getMaster();
  var row = (m.AIPrompts || []).filter(function (r) { return r.key === 'PROPOSAL_NARRATIVE'; })[0] || {};
  var raw = callGemini_(buildNarrativePrompt(m, deal, opts), row.model, row.temperature);
  var res = sanitizeNarrative(raw, m);
  audit_('AI_DRAFT', { ok: res.ok, warnings: res.warnings, tone: (opts || {}).tone }, deal.dealId || '');
  if (!res.ok) throw new Error('The AI draft could not be used (' + res.warnings.join('; ') + '). Please try again.');
  return res;
}

/** Editor check: run once after linking the Cloud project. */
function aiHealthCheck() {
  var t = callGemini_('Return JSON {"ok": true, "model": "<your model name>"}', null, 0);
  console.log(t);
  return t;
}
