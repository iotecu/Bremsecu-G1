import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { createRoot } from 'react-dom/client';
import App from '../src/App';
import { I18nProvider } from '../src/i18n';
import { FirmwareRuntime } from '../src/services/runtime';
import { FirmwareRuntimeProvider } from '../src/services/runtime-react';
import { FirmwareHttpError } from '../src/services/http-client';
import type { FirmwareHttpService, FirmwareConnectionListener, TelemetryListener } from '../src/services/ports';
import type { JsonObject } from '../src/services/contracts';

async function setup(screen: number, overrides: Partial<FirmwareHttpService> = {}) {
  const dom = new JSDOM('<html><body><div id="root"></div></body></html>', { url: `http://localhost/?visual=1&screen=${screen}` });
  const previous = { window: globalThis.window, document: globalThis.document, IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT };
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  const calls: string[] = [];
  const http: FirmwareHttpService = {
    getDevice: async () => ({}), getStatus: async () => ({ activeTest: { active: false } }), getSettings: async () => ({}), getReport: async () => ({}), getRecords: async () => ({ records: [] }),
    startTest: async () => { calls.push('start'); return { ok: true }; },
    stopTest: async () => { calls.push('stop'); return { ok: true }; },
    confirmTest: async () => ({}), createRecord: async () => ({}), saveCurrentResult: async () => { calls.push('save'); return { ok: true }; }, updateReport: async () => ({}), updateSettings: async () => ({}), ...overrides,
  };
  let emit: TelemetryListener = () => undefined;
  let connection: FirmwareConnectionListener = () => undefined;
  const runtime = new FirmwareRuntime({ http, telemetry: { subscribe: (listener) => { emit = listener; return () => undefined; }, subscribeConnection: (listener) => { connection = listener; return () => undefined; }, connect: () => undefined, disconnect: () => undefined } });
  const container = dom.window.document.getElementById('root')!;
  const root = createRoot(container);
  await act(async () => root.render(<I18nProvider><FirmwareRuntimeProvider runtime={runtime}><App /></FirmwareRuntimeProvider></I18nProvider>));
  await act(async () => { connection('open'); });
  const click = async (selector: string) => {
    const element = container.querySelector<HTMLElement>(selector);
    assert.ok(element, selector);
    await act(async () => element.click());
  };
  const cleanup = async () => { await act(async () => root.unmount()); dom.window.close(); Object.assign(globalThis, previous); };
  return { dom, container, calls, click, cleanup, runtime, emit };
}

for (const [screen, label] of [[6, 'voltage'], [14, 'cable'], [23, 'termination'], [31, 'lamp']] as const) {
  test(`${label} screen stops the device before Home even when cached status says inactive`, async () => {
    const s = await setup(screen);
    try { await s.click('[data-nav="home"]'); assert.deepEqual(s.calls, ['stop']); assert.ok(s.container.querySelector('.p5-carousel')); }
    finally { await s.cleanup(); }
  });
}

test('failed stop keeps the measurement visible and explains the device rejection', async () => {
  const s = await setup(6, { stopTest: async () => { throw new FirmwareHttpError(409, { error: 'SAFETY_INTERLOCK' }); } });
  try {
    await s.click('[data-nav="home"]');
    assert.ok(s.container.querySelector('[data-screen="06-iso7638-live"]'));
    assert.match(s.container.querySelector('[role="alert"]')?.textContent ?? '', /güvenlik/);
  } finally { await s.cleanup(); }
});

test('pending start cannot run twice or navigate away before its response', async () => {
  let finish: (value: JsonObject) => void = () => undefined;
  let starts = 0;
  const s = await setup(5, { startTest: async () => { starts++; return new Promise((resolve) => { finish = resolve; }); } });
  try {
    await s.click('[data-action="start-test"]');
    await s.click('[data-action="start-test"]');
    await s.click('[data-nav="home"]');
    assert.equal(starts, 1);
    assert.ok(s.container.querySelector('[data-screen="05-iso7638-select"]'));
    await act(async () => { finish({ ok: true }); });
    assert.ok(s.container.querySelector('[data-screen="06-iso7638-live"]'));
  } finally { await s.cleanup(); }
});

test('save failure retains the result and overlay; a successful save stops before exit', async () => {
  let reject = true;
  const s = await setup(6, { saveCurrentResult: async () => { if (reject) throw new FirmwareHttpError(409, { error: 'PRECONDITION_FAILED' }); return { ok: true }; } });
  try {
    await s.click('[data-action="save-result"]');
    await s.click('[data-action="save-and-exit"]');
    assert.ok(s.container.querySelector('[data-overlay="36-report-save-common-modal"]'));
    assert.match(s.container.querySelector('[role="alert"]')?.textContent ?? '', /tamamlanma/);
    assert.equal(s.calls.length, 0);
    reject = false;
    await s.click('[data-action="save-and-exit"]');
    assert.deepEqual(s.calls, ['stop']);
    assert.ok(s.container.querySelector('.p5-carousel'));
  } finally { await s.cleanup(); }
});

test('report editor preserves saved metadata and updates the displayed record id', async () => {
  let saved: { request: JsonObject; recordId?: string } | undefined;
  const report = { record: { id: 'rec-shown', diagnosisNote: 'Existing diagnosis', serviceNote: 'Existing service', fee: '125' } };
  const s = await setup(34, { getReport: async () => report, updateReport: async (request, recordId) => { saved = { request, recordId }; return { ok: true }; } });
  try {
    await act(async () => { await s.runtime.refreshReport('rec-shown'); });
    await s.click('[data-action="open-report-save"]');
    const textareas = s.container.querySelectorAll<HTMLTextAreaElement>('textarea');
    assert.equal(textareas[0]?.value, 'Existing diagnosis');
    assert.equal(textareas[1]?.value, 'Existing service');
    await s.click('[data-action="save-report-modal"]');
    assert.equal(saved?.recordId, 'rec-shown');
    assert.equal(saved?.request.diagnosisNote, 'Existing diagnosis');
    assert.equal(saved?.request.fee, '125');
  } finally { await s.cleanup(); }
});


test('a firmware fault after start is visible and a new test clears it', async () => {
  const s = await setup(6);
  try {
    await act(async () => s.emit({ type: 'fault', payload: { reason: 'EXTERNAL_ENERGY_DETECTED' } }));
    assert.match(s.container.querySelector('[role="alert"]')?.textContent ?? '', /Harici gerilim/);
    await act(async () => s.emit({ type: 'test_started', payload: { mode: 'iso7638_voltage' } }));
    assert.equal(s.container.querySelector('[role="alert"]'), null);
  } finally { await s.cleanup(); }
});

test('reload recovers the active service record and exposes the approved test-entry button', async () => {
  const s = await setup(2, { getStatus: async () => ({ activeRecordId: 'rec-existing', activeTest: { active: false } }) });
  try {
    const button = s.container.querySelector<HTMLButtonElement>('[data-action="enter-existing-tests"]');
    assert.equal(button?.disabled, false);
    await s.click('[data-action="enter-existing-tests"]');
    assert.ok(s.container.querySelector('[data-screen="05-iso7638-select"]'));
  } finally { await s.cleanup(); }
});

test('activating a lamp and receiving current does not invent a final PASS', async () => {
  const s = await setup(31);
  try {
    await s.click('[data-action="lamp-pin-3"]');
    await act(async () => s.emit({ type: 'load_current_update', payload: { mode: 'lamp_iso12098', current: { valid: true, value: 0.3 }, classificationFinal: false } }));
    assert.match(s.container.querySelector('.p5-lamp-active output')?.textContent ?? '', /300 mA/);
    assert.equal(s.container.querySelector('.p5-lamp-active__ok')?.textContent, 'BEKLİYOR');
  } finally { await s.cleanup(); }
});
