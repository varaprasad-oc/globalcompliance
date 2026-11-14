/* Node test runner: loads the pure server files into one context and runs the tests. Usage: npm test */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = vm.createContext({ console });
['Util.js', 'SeedData.js', 'Pricing.js', 'DocData.js', 'DealLogic.js'].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'server', f), 'utf8'), ctx, { filename: f });
});

global.__ctx = ctx;
global.M = ctx.masterFromSeed(ctx.SEED);
let passed = 0, failed = 0;
global.test = (name, fn) => {
  try { fn(ctx); passed++; console.log('  ✓ ' + name); }
  catch (e) { failed++; console.log('  ✗ ' + name + '\n      ' + e.message); }
};
global.eq = (actual, expected, msg) => {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) throw new Error((msg || '') + ' expected ' + b + ' but got ' + a);
};

fs.readdirSync(__dirname).filter((f) => f.endsWith('.test.js')).forEach((f) => {
  console.log(f);
  require(path.join(__dirname, f));
});
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
