import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { createRoot } from 'react-dom/client';
import App from '../src/App';
import { I18nProvider } from '../src/i18n';

async function setup(url = 'http://localhost/') {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url });
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  const container = dom.window.document.getElementById('root');
  assert.ok(container);
  const root = createRoot(container);
  await act(async () => { root.render(<I18nProvider><App /></I18nProvider>); });
  async function cleanup() {
    await act(async () => root.unmount());
    dom.window.close();
    Object.assign(globalThis, { window: previousWindow, document: previousDocument, IS_REACT_ACT_ENVIRONMENT: previousActEnvironment });
  }
  return { dom, container, cleanup };
}
async function click(dom: JSDOM, container: HTMLElement, selector: string) {
  const element = container.querySelector<HTMLElement>(selector);
  assert.ok(element, 'Missing element: ' + selector);
  await act(async () => { element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
}
async function setInput(dom: JSDOM, container: HTMLElement, selector: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(selector);
  assert.ok(input);
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, value);
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    input.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  });
}
async function enterTests(dom: JSDOM, container: HTMLElement) {
  await click(dom, container, '[data-nav="vehicle"]');
  await click(dom, container, '[data-action="new-vehicle"]');
  await setInput(dom, container, '[data-field="tractor-plate"]', '34 ABC 123');
  await setInput(dom, container, '[data-field="trailer-plate"]', '34 DRS 456');
  const form = container.querySelector<HTMLFormElement>('[data-screen="03-new-vehicle"]');
  assert.ok(form);
  await act(async () => { form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })); });
}
test('lamp toggles keep exactly one output active and axle uses a centered safety popup', async () => {
  const { dom, container, cleanup } = await setup();
  try {
    await enterTests(dom, container);
    await click(dom, container, '[data-action="dashboard-lamp"]');
    assert.ok(container.querySelector('[data-screen="31-lamp-test-measurement"]'));
    assert.equal(container.querySelector('.bottom-navigation'), null);
    assert.equal(container.querySelector('[data-action="save-lamp"]'), null);

    const pin1 = container.querySelector<HTMLButtonElement>('[data-action="toggle-lamp-pin-1"]');
    const pin2 = container.querySelector<HTMLButtonElement>('[data-action="toggle-lamp-pin-2"]');
    assert.ok(pin1);
    assert.ok(pin2);
    assert.equal(pin1.getAttribute('aria-pressed'), 'false');
    assert.equal(pin2.getAttribute('aria-pressed'), 'false');

    await click(dom, container, '[data-action="toggle-lamp-pin-1"]');
    assert.equal(container.querySelector('[data-action="toggle-lamp-pin-1"]')?.getAttribute('aria-pressed'), 'true');

    await click(dom, container, '[data-action="toggle-lamp-pin-2"]');
    assert.equal(container.querySelector('[data-action="toggle-lamp-pin-1"]')?.getAttribute('aria-pressed'), 'false');
    assert.equal(container.querySelector('[data-action="toggle-lamp-pin-2"]')?.getAttribute('aria-pressed'), 'true');

    await click(dom, container, '[data-action="toggle-axle-lift"]');
    const modal = dom.window.document.querySelector('[data-overlay="axle-lift-safety"]');
    assert.ok(modal);
    assert.equal(container.querySelector('[data-overlay="axle-lift-safety"]'), null);
    assert.equal(container.querySelector('[data-action="toggle-lamp-pin-2"]')?.getAttribute('aria-pressed'), 'true');
    assert.equal(container.querySelector('[data-action="toggle-axle-lift"]')?.getAttribute('aria-pressed'), 'false');

    const checkbox = modal.querySelector<HTMLInputElement>('.p5-axle-popup__confirm input');
    assert.ok(checkbox);
    await act(async () => {
      checkbox.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    });
    const confirm = dom.window.document.querySelector<HTMLButtonElement>('[data-action="confirm-axle-safety"]');
    assert.ok(confirm);
    assert.equal(confirm.disabled, false);
    await act(async () => {
      confirm.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    });

    assert.equal(dom.window.document.querySelector('[data-overlay="axle-lift-safety"]'), null);
    assert.equal(container.querySelector('[data-action="toggle-lamp-pin-2"]')?.getAttribute('aria-pressed'), 'false');
    assert.equal(container.querySelector('[data-action="toggle-axle-lift"]')?.getAttribute('aria-pressed'), 'true');

    await click(dom, container, '[data-action="toggle-axle-lift"]');
    assert.equal(container.querySelector('[data-action="toggle-axle-lift"]')?.getAttribute('aria-pressed'), 'false');

    // The safety approval is remembered for this lamp-test session.
    await click(dom, container, '[data-action="toggle-axle-lift"]');
    assert.equal(dom.window.document.querySelector('[data-overlay="axle-lift-safety"]'), null);
    assert.equal(container.querySelector('[data-action="toggle-axle-lift"]')?.getAttribute('aria-pressed'), 'true');

    await click(dom, container, '[data-action="toggle-lamp-pin-1"]');
    assert.equal(container.querySelector('[data-action="toggle-axle-lift"]')?.getAttribute('aria-pressed'), 'false');
    assert.equal(container.querySelector('[data-action="toggle-lamp-pin-1"]')?.getAttribute('aria-pressed'), 'true');

    await click(dom, container, '[data-action="toggle-axle-lift"]');
    assert.equal(dom.window.document.querySelector('[data-overlay="axle-lift-safety"]'), null);
    assert.equal(container.querySelector('[data-action="toggle-lamp-pin-1"]')?.getAttribute('aria-pressed'), 'false');
    assert.equal(container.querySelector('[data-action="toggle-axle-lift"]')?.getAttribute('aria-pressed'), 'true');
  } finally {
    await cleanup();
  }
});

test('reports open empty without a vehicle record and reuse the old-record search modal', async () => {
  const { dom, container, cleanup } = await setup();
  try {
    await click(dom, container, '[data-action="dashboard-reports"]');
    assert.ok(container.querySelector('[data-screen="34-report-result"]'));
    assert.ok(container.querySelector('.p5-report-empty'));
    assert.equal(container.querySelector('[data-action="open-report-save"]'), null);

    await click(dom, container, '[data-action="empty-report-old-record"]');
    assert.ok(container.querySelector('[data-overlay="40-old-record-search-alt"]'));
  } finally {
    await cleanup();
  }
});

test('report save modal contains only diagnosis and fee and stays over the report screen', async () => {
  const { dom, container, cleanup } = await setup('http://localhost/?visual=1&screen=34');
  try {
    assert.ok(container.querySelector('[data-screen="34-report-result"]'));
    assert.ok(container.querySelector('[data-action="open-report-save"]'));

    await click(dom, container, '[data-action="open-report-save"]');
    assert.ok(container.querySelector('[data-screen="34-report-result"]'));
    const modal = dom.window.document.querySelector('[data-overlay="35-report-save-modal"]');
    assert.ok(modal);
    assert.equal(container.querySelector('[data-overlay="35-report-save-modal"]'), null);
    assert.ok(modal.querySelector('[data-field="report-diagnosis"]'));
    assert.ok(modal.querySelector('[data-field="report-fee"]'));
    assert.equal(modal.querySelector('textarea[name="serviceNote"]'), null);

    const diagnosis = modal.querySelector<HTMLTextAreaElement>('[data-field="report-diagnosis"]');
    assert.ok(diagnosis);
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value')?.set;
      setter?.call(diagnosis, 'Kontroller tamamlandı.');
      diagnosis.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      diagnosis.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    });

    const save = dom.window.document.querySelector<HTMLButtonElement>('[data-action="save-report-modal"]');
    assert.ok(save);
    assert.equal(save.disabled, false);
    await act(async () => {
      save.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    });
    assert.equal(dom.window.document.querySelector('[data-overlay="35-report-save-modal"]'), null);
  } finally {
    await cleanup();
  }
});

test('lamp exit is direct without a record and report-aware with an active record', async () => {
  const quick = await setup();
  try {
    await click(quick.dom, quick.container, '[data-action="dashboard-lamp"]');
    await click(quick.dom, quick.container, '[data-action="toggle-lamp-pin-3"]');
    await click(quick.dom, quick.container, '[data-action="exit-lamp-home"]');
    assert.ok(quick.container.querySelector('[data-screen="main-dashboard"]'));
    assert.equal(quick.container.querySelector('[data-overlay="lamp-exit"]'), null);
  } finally {
    await quick.cleanup();
  }

  const recorded = await setup();
  try {
    await enterTests(recorded.dom, recorded.container);
    await click(recorded.dom, recorded.container, '[data-action="dashboard-lamp"]');
    await click(recorded.dom, recorded.container, '[data-action="toggle-lamp-pin-3"]');
    await click(recorded.dom, recorded.container, '[data-action="exit-lamp-back"]');

    assert.ok(recorded.container.querySelector('[data-overlay="lamp-exit"]'));
    await click(recorded.dom, recorded.container, '[data-action="discard-lamp-result"]');
    assert.ok(recorded.container.querySelector('[data-action="confirm-discard-lamp-result"]'));
    await click(recorded.dom, recorded.container, '[data-action="confirm-discard-lamp-result"]');
    assert.ok(recorded.container.querySelector('[data-screen="main-dashboard"]'));
  } finally {
    await recorded.cleanup();
  }
});
