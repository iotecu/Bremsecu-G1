#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const localeDir = path.resolve(here, '../src/i18n/locales');
const codes = ['de','fr','it','el','ru','ar','fa','bg','pl','sr','ro','es'];

function flatten(value, prefix = '', out = {}) {
  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? prefix + '.' + key : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flatten(child, next, out);
    } else {
      out[next] = String(child);
    }
  }
  return out;
}

const english = flatten(JSON.parse(await fs.readFile(path.join(localeDir, 'en.json'), 'utf8')));
const phaseKeys = Object.keys(english).filter((key) => key.startsWith('phase5.'));
let failed = false;

for (const code of codes) {
  const locale = flatten(JSON.parse(await fs.readFile(path.join(localeDir, code + '.json'), 'utf8')));
  const same = phaseKeys.filter((key) => locale[key] === english[key]);

  // Technical tokens such as CAN H, GND, ISO connector names, OK, model and firmware labels
  // legitimately stay identical. A high count means the locale has fallen back to English copy.
  if (same.length > 25) {
    failed = true;
    console.error(
      '[' + code + '] too much English fallback in phase5: ' +
      same.length + '/' + phaseKeys.length + ' strings are identical to English.'
    );
    console.error('Examples: ' + same.slice(0, 12).join(', '));
  }
}

if (failed) process.exit(1);
console.log('i18n coverage passed: no non-English locale contains bulk English phase5 fallback.');
