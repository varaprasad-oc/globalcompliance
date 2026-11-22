/* Browser test of the client acceptance page (mocked server). Usage: node tests/accept-ui.js [pdf] [screenshotDir] */
const { chromium } = require('playwright'); const fs = require('fs'); const vm = require('vm'); const path = require('path');
const root = '/home/user/globalcompliance';
const ctx = vm.createContext({ console }); vm.runInContext(fs.readFileSync(root + '/src/server/AcceptPage.js', 'utf8'), ctx);
const T = 'a'.repeat(64);
const pdf = fs.readFileSync(process.argv[2] || (root + '/tests/fixtures-files/sample.pdf')).toString('base64');
const out = process.argv[3] || '/tmp';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 1100 } });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  const mock = (state) => `<script>window.__calls=[];window.google={script:{run:new Proxy({},{get:function(t,k){var s=null,f=null;var o={withSuccessHandler:function(x){s=x;return o},withFailureHandler:function(x){f=x;return o}};return function(){return o}}})}};
  (function(){var R={apiAcceptInfo:function(){return {state:'${state}',docLabel:'Quotation & Order Form',docNo:'OC-Q-2026-0009',clientName:'Fashion Retail Group S.A.E.',entityName:'RIS Services DMCC',repName:'Varaprasad SN',repEmail:'varaprasad@optculture.com',email:'ah***@frg.example',validUntil:'21st December 2026',pdf:'${pdf}',fileName:'OC-Q-2026-0009.pdf'}},
  apiAcceptSendCode:function(){return {sentTo:'ah***@frg.example',minutes:15}},apiAcceptVerify:function(t,c){if(c!=='123456')throw new Error('The code is not correct. 4 attempt(s) left.');return {ticket:'TK',email:'ah***@frg.example',minutes:30}},
  apiAcceptOnline:function(t,k,n,ti,a,cc){if(k!=='TK')throw new Error('Please verify your email first (step 2).');if(!a)throw new Error('Please tick the box to confirm your acceptance.');window.__cc=cc;return {ok:true,acceptedAt:'21 Nov 2026, 14:00 (Dubai time)'}}};
  window.google={script:{run:new Proxy({},{get:function(_,k){var s,f;var o={withSuccessHandler:function(x){s=x;return o},withFailureHandler:function(x){f=x;return o}};if(k==='withSuccessHandler'||k==='withFailureHandler')return o[k];return o}})}};
  var run={};var mk=function(){var s,f;var o={withSuccessHandler:function(x){s=x;return o},withFailureHandler:function(x){f=x;return o}};Object.keys(R).forEach(function(n){o[n]=function(){var args=arguments;window.__calls.push(n);setTimeout(function(){try{s(R[n].apply(null,args))}catch(e){f(e)}},10)}});return o};
  window.google={script:{run:{withSuccessHandler:function(x){return mk().withSuccessHandler(x)}}}};})();</script>`;
  const html = (state) => ctx.acceptPageHtml('gas', { token: T }).replace('<head>', '<head>' + mock(state));
  await p.route('**/*', (r) => r.fulfill({ contentType: 'text/html', body: html('OK') }));
  await p.goto('http://x/'); await p.waitForTimeout(600);
  const res = [];
  const ck = (n, c) => { res.push((c ? '✓ ' : '✗ ') + n); };
  ck('Shows document title, parties and validity', (await p.textContent('#state')).includes('OC-Q-2026-0009') && (await p.textContent('#state')).includes('RIS Services DMCC'));
  ck('PDF embedded and downloadable (blob, no Drive link)', (await p.getAttribute('#pdf', 'src')).startsWith('blob:') && (await p.getAttribute('#dl', 'download')) === 'OC-Q-2026-0009.pdf');
  await p.click('#send'); await p.waitForTimeout(100);
  ck('Code sent message', (await p.textContent('#sent')).includes('ah***@frg.example'));
  ck('Step 3 hidden until the email is verified', !(await p.isVisible('#act')));
  await p.fill('#code', '999999'); await p.click('#verify'); await p.waitForTimeout(100);
  ck('Wrong code shows attempts left (at Verify)', (await p.textContent('#vmsg')).includes('attempt(s) left') && !(await p.isVisible('#act')));
  await p.fill('#code', '123456'); await p.click('#verify'); await p.waitForTimeout(100);
  ck('Verify unlocks step 3 and shows Verified as …', (await p.isVisible('#act')) && (await p.textContent('#verified')).includes('Verified as ah***@frg.example') && await p.isDisabled('#code'));
  await p.fill('#nm', 'Ahmed Hassan'); await p.fill('#ti', 'CEO'); await p.fill('#cc', 'finance@frg.example, legal@frg.example');
  await p.click('#accept'); await p.waitForTimeout(100);
  ck('Accept without ticking asks to confirm', (await p.textContent('#msg')).includes('tick the box'));
  await p.check('#agree');
  await p.screenshot({ path: out + '/accept-page.png', fullPage: true });
  await p.click('#accept'); await p.waitForTimeout(150);
  ck('Accept shows thank-you mentioning the confirmation to added addresses', (await p.textContent('#state')).includes('Thank you') && (await p.textContent('#state')).includes('addresses you added') && (await p.evaluate(() => window.__cc)) === 'finance@frg.example, legal@frg.example');
  await p.click('body');
  await p.route('**/*', (r) => r.fulfill({ contentType: 'text/html', body: html('EXPIRED') }));
  await p.goto('http://x/'); await p.waitForTimeout(400);
  ck('Expired link: message, no document shown', (await p.textContent('#state')).includes('expired') && !(await p.isVisible('#doc')));
  // ---- Netlify-hosted page: token from the path, server calls via fetch without cookies ----
  const EXEC = 'https://script.google.com/macros/s/TEST/exec';
  const calls = [];
  await p.unrouteAll();
  await p.route(EXEC, async (r) => {
    const req = JSON.parse(r.request().postData() || '{}'); calls.push([req.fn, r.request().headers()['cookie'] || '']);
    const R = { apiAcceptInfo: { state: 'OK', docLabel: 'MSA', docNo: 'OC-MSA-2026-0001', clientName: 'Fashion Retail Group S.A.E.', entityName: 'RIS Services DMCC', repName: 'Varaprasad SN', repEmail: 'v@optculture.com', email: 'ah***@frg.example', validUntil: '21st December 2026', pdf: pdf, fileName: 'OC-MSA-2026-0001.pdf' },
      apiAcceptSendCode: { sentTo: 'ah***@frg.example', minutes: 15 }, apiAcceptVerify: { ticket: 'TK', email: 'ah***@frg.example', minutes: 30 }, apiAcceptOnline: { ok: true, acceptedAt: '22 Nov 2026, 10:00 (Dubai time)' } };
    const bad = req.fn === 'apiAcceptVerify' && req.args[1] !== '123456';
    await r.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(bad ? { ok: false, error: 'The code is not correct. 4 attempt(s) left.' } : { ok: true, result: R[req.fn] }) });
  });
  await p.route('https://salestools.optculturecx.com/accept/**', (r) => r.fulfill({ contentType: 'text/html', body: ctx.acceptPageHtml('netlify', { execUrl: EXEC }) }));
  await p.goto('https://salestools.optculturecx.com/accept/' + T); await p.waitForTimeout(600);
  ck('Netlify page: token read from the link, document shown', (await p.textContent('#state')).includes('OC-MSA-2026-0001') && (await p.getAttribute('#pdf', 'src')).startsWith('blob:'));
  await p.click('#send'); await p.waitForTimeout(200);
  await p.fill('#code', '111111'); await p.click('#verify'); await p.waitForTimeout(200);
  ck('Netlify page: server error message shown (wrong code)', (await p.textContent('#vmsg')).includes('attempt(s) left'));
  await p.fill('#code', '123456'); await p.click('#verify'); await p.waitForTimeout(200);
  await p.fill('#nm', 'Ahmed Hassan'); await p.fill('#ti', 'CEO'); await p.check('#agree');
  await p.click('#accept'); await p.waitForTimeout(300);
  ck('Netlify page: accept completes', (await p.textContent('#state')).includes('Thank you'));
  ck('Netlify page: only token functions called, never with cookies', calls.length >= 4 && calls.every((c) => /^apiAccept/.test(c[0]) && !c[1]));
  await p.goto('https://salestools.optculturecx.com/accept/not-a-token'); await p.waitForTimeout(300);
  ck('Netlify page: malformed link rejected without calling the server', (await p.textContent('#state')).includes('not valid'));
  await p.unroute(EXEC); await p.route(EXEC, (r) => r.fulfill({ contentType: 'text/html', body: '<html>Script function not found: doPost</html>' }));
  await p.goto('https://salestools.optculturecx.com/accept/' + T); await p.waitForTimeout(400);
  ck('Netlify page: if the service is not updated yet, offers the alternative page link', (await p.textContent('#state')).includes('alternative page') && (await p.getAttribute('#state a', 'href')) === EXEC + '?a=' + T);
  ck('No page errors', errors.length === 0);
  console.log(res.join('\n')); if (errors.length) console.log(errors);
  await b.close();
})();
