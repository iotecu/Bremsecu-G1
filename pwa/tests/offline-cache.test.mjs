import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { generateServiceWorker } from '../scripts/generate-service-worker.mjs';

test('offline shell reloads, firmware API stays live, and same-name content updates replace the cache', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bremsecu-cache-'));
  try {
    await writeFile(join(dir, 'index.html'), '<html>First version</html>');
    await writeFile(join(dir, 'manifest.webmanifest'), '{}');
    const first = await generateServiceWorker(dir);
    await writeFile(join(dir, 'index.html'), '<html>Second version</html>');
    const second = await generateServiceWorker(dir);
    assert.notEqual(first.fingerprint, second.fingerprint, 'content changes must invalidate even unchanged filenames');
    const handlers = {};
    const saved = new Map();
    const deleted = [];
    const origin = 'https://device.example';
    let offline = false;
    const caches = {
      open: async () => ({ addAll: async (urls) => { for (const url of urls) saved.set(url, new Response('offline shell')); }, put: async (request, response) => saved.set(request.url, response) }),
      match: async (request) => saved.get(typeof request === 'string' ? request : request.url)?.clone(),
      keys: async () => ['bremsecu-g1-' + first.fingerprint, 'unrelated-app'],
      delete: async (key) => { deleted.push(key); return true; },
    };
    vm.runInNewContext(second.source, { URL, Response, caches, fetch: async () => { if (offline) throw new Error('offline'); return new Response('network'); }, self: {
      registration: { scope: origin + '/pwa/' }, location: { origin }, skipWaiting: async () => undefined, clients: { claim: async () => undefined }, addEventListener: (type, handler) => { handlers[type] = handler; },
    } });
    let work;
    handlers.install({ waitUntil: (promise) => { work = promise; } }); await work;
    handlers.activate({ waitUntil: (promise) => { work = promise; } }); await work;
    assert.deepEqual(deleted, ['bremsecu-g1-' + first.fingerprint]);
    offline = true;
    let response;
    handlers.fetch({ request: { method: 'GET', url: origin + '/pwa/', mode: 'navigate' }, respondWith: (promise) => { response = promise; } });
    assert.equal(await (await response).text(), 'offline shell');
    for (const [method, url] of [['GET', '/api/v1/status'], ['POST', '/api/v1/test/start']]) {
      let intercepted = false;
      handlers.fetch({ request: { method, url: origin + url, mode: 'cors' }, respondWith: () => { intercepted = true; } });
      assert.equal(intercepted, false, 'firmware evidence and commands must not use offline cache');
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
