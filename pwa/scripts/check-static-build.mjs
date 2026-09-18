import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url);
const required = ['index.html', 'manifest.webmanifest', 'sw.js'];

for (const file of required) {
  const info = await stat(new URL(file, dist));
  if (!info.isFile() || info.size === 0) throw new Error('Missing static artifact: ' + file);
}

const entries = await readdir(new URL('assets/', dist));
if (entries.length === 0) throw new Error('Static build contains no local assets.');

const html = await readFile(new URL('index.html', dist), 'utf8');
if (!html.includes('manifest.webmanifest')) throw new Error('Manifest is not linked from index.html.');

const sw = await readFile(new URL('sw.js', dist), 'utf8');
if (!sw.includes('index.html') || !sw.includes('manifest.webmanifest')) {
  throw new Error('Offline precache is incomplete.');
}

const textFiles = [];
async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir.pathname, entry.name);
    if (entry.isDirectory()) await collect(new URL(entry.name + '/', dir));
    else if (/\.(html|js|css|json|webmanifest)$/.test(entry.name)) textFiles.push(path);
  }
}
await collect(dist);
for (const path of textFiles) {
  const content = await readFile(path, 'utf8');
  if (/https?:\/\//i.test(content)) {
    throw new Error('External runtime URL found in static build: ' + path);
  }
}

console.log('static ESP32 build validation passed');
