import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const dist = fileURLToPath(new URL('../dist-screen-test/', import.meta.url));
const data = fileURLToPath(new URL('../../firmware/screen-test/data/', import.meta.url));
async function list(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await list(path));
    else files.push(path);
  }
  return files;
}
const html = await readFile(join(dist, 'index.html'), 'utf8');
if (!html.includes('EKRAN TESTİ')) throw new Error('Not the explicit screen-test build');
const files = await list(dist);
let bytes = 0;
const scripts = (await Promise.all(files.filter((file) => file.endsWith('.js')).map((file) => readFile(file, 'utf8')))).join('\n');
if (!scripts.includes('SCREEN-TEST-RECORD') || scripts.includes('Test ekranını seç')) throw new Error('Screen-test entry and fixtures are missing');
for (const file of files) bytes += (await readFile(file)).length;
if (bytes > 0x270000 * 0.85) throw new Error('Screen-test assets exceed LittleFS budget');
await rm(data, { recursive: true, force: true });
await mkdir(data, { recursive: true });
await cp(dist, data, { recursive: true });
await writeFile(join(data, 'screen-test-package.json'), JSON.stringify({ purpose: 'SCREEN_TEST_ONLY', realMeasurements: false, screens: 40, totalAssetBytes: bytes }, null, 2));
console.log(`Screen-test filesystem prepared: ${files.length} files, ${bytes} bytes; no real hardware API.`);
