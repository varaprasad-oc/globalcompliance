/**
 * The client's acceptance page (?a=<token>). Self-contained HTML (no extra project file). It only calls the token-based
 * apiAccept* functions. The document is shown from the PDF bytes returned for that token; the client never gets a Drive link.
 */
function acceptPage_(token) {
  var safe = /^[a-f0-9]{64}$/.test(String(token || '')) ? token : '';
  var html = acceptPageHtml('gas', { token: safe });
  return HtmlService.createHtmlOutput(html).setTitle('OptCulture – Review & accept')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

var ACCEPT_PAGE_HTML = [
  '<!doctype html><html><head><meta charset="utf-8"><style>',
  ':root{--brand:#B6262B;--purple:#7B3FE4;--ink:#1d2733;--muted:#6b7785;--line:#dfe3ea;--bg:#f6f7fb}',
  'body{margin:0;font-family:Arial,Helvetica,sans-serif;color:var(--ink);background:var(--bg)}',
  'header{background:#fff;border-bottom:3px solid var(--brand);padding:14px 20px;font-weight:bold;font-size:18px}',
  'header span{color:var(--brand)}main{max-width:860px;margin:0 auto;padding:16px}',
  '.card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:18px;margin-bottom:14px}',
  'h1{font-size:20px;margin:0 0 6px}h2{font-size:16px;margin:0 0 10px;color:var(--brand)}.muted{color:var(--muted);font-size:14px}',
  'iframe{width:100%;height:560px;border:1px solid var(--line);border-radius:8px;background:#fff}',
  'label{display:block;font-size:13px;color:var(--muted);margin:10px 0 4px}input[type=text],input[type=email]{width:100%;box-sizing:border-box;padding:10px;border:1px solid var(--line);border-radius:6px;font-size:15px}',
  'button{background:var(--brand);color:#fff;border:0;border-radius:6px;padding:11px 18px;font-size:15px;cursor:pointer}button.secondary{background:#fff;color:var(--ink);border:1px solid var(--line)}',
  'button:disabled{opacity:.5;cursor:default}.tabs{display:flex;gap:8px;margin:12px 0}.tabs button{flex:1}.tabs button.on{background:var(--purple)}',
  '.err{color:#c62828;margin-top:10px}.ok{color:#2e7d32}.hidden{display:none}.row{display:flex;gap:10px;flex-wrap:wrap}.row>div{flex:1;min-width:200px}',
  '.check{display:flex;gap:8px;align-items:flex-start;margin-top:12px;font-size:14px}.check input{margin-top:3px}',
  '</style></head><body><header><span>Opt</span>Culture <span class="muted" style="font-weight:normal;font-size:14px">· Review &amp; accept</span></header><main>',
  '<div id="state" class="card">Loading…</div>',
  '<div id="doc" class="card hidden"><h2>1. Review the document</h2><iframe id="pdf" title="Document"></iframe>',
  '<p class="muted"><a id="dl" href="#" download>Download the PDF</a> to read or print it.</p></div>',
  '<div id="verify" class="card hidden"><h2>2. Verify your email</h2><p class="muted">We will send a 6-digit code to <b id="em"></b>.</p>',
  '<button id="send">Send me a code</button> <span id="sent" class="muted"></span>',
  '<label for="code">Verification code</label><div class="row" style="align-items:center"><div style="flex:0 0 190px;min-width:0"><input id="code" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></div><div style="flex:0 0 auto;min-width:0"><button id="verify">Verify</button></div></div>',
  '<p id="verified" class="ok hidden" style="font-weight:bold"></p><div id="vmsg" class="err"></div></div>',
  '<div id="act" class="card hidden"><h2>3. Accept online or upload a signed copy</h2>',
  '<div class="row"><div><label for="nm">Your full name</label><input id="nm" type="text"></div><div><label for="ti">Your designation</label><input id="ti" type="text"></div></div>',
  '<label for="cc">Also send the signed copy to (optional – up to 5 email addresses, separated by commas)</label><input id="cc" type="text" placeholder="e.g. finance@yourcompany.com, legal@yourcompany.com">',
  '<div class="tabs"><button class="on" id="tOnline">Accept online</button><button class="secondary" id="tUpload">Upload signed PDF</button></div>',
  '<div id="pOnline"><div class="check"><input type="checkbox" id="agree"><label for="agree" style="margin:0;color:var(--ink);font-size:14px" id="agreeText"></label></div>',
  '<p><button id="accept">Accept</button></p></div>',
  '<div id="pUpload" class="hidden"><label for="file">Signed PDF (max 10 MB)</label><input id="file" type="file" accept="application/pdf,.pdf">',
  '<p><button id="upload">Upload signed copy</button></p></div>',
  '<div id="msg" class="err"></div></div>',
  '<p class="muted" style="text-align:center">This page opens only the document sent to you. Questions? Reply to the email you received.</p>',
  '</main><script>',
  'var T=__TOKEN_EXPR__,INFO=null,MODE="online",TICKET="";function $(i){return document.getElementById(i)}',
  'function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]})}',
  '__CALL_FN__',
  'function msg(t,ok){$("msg").className=ok?"ok":"err";$("msg").textContent=t||""}',
  'function done(when){["doc","verify","act"].forEach(function(i){$(i).classList.add("hidden")});$("state").innerHTML="<h1 class=ok>Thank you</h1><p>"+esc(INFO.docLabel)+" "+esc(INFO.docNo)+" was received on "+esc(when)+". A confirmation with the signed copy has been emailed to you"+($("cc").value.trim()?" and the addresses you added":"")+", and "+esc(INFO.repName)+" will be in touch.</p>"}',
  'function show(i){INFO=i;var head=i.docNo?"<h1>"+esc(i.docLabel||"Document")+" "+esc(i.docNo)+"</h1>"+(i.clientName?"<p class=muted>From "+esc(i.entityName||"OptCulture")+" for "+esc(i.clientName)+"</p>":""):"";',
  ' if(i.state==="DONE"){$("state").innerHTML=head+"<p class=ok>This document has already been accepted"+(i.acceptedAt?" on "+esc(i.acceptedAt):"")+". Thank you.</p>";return}',
  ' if(i.state!=="OK"){$("state").innerHTML=head+"<p class=err>"+({EXPIRED:"This link has expired.",LOCKED:"This link is locked after too many wrong codes.",REVOKED:"This link is no longer valid."}[i.state]||"This link cannot be used.")+" Please contact "+esc(i.repName||"your OptCulture contact")+(i.repEmail?" ("+esc(i.repEmail)+")":"")+" for a new link.</p>";return}',
  ' $("state").innerHTML=head+"<p class=muted>Please review the document, verify your email and then accept it online or upload a signed copy. Link valid until "+esc(i.validUntil)+".</p>";',
  ' var bin=atob(i.pdf),u8=new Uint8Array(bin.length);for(var k=0;k<bin.length;k++)u8[k]=bin.charCodeAt(k);var url=URL.createObjectURL(new Blob([u8],{type:"application/pdf"}));',
  ' $("pdf").src=url;$("dl").href=url;$("dl").setAttribute("download",i.fileName||"document.pdf");$("em").textContent=i.email;',
  ' $("agreeText").textContent="I have reviewed the "+i.docLabel+" "+i.docNo+" and accept it on behalf of "+i.clientName+", and I confirm I am authorised to do so.";',
  ' ["doc","verify"].forEach(function(x){$(x).classList.remove("hidden")})}',
  '$("send").onclick=function(){var b=$("send");b.disabled=true;msg("");call("apiAcceptSendCode",T).then(function(r){$("sent").textContent="Code sent to "+r.sentTo+" – valid "+r.minutes+" minutes.";setTimeout(function(){b.disabled=false;b.textContent="Send a new code"},30000)}).catch(function(e){b.disabled=false;msg(e.message)})};',
  '$("tOnline").onclick=function(){MODE="online";$("tOnline").className="on";$("tUpload").className="secondary";$("pOnline").classList.remove("hidden");$("pUpload").classList.add("hidden")};',
  '$("tUpload").onclick=function(){MODE="upload";$("tUpload").className="on";$("tOnline").className="secondary";$("pUpload").classList.remove("hidden");$("pOnline").classList.add("hidden")};',
  '$("verify").onclick=function(){var c=$("code").value.trim();$("vmsg").textContent="";if(!/^\\d{6}$/.test(c)){$("vmsg").textContent="Enter the 6-digit code from your email.";return}var b=$("verify");b.disabled=true;',
  ' call("apiAcceptVerify",T,c).then(function(r){TICKET=r.ticket;$("code").disabled=true;b.classList.add("hidden");$("send").disabled=true;$("verified").textContent="\u2713 Verified as "+r.email+". Please complete step 3 within "+r.minutes+" minutes.";$("verified").classList.remove("hidden");$("act").classList.remove("hidden");$("act").scrollIntoView({behavior:"smooth"})}).catch(function(e){b.disabled=false;$("vmsg").textContent=e.message})};',
  'function need(){if(!TICKET){msg("Please verify your email first (step 2).");return null}return TICKET}',
  '$("accept").onclick=function(){var c=need();if(!c)return;var b=$("accept");b.disabled=true;msg("Recording your acceptance…",true);call("apiAcceptOnline",T,c,$("nm").value,$("ti").value,$("agree").checked,$("cc").value).then(function(r){done(r.acceptedAt)}).catch(function(e){b.disabled=false;msg(e.message)})};',
  '$("upload").onclick=function(){var c=need();if(!c)return;var f=$("file").files[0];if(!f){msg("Choose the signed PDF to upload.");return}if(f.size>10485760){msg("The file is larger than 10 MB.");return}',
  ' var b=$("upload");b.disabled=true;msg("Uploading…",true);var rd=new FileReader();rd.onload=function(){var b64=String(rd.result).split(",")[1];call("apiAcceptUpload",T,c,$("nm").value,$("ti").value,f.name,b64,$("cc").value).then(function(r){done(r.acceptedAt)}).catch(function(e){b.disabled=false;msg(e.message)})};rd.readAsDataURL(f)};',
  'if(!T){$("state").innerHTML="<p class=err>This link is not valid.</p>"}else{call("apiAcceptInfo",T).then(show).catch(function(e){$("state").innerHTML="<p class=err>"+esc(e.message)+"</p>"+(e.fallback&&typeof EXEC!=="undefined"?"<p><a href=\\""+EXEC+"?a="+T+"\\">Open the document on the alternative page</a> (if it does not open, please use a private/incognito browser window).</p>":"")})}',
  '</script></body></html>'
].join('\n');

/**
 * Builds the client page for one of two hosts (pure – also used by tools/bundle.js and tests):
 *  - 'gas':     served by Apps Script at ?a=<token>; calls the server with google.script.run.
 *  - 'netlify': static page at salestools.optculturecx.com/accept/<token>; calls the public deployment's doPost with
 *               fetch(credentials: 'omit'), so the client's own Google login (or their company's Google restrictions)
 *               never comes into play.
 */
function acceptPageHtml(mode, opts) {
  opts = opts || {};
  var tokenExpr, callFn;
  if (mode === 'netlify') {
    tokenExpr = '(function(){var t=(location.pathname.split("/").filter(Boolean).pop()||"").toLowerCase();return /^[a-f0-9]{64}$/.test(t)?t:""})()';
    callFn = 'var EXEC=' + JSON.stringify(String(opts.execUrl || '')) + ';function call(fn){var a=[].slice.call(arguments,1);' +
      'return fetch(EXEC,{method:"POST",credentials:"omit",redirect:"follow",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({fn:fn,args:a})})' +
      '.then(function(r){return r.text()}).then(function(t){try{return JSON.parse(t)}catch(x){var e=new Error("The service is not reachable right now.");e.fallback=true;throw e}})' +
      '.then(function(j){if(!j.ok)throw new Error(j.error||"Something went wrong.");return j.result})}';
  } else {
    tokenExpr = JSON.stringify(String(opts.token || ''));
    callFn = 'function call(fn){var a=[].slice.call(arguments,1);return new Promise(function(ok,ko){var r=google.script.run.withSuccessHandler(ok).withFailureHandler(function(e){ko(e)});r[fn].apply(r,a)})}';
  }
  var html = ACCEPT_PAGE_HTML.replace('__TOKEN_EXPR__', function () { return tokenExpr; }).replace('__CALL_FN__', function () { return callFn; });
  if (mode === 'netlify') html = html.replace('<head>', '<head><title>OptCulture – Review &amp; accept</title><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">');
  return html;
}
