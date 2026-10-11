import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from '../src/i18n';
import { VoltageMeasurementScreen } from '../src/screens/phase5/group-a';
import { FirmwareRuntime, EMPTY_FIRMWARE_RUNTIME_STATE } from '../src/services/runtime';
import { FirmwareRuntimeProvider } from '../src/services/runtime-react';
import { voltageClassificationForPin } from '../src/services/view';
import type { FirmwareConnectionListener, FirmwareHttpService, TelemetryListener } from '../src/services/ports';
import type { JsonObject, TelemetryEvent } from '../src/services/contracts';

test('valid voltage is not PASS; provisional, invalid and mismatched diagnoses are not final failures', () => {
  for (const payload of [
    { valid: true }, { valid: true, status: 'FAIL', classificationFinal: false },
    { valid: false, status: 'FAIL', classificationFinal: true },
    { valid: true, status: 'FAIL' },
    { mode: 'iso12098_voltage', pin: 1, status: 'FAIL', classificationFinal: true },
  ]) {
    const state = { ...EMPTY_FIRMWARE_RUNTIME_STATE, channelUpdates: { 'iso7638_voltage:1': { mode: 'iso7638_voltage', pin: 1, ...payload } } };
    assert.equal(voltageClassificationForPin(state, 'iso7638_voltage', 1), null);
  }
});

for (const iso of ['7638', '12098'] as const) {
  test(`ISO ${iso}: background FAIL modal, inspection, acknowledgement, recovery, restart and connection lifecycle`, async () => {
    const dom = new JSDOM('<html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
    const previous = { window: globalThis.window, document: globalThis.document, IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT };
    Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
    let emit: TelemetryListener = () => undefined;
    let connection: FirmwareConnectionListener = () => undefined;
    const http: FirmwareHttpService = {
      getDevice: async () => ({}), getStatus: async () => ({}), getSettings: async () => ({}),
      getReport: async () => ({}), getRecords: async () => ({}),
      startTest: async () => ({}), stopTest: async () => ({}), confirmTest: async () => ({}),
      createRecord: async () => ({}), saveCurrentResult: async () => ({}),
      updateReport: async () => ({}), updateSettings: async () => ({}),
    };
    const runtime = new FirmwareRuntime({ http, telemetry: {
      subscribe: (listener) => { emit = listener; return () => undefined; },
      subscribeConnection: (listener) => { connection = listener; return () => undefined; },
      connect: () => undefined, disconnect: () => undefined,
    } });
    const container = dom.window.document.getElementById('root')!;
    const root = createRoot(container);
    const mode = iso === '7638' ? 'iso7638_voltage' : 'iso12098_voltage';
    const event = async (type: TelemetryEvent['type'], payload: JsonObject) => {
      await act(async () => { emit({ type, payload }); });
    };
    const channel = async (pin: number, status: string, final = true) => event('channel_update', {
      mode, pin, engineeringValue: pin === 1 ? 24 : 0.8, unit: 'V', valid: true, status, classificationFinal: final,
    });
    const modal = () => container.querySelector('[role="alertdialog"]');
    const click = async (action: string) => {
      const button = container.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;
      assert.ok(button);
      await act(async () => { button.click(); });
    };
    try {
      await act(async () => root.render(<I18nProvider><FirmwareRuntimeProvider runtime={runtime}><VoltageMeasurementScreen iso={iso} onSave={() => undefined} /></FirmwareRuntimeProvider></I18nProvider>));
      await act(async () => { connection('open'); });
      await event('test_started', { mode });
      await event('active_measurement', { mode, pin: 1 });
      await channel(1, 'PASS', false);
      assert.equal(container.querySelector('.p5-channel-row.is-passed'), null);
      assert.match(container.querySelector('.p5-ok')?.textContent ?? '', /BEKLİYOR/);
      await channel(2, 'FAIL', false);
      assert.equal(modal(), null);
      await channel(1, 'FAIL');
      assert.equal(modal(), null);
      await channel(2, 'FAIL');
      assert.ok(modal());
      assert.equal(modal()?.querySelectorAll('li').length, 2);
      assert.match(modal()?.textContent ?? '', /PİN 1/);
      assert.match(modal()?.textContent ?? '', /PİN 2/);
      assert.match(modal()?.textContent ?? '', /24,00 V/);
      assert.equal(document.activeElement?.getAttribute('data-action'), 'continue-pin-check');
      const first = container.querySelector('[data-action="continue-pin-check"]')!;
      await act(async () => first.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
      assert.equal(document.activeElement?.getAttribute('data-action'), 'inspect-pin-failures');
      await click('inspect-pin-failures');
      assert.equal(modal(), null);
      assert.ok(container.querySelector('.is-inspecting-failures'));
      assert.ok(document.activeElement?.classList.contains('p5-channel-table'));
      await channel(2, 'FAIL');
      await event('active_measurement', { mode, pin: 3 });
      assert.equal(modal(), null, 'repeated telemetry and active pin movement do not alert again');
      await channel(4, 'FAIL');
      assert.ok(modal(), 'a newly failed pin opens the modal');
      await click('continue-pin-check');
      await channel(2, 'PASS');
      await channel(2, 'FAIL');
      assert.ok(modal(), 'a recovered pin can fail again');
      await click('continue-pin-check');
      await event('test_stopped', { mode });
      assert.equal(runtime.getSnapshot().activeMeasurement, null);
      await event('test_started', { mode });
      assert.equal(modal(), null);
      assert.equal(Object.keys(runtime.getSnapshot().channelUpdates).length, 0);
      await event('active_measurement', { mode, pin: 1 });
      await channel(2, 'FAIL');
      assert.ok(modal(), 'a new test resets acknowledgements');
      await act(async () => { connection('closed'); });
      assert.equal(modal(), null);
      await act(async () => { connection('open'); });
      assert.equal(modal(), null, 'reconnection cannot reuse stale faults');
      await event('active_measurement', { mode, pin: 1 });
      await channel(2, 'FAIL');
      assert.ok(modal());
      await act(async () => modal()!.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
      assert.equal(modal(), null);
    } finally {
      await act(async () => root.unmount());
      dom.window.close(); Object.assign(globalThis, previous);
    }
  });
}
