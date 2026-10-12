import { readdir, readFile, stat } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
const required = ['index.html', 'manifest.webmanifest', 'sw.js'];

for (const file of required) {
  const info = await stat(new URL(file, dist));
  if (!info.isFile() || info.size === 0) {
    throw new Error('Missing static artifact: ' + file);
  }
}

const assetEntries = await readdir(new URL('assets/', dist));
if (assetEntries.length === 0) {
  throw new Error('Static build contains no local assets.');
}

const html = await readFile(new URL('index.html', dist), 'utf8');
if (!html.includes('manifest.webmanifest')) {
  throw new Error('Manifest is not linked from index.html.');
}
if (/\b(?:src|href)\s*=\s*["']https?:\/\//i.test(html)) {
  throw new Error('External HTML runtime dependency found.');
}

const sw = await readFile(new URL('sw.js', dist), 'utf8');
if (!sw.includes('index.html') || !sw.includes('manifest.webmanifest')) {
  throw new Error('Offline precache is incomplete.');
}
if (sw.includes('/api/v1/') === false) {
  throw new Error('Service worker must explicitly bypass firmware API requests.');
}

const cssEntries = assetEntries.filter((name) => name.endsWith('.css'));
for (const name of cssEntries) {
  const css = await readFile(new URL('assets/' + name, dist), 'utf8');
  if (/url\(\s*["']?https?:\/\//i.test(css) || /@import\s+["']https?:\/\//i.test(css)) {
    throw new Error('External CSS runtime dependency found: ' + name);
  }
}

const jsEntries = assetEntries.filter((name) => name.endsWith('.js'));
for (const name of jsEntries) {
  const js = await readFile(new URL('assets/' + name, dist), 'utf8');
  const externalRuntimePatterns = [
    /fetch\(\s*["']https?:\/\//i,
    /import\(\s*["']https?:\/\//i,
    /new\s+WebSocket\(\s*["'](?:wss?|https?):\/\//i,
    /\.open\(\s*["'][A-Z]+["']\s*,\s*["']https?:\/\//i,
  ];
  if (externalRuntimePatterns.some((pattern) => pattern.test(js))) {
    throw new Error('External JavaScript runtime dependency found: ' + name);
  }
}

console.log('static ESP32 build validation passed');
