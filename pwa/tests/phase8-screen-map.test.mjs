import assert from 'node:assert/strict';
import test from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('all 40 approved screenshots have an explicit implementation mapping', async () => {
  const screenshotDir = resolve(process.cwd(), '../docs/figma/screens');
  const mapPath = resolve(process.cwd(), '../docs/pwa/SCREEN_IMPLEMENTATION_MAP.md');
  const screenshots = (await readdir(screenshotDir)).filter((name) => /^[0-9]{2}-.*[.]png$/.test(name)).sort();
  const map = await readFile(mapPath, 'utf8');
  assert.equal(screenshots.length, 40);
  assert.deepEqual(screenshots.map((name) => Number(name.slice(0, 2))), Array.from({ length: 40 }, (_, index) => index + 1));
  for (const screenshot of screenshots) assert.ok(map.includes('`' + screenshot + '`'), 'Missing mapping for ' + screenshot);
});

test('implementation map preserves carousel and overlay semantics', async () => {
  const map = await readFile(resolve(process.cwd(), '../docs/pwa/SCREEN_IMPLEMENTATION_MAP.md'), 'utf8');
  assert.match(map, /activeCardIndex 0/);
  assert.match(map, /activeCardIndex 7/);
  assert.match(map, /canSubSlide 0/);
  assert.match(map, /canSubSlide 3/);
  assert.match(map, /entry-context overlay/);
  assert.match(map, /reports-context overlay/);
  assert.match(map, /shared save overlay/);
});
