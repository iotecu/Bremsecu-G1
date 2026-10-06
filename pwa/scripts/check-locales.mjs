import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src/i18n/locales');
const source = JSON.parse(fs.readFileSync(path.join(root, 'tr.json'), 'utf8'));
const sourceKeys = Object.keys(source).sort();
const locales = ['en','de','fr','it','el','ru','ar','fa','bg','pl','sr','ro','es'];
let failed = false;

for (const locale of locales) {
  const target = JSON.parse(fs.readFileSync(path.join(root, locale + '.json'), 'utf8'));
  const missing = sourceKeys.filter((key) => !(key in target));
  const extra = Object.keys(target).filter((key) => !(key in source));
  if (missing.length || extra.length) {
    failed = true;
    console.error('[' + locale + '] missing: ' + (missing.join(', ') || '-') + '; extra: ' + (extra.join(', ') || '-'));
  }
}
if (failed) process.exit(1);
console.log('i18n parity OK: ' + sourceKeys.length + ' keys across 14 locales');
