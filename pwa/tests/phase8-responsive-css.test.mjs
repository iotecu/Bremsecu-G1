import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('Phase 8 RTL rules preserve technical LTR islands without mirroring the approved geometry', async () => {
  const css = await readFile(resolve(process.cwd(), 'src/styles.css'), 'utf8');
  assert.match(css, /\[dir="rtl"\]/);
  assert.match(css, /unicode-bidi:\s*isolate/);
  assert.match(css, /direction:\s*ltr/);
  assert.match(css, /transform-origin:\s*top center/);
});
