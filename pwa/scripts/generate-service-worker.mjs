import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';


async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else files.push(absolute);
  }
  return files;
}

export async function generateServiceWorker(distPath) {
const files = (await walk(distPath))
  .map((absolute) => relative(distPath, absolute).split(sep).join('/'))
  .filter((path) => path !== 'sw.js')
  .sort();

const hash = createHash('sha256');
for (const path of files) {
  const content = await readFile(join(distPath, path));
  hash.update(path + '\0' + content.length + '\0');
  hash.update(content);
}
const fingerprint = hash.digest('hex').slice(0, 12);

const source = [
  "const CACHE_NAME = 'bremsecu-g1-" + fingerprint + "';",
  'const PRECACHE = ' + JSON.stringify(files, null, 2) + ';',
  '',
  'function scopedUrl(path) {',
  '  return new URL(path, self.registration.scope).toString();',
  '}',
  '',
  "self.addEventListener('install', (event) => {",
  '  event.waitUntil(',
  '    caches.open(CACHE_NAME)',
  '      .then((cache) => cache.addAll(PRECACHE.map(scopedUrl)))',
  '      .then(() => self.skipWaiting()),',
  '  );',
  '});',
  '',
  "self.addEventListener('activate', (event) => {",
  '  event.waitUntil(',
  '    caches.keys()',
  '      .then((keys) => Promise.all(',
  '        keys',
  "          .filter((key) => key.startsWith('bremsecu-g1-') && key !== CACHE_NAME)",
  '          .map((key) => caches.delete(key)),',
  '      ))',
  '      .then(() => self.clients.claim()),',
  '  );',
  '});',
  '',
  "self.addEventListener('fetch', (event) => {",
  '  const request = event.request;',
  "  if (request.method !== 'GET') return;",
  '  const url = new URL(request.url);',
  '  if (url.origin !== self.location.origin) return;',
  "  if (url.pathname.includes('/api/v1/')) return;",
  '',
  "  if (request.mode === 'navigate') {",
  '    event.respondWith(',
  '      fetch(request)',
  "        .catch(() => caches.match(scopedUrl('index.html')))",
  '        .then((response) => response || Response.error()),',
  '    );',
  '    return;',
  '  }',
  '',
  '  event.respondWith(',
  '    caches.match(request).then((cached) => {',
  '      if (cached) return cached;',
  '      return fetch(request).then((response) => {',
  '        if (!response || response.status !== 200) return response;',
  '        const copy = response.clone();',
  '        void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));',
  '        return response;',
  '      });',
  '    }),',
  '  );',
  '});',
].join('\n');

await writeFile(join(distPath, 'sw.js'), source, 'utf8');
return { source, fingerprint, fileCount: files.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await generateServiceWorker(fileURLToPath(new URL('../dist/', import.meta.url)));
  console.log('service worker generated: ' + result.fileCount + ' precached files; cache ' + result.fingerprint);
}
