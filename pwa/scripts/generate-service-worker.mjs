import { createHash } from 'node:crypto';
import { readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const distUrl = new URL('../dist/', import.meta.url);
const distPath = distUrl.pathname;

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

const files = (await walk(distPath))
  .map((absolute) => relative(distPath, absolute).split(sep).join('/'))
  .filter((path) => path !== 'sw.js')
  .sort();

const fingerprint = createHash('sha256')
  .update(files.join('\n'))
  .digest('hex')
  .slice(0, 12);

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

await writeFile(new URL('../dist/sw.js', import.meta.url), source, 'utf8');
console.log('service worker generated: ' + files.length + ' precached files; cache ' + fingerprint);
