/* Text-replacement test with a fake Google Docs Text element that mimics style inheritance on empty runs. */
const fs = require('fs'), path = require('path'), vm = require('vm');
function fakeText(str, styles, prevStyle) {
  // styles: array of per-char style names; inserting into an empty element copies prevStyle (like Google Docs)
  const t = { s: str, st: styles.slice(),
    findText(re) { const m = new RegExp(re).exec(this.s); return m ? { getElement: () => ({ asText: () => t }), getStartOffset: () => m.index, getEndOffsetInclusive: () => m.index + m[0].length - 1 } : null; },
    insertText(i, v) { const style = i > 0 ? this.st[i - 1] : prevStyle;  /* Docs: copy previous character; at offset 0 the previous element */ this.s = this.s.slice(0, i) + v + this.s.slice(i); this.st.splice(i, 0, ...Array(v.length).fill(style)); },
    deleteText(a, b) { this.s = this.s.slice(0, a) + this.s.slice(b + 1); this.st.splice(a, b - a + 1); } };
  return t;
}
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src/server/DocEngine.js'), 'utf8').replace(/^var DOC_FOLDER_KEY[\s\S]*?(?=function replaceLiteral_)/m, '').replace(/function highlightLeftovers_[\s\S]*$/, ''), ctx);

test('Replacing a tag that is the whole cell keeps the template style (not the white header style)', () => {
  const t = fakeText('{{label}}', Array(9).fill('dark'), 'white');
  ctx.replaceLiteral_(t, '{{label}}', 'Platform charges');
  eq(t.s, 'Platform charges');
  eq([...new Set(t.st)], ['dark']);
});

test('Replacing with empty value removes the tag', () => {
  const t = fakeText('A {{x}} B', Array(9).fill('dark'), 'white');
  ctx.replaceLiteral_(t, '{{x}}', '');
  eq(t.s, 'A  B');
});

test('Repeated tags are all replaced', () => {
  const t = fakeText('{{a}}-{{a}}', Array(11).fill('dark'), 'white');
  ctx.replaceLiteral_(t, '{{a}}', 'X');
  eq(t.s, 'X-X');
});

test('Tag at the start of a cell after another tag was removed keeps template style', () => {
  const t = fakeText('{{EACH:X}}{{label}}', Array(19).fill('dark'), 'white');
  ctx.replaceLiteral_(t, '{{EACH:X}}', '');
  ctx.replaceLiteral_(t, '{{label}}', 'Loyalty plan');
  eq(t.s, 'Loyalty plan');
  eq([...new Set(t.st)], ['dark']);
});
