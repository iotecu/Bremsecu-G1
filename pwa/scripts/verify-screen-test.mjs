import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule } from 'node:vm';
import { JSDOM, VirtualConsole } from 'jsdom';

// Evaluate the actual compiled ES module with browser import.meta (no Vite env).
// This catches incorrect build-time flags and ESP-IP routing, without a dev server.
const dist = new URL('../dist-screen-test/', import.meta.url);
const html = await readFile(new URL('index.html', dist), 'utf8');
const entry = html.match(/<script[^>]+src="([^"]+)"/)[1];
const bundle = await readFile(new URL(entry, dist), 'utf8');
const expected = [
  '01-login','02-vehicle-entry','03-new-vehicle','02-vehicle-entry','05-iso7638-select','06-iso7638-live',
  '07-iso12098-select','08-iso12098-live',null,null,null,'12-cable-test-select',
  '13-iso7638-cable-select','14-iso7638-cable-measurement','15-iso12098-cable-select','16-iso12098-cable-measurement',
  ...Array(5).fill('17-can-termination-select'),
  'can-7638-tractor-safety','can-7638-tractor-resistance','can-7638-trailer-safety','can-7638-trailer-resistance',
  'can-12098-tractor-safety','can-12098-tractor-resistance','can-12098-trailer-safety','can-12098-trailer-resistance',
  '30-lamp-test-select','31-lamp-test-measurement','32-axle-lift-safety','33-reports','34-report-result',
  '34-report-result','31-lamp-test-measurement','37-settings','38-settings-detail','39-battery-status','33-reports',
];
const overlays = {4:'old-record-search',9:'pin-10-validation',10:'pin-11-validation',11:'pin-12-validation',35:'35-report-save-modal',36:'36-report-save-common-modal',40:'40-old-record-search-alt'};
async function render(screen, scenario = '') {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => errors.push(error));
  const dom = new JSDOM(html, { url: `http://192.168.4.1/?visual=1&screen=${screen}&scenario=${scenario}`, runScripts:'outside-only', pretendToBeVisual:true, virtualConsole });
  dom.window.fetch = async (url) => { assert.equal(url,'./screen-test-health');return {ok:true,json:async()=>({purpose:'SCREEN_TEST_ONLY'})}; };
  dom.window.WebSocket = class { constructor() { throw new Error('Screen-test attempted WebSocket access'); } };
  dom.window.addEventListener('error', (event) => errors.push(event.error));
  const module = new SourceTextModule(bundle, { context: dom.getInternalVMContext(), initializeImportMeta(meta) { meta.url = `http://192.168.4.1/${entry}`; } });
  await module.link(() => { throw new Error('Unexpected external module import'); });
  await module.evaluate();
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.deepEqual(errors, [], `render errors at screen ${screen}`);
  assert.equal(dom.window.document.querySelector('.screen-test-controls'),null);
  return dom;
}
for (let screen = 1; screen <= 40; screen++) {
  const dom = await render(screen);
  try {
    if (expected[screen-1]) assert.ok(dom.window.document.querySelector(`[data-screen="${expected[screen-1]}"]`), `ESP route ${screen} missing`);
    if (overlays[screen]) assert.ok(dom.window.document.querySelector(`[data-overlay="${overlays[screen]}"]`), `ESP overlay ${screen} missing`);
  } finally { dom.window.close(); }
}
for (const screen of [6,8]) for (const scenario of ['pass','multi-fail','pending']) {
  const dom = await render(screen, scenario);
  try {
    const doc = dom.window.document;
    assert.equal(doc.querySelectorAll('.p5-channel-row').length, screen === 6 ? 7 : 15);
    assert.equal(doc.querySelectorAll('.p5-channel-row.is-failed').length, scenario === 'multi-fail' ? 2 : 0);
    assert.equal(doc.querySelectorAll('.p5-channel-row.is-passed').length, scenario === 'pass' ? (screen === 6 ? 7 : 15) : scenario === 'multi-fail' ? (screen === 6 ? 5 : 13) : 0);
    assert.equal(doc.querySelectorAll('.p5-failure-summary').length, scenario === 'multi-fail' ? 1 : 0);
  } finally { dom.window.close(); }
}
console.log('Compiled screen-test validation passed: 40 ESP-IP routes and 6 voltage scenarios, zero hardware network access.');
