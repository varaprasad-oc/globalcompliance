/* Converts the legal drafts (docs/templates/*.md) into template HTML for Google Docs upload.
   Usage: node tools/md2html.js   -> templates/tos.html (ToS + SLA as Schedule 2), templates/dpa.html
   Drops reviewer-only content: blockquotes (>), ▲ markers and *(Reviewer: …)* notes. */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>').replace(/`([^`]+)`/g, '$1');

function md2html(md) {
  const lines = md.replace(/ ?▲/g, '').replace(/\s*\*\(Reviewer:[^)]*\)\*/g, '').split('\n');
  let out = [], list = null, table = null;
  const flush = () => {
    if (list) { out.push('<ul>' + list.map((l) => '<li>' + inline(l) + '</li>').join('') + '</ul>'); list = null; }
    if (table) {
      const rows = table.filter((r) => !/^\|\s*-/.test(r)).map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
      out.push('<table>' + rows.map((r, i) => '<tr>' + r.map((c) => (i === 0 ? '<th>' : '<td>') + inline(c) + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('') + '</table>');
      table = null;
    }
  };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (l.startsWith('>')) continue;
    if (/^\|/.test(l)) { if (list) flush(); (table = table || []).push(l); continue; }
    if (/^- /.test(l)) { if (table) flush(); (list = list || []).push(l.slice(2)); continue; }
    flush();
    if (!l.trim() || l === '---') continue;
    const h = l.match(/^(#{1,3}) (.*)$/);
    if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    out.push('<p>' + inline(l) + '</p>');
  }
  flush();
  return out.join('\n');
}

const css = '<style>body{font-family:Arial;font-size:10.5pt;color:#1d2733} h1{font-size:18pt;color:#B6262B} h2{font-size:12.5pt;color:#B6262B} h3{font-size:11pt;color:#1a1a1a} table{border-collapse:collapse;width:100%} td,th{border:1px solid #c9d2dc;padding:4px 6px;font-size:10pt} th{background:#7B3FE4;color:#ffffff}</style>';
const wrap = (body) => `<html><head><meta charset="utf-8">${css}</head><body>\n<p>{{IMAGE:OptCultureLogo}}</p>\n${body}\n</body></html>\n`;
const read = (f) => fs.readFileSync(path.join(root, 'docs/templates', f), 'utf8');

let tos = read('TOS.md').replace(/## Schedule 2 — Service Level Terms\n\nSee `docs\/templates\/SLA\.md`, inserted here in the final template\.\n/, '{{SLA}}');
const sla = read('SLA.md').replace(/^# Schedule 2 — Service Level Terms/m, '## Schedule 2 — Service Level Terms').replace(/^## (\d)/gm, '### $1');
tos = tos.replace('{{SLA}}', sla + '\n');
fs.writeFileSync(path.join(root, 'templates/tos.html'), wrap(md2html(tos)));
fs.writeFileSync(path.join(root, 'templates/dpa.html'), wrap(md2html(read('DPA.md'))));
console.log('templates/tos.html, templates/dpa.html written');
