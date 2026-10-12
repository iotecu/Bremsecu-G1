import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('responsive shell uses the live viewport and keeps technical RTL islands isolated', async () => {
  const css = await readFile(resolve(process.cwd(), 'src/styles.css'), 'utf8');
  assert.match(css, /height:\s*100dvh/);
  assert.match(css, /overflow-y:\s*auto/);
  assert.match(css, /\[dir="rtl"\]/);
  assert.match(css, /unicode-bidi:\s*isolate/);
  assert.match(css, /direction:\s*ltr/);
  assert.doesNotMatch(css, /scale\(var\(--app-scale/);
});

test('dashboard grid switches from two phone columns to four wide-screen columns', async () => {
  const css = await readFile(resolve(process.cwd(), 'src/screens/phase5/phase5.css'), 'utf8');
  assert.match(css, /\.p5-dashboard__grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,/);
  assert.match(css, /@media\s*\(min-width:\s*700px\)[\s\S]*\.p5-dashboard__grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(4,/);
});
