import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

const assetFiles = [
  'battery-status.svg',
  'bremsecu-logo.png',
  'cable-662-5072.png',
  'cable-683-7072.png',
  'find.svg',
  'hotspot.png',
  'icon-back.svg',
  'icon-home.svg',
  'icon-settings-large.svg',
  'icon-settings.svg',
  'icon-wifi.svg',
  'iso12098-socket.png',
  'iso7638-socket.png',
  'lamp-test.png',
  'login-background.png',
  'report-2.svg',
  'resistance.svg',
  'save1.svg',
  'tiger.png',
  'tractor-icon.png',
  'trailer-icon.png',
  'write.svg',
];

test('Phase 3 token copy matches the canonical authority', async () => {
  const [canonicalRaw, localRaw] = await Promise.all([
    readFile(`${repoRoot}docs/figma/design-tokens.json`, 'utf8'),
    readFile(`${projectRoot}src/theme/design-tokens.json`, 'utf8'),
  ]);

  assert.deepEqual(JSON.parse(localRaw), JSON.parse(canonicalRaw));
});

test('all approved implementation assets are available locally to the PWA', async () => {
  await Promise.all(assetFiles.map((asset) => access(`${projectRoot}public/assets/${asset}`)));
});
