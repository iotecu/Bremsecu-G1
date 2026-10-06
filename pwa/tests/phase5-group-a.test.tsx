import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { createRoot } from 'react-dom/client';
import App from '../src/App';
import { I18nProvider } from '../src/i18n';

async function setup() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  });

  const container = dom.window.document.getElementById('root');
  assert.ok(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<I18nProvider><App /></I18nProvider>);
  });

  async function cleanup() {
    await act(async () => root.unmount());
    dom.window.close();
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      IS_REACT_ACT_ENVIRONMENT: previousActEnvironment,
    });
  }

  return { dom, container, cleanup };
}

async function click(dom: JSDOM, container: HTMLElement, selector: string) {
  const element = container.querySelector<HTMLElement>(selector);
  assert.ok(element, 'Missing element: ' + selector);
  await act(async () => {
    element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });
}

async function setInput(dom: JSDOM, container: HTMLElement, selector: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(selector);
  assert.ok(input, 'Missing input: ' + selector);

  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, value);
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    input.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  });
}

async function fillRequiredVehicleIdentifiers(dom: JSDOM, container: HTMLElement) {
  await setInput(dom, container, '[data-field="tractor-plate"]', '34 ABC 123');
  await setInput(dom, container, '[data-field="trailer-plate"]', '34 DRS 456');
}

async function submitForm(dom: JSDOM, container: HTMLElement) {
  const form = container.querySelector<HTMLFormElement>('[data-screen="03-new-vehicle"]');
  assert.ok(form);
  await act(async () => {
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  });
}

test('Phase 5 group A follows entry flow into the responsive main dashboard', async () => {
  const { dom, container, cleanup } = await setup();
  try {
    assert.ok(container.querySelector('[data-screen="main-dashboard"]'));
    await click(dom, container, '[data-nav="vehicle"]');
    assert.ok(container.querySelector('[data-screen="02-vehicle-entry"]'));
    await click(dom, container, '[data-action="new-vehicle"]');
    await fillRequiredVehicleIdentifiers(dom, container);
    await submitForm(dom, container);
    assert.ok(container.querySelector('[data-screen="main-dashboard"]'));
  } finally {
    await cleanup();
  }
});

test('Phase 5 group A keeps old-record search as an overlay', async () => {
  const { dom, container, cleanup } = await setup();
  try {
    await click(dom, container, '[data-nav="vehicle"]');
    await click(dom, container, '[data-action="old-record"]');
    assert.ok(container.querySelector('[data-overlay="old-record-search"]'));
    await click(dom, container, '.p5-modal-close');
    assert.equal(container.querySelector('[data-overlay="old-record-search"]'), null);
    assert.ok(container.querySelector('[data-screen="02-vehicle-entry"]'));
  } finally {
    await cleanup();
  }
});

test('ISO 7638 uses a preflight modal, hides bottom navigation and exits directly without a vehicle record', async () => {
  const { dom, container, cleanup } = await setup();
  try {
    await click(dom, container, '[data-action="dashboard-iso7638"]');
    assert.ok(container.querySelector('[data-overlay="iso7638-voltage-preflight"]'));
    assert.equal(container.querySelector('[data-screen="06-iso7638-live"]'), null);

    await click(dom, container, '[data-action="confirm-iso7638-preflight"]');
    assert.ok(container.querySelector('[data-screen="06-iso7638-live"]'));
    assert.equal(container.querySelector('.bottom-navigation'), null);
    assert.equal(container.querySelector('[data-action="save-result"]'), null);

    await click(dom, container, '[data-action="exit-voltage-back"]');
    assert.ok(container.querySelector('[data-screen="main-dashboard"]'));
    assert.equal(container.querySelector('[data-overlay="iso7638-voltage-exit"]'), null);

    await click(dom, container, '[data-action="dashboard-iso12098"]');
    assert.ok(container.querySelector('[data-overlay="iso12098-voltage-preflight"]'));
    await click(dom, container, '[data-action="confirm-iso12098-preflight"]');
    assert.ok(container.querySelector('[data-screen="08-iso12098-live"]'));
    assert.equal(container.querySelector('.bottom-navigation'), null);
    assert.equal(container.querySelector('[data-action="save-result"]'), null);
  } finally {
    await cleanup();
  }
});

test('ISO 7638 asks to save on exit when a vehicle record is active and requires a second discard confirmation', async () => {
  const { dom, container, cleanup } = await setup();
  try {
    await click(dom, container, '[data-nav="vehicle"]');
    await click(dom, container, '[data-action="new-vehicle"]');
    await fillRequiredVehicleIdentifiers(dom, container);
    await submitForm(dom, container);

    await click(dom, container, '[data-action="dashboard-iso7638"]');
    await click(dom, container, '[data-action="confirm-iso7638-preflight"]');
    assert.ok(container.querySelector('[data-screen="06-iso7638-live"]'));

    await click(dom, container, '[data-action="exit-voltage-home"]');
    assert.ok(container.querySelector('[data-overlay="iso7638-voltage-exit"]'));

    await click(dom, container, '[data-action="discard-voltage-result"]');
    assert.ok(container.querySelector('[data-action="confirm-discard-voltage-result"]'));
    assert.ok(container.querySelector('[data-screen="06-iso7638-live"]'));

    await click(dom, container, '[data-action="confirm-discard-voltage-result"]');
    assert.ok(container.querySelector('[data-screen="main-dashboard"]'));
  } finally {
    await cleanup();
  }
});

test('ISO 7638 can save the current result and exit when a vehicle record is active', async () => {
  const { dom, container, cleanup } = await setup();
  try {
    await click(dom, container, '[data-nav="vehicle"]');
    await click(dom, container, '[data-action="new-vehicle"]');
    await fillRequiredVehicleIdentifiers(dom, container);
    await submitForm(dom, container);

    await click(dom, container, '[data-action="dashboard-iso7638"]');
    await click(dom, container, '[data-action="confirm-iso7638-preflight"]');
    await click(dom, container, '[data-action="exit-voltage-back"]');
    assert.ok(container.querySelector('[data-overlay="iso7638-voltage-exit"]'));

    await click(dom, container, '[data-action="save-voltage-result"]');
    assert.ok(container.querySelector('[data-screen="main-dashboard"]'));
  } finally {
    await cleanup();
  }
});

test('ISO 12098 voltage rows use single-focus on/off toggles', async () => {
  const { dom, container, cleanup } = await setup();
  try {
    await click(dom, container, '[data-action="dashboard-iso12098"]');
    await click(dom, container, '[data-action="confirm-iso12098-preflight"]');

    const pin1 = container.querySelector<HTMLButtonElement>('[data-action="toggle-voltage-pin-1"]');
    const pin2 = container.querySelector<HTMLButtonElement>('[data-action="toggle-voltage-pin-2"]');
    assert.ok(pin1);
    assert.ok(pin2);
    assert.equal(pin1.getAttribute('aria-pressed'), 'false');
    assert.equal(pin2.getAttribute('aria-pressed'), 'false');

    await click(dom, container, '[data-action="toggle-voltage-pin-1"]');
    assert.equal(container.querySelector('[data-action="toggle-voltage-pin-1"]')?.getAttribute('aria-pressed'), 'true');

    const ok1 = container.querySelector<HTMLButtonElement>('[data-action="mark-voltage-pin-1"]');
    assert.ok(ok1);
    assert.equal(ok1.getAttribute('aria-pressed'), 'false');
    await click(dom, container, '[data-action="mark-voltage-pin-1"]');
    assert.equal(container.querySelector('[data-action="mark-voltage-pin-1"]')?.getAttribute('aria-pressed'), 'true');

    await click(dom, container, '[data-action="toggle-voltage-pin-2"]');
    assert.equal(container.querySelector('[data-action="toggle-voltage-pin-1"]')?.getAttribute('aria-pressed'), 'false');
    assert.equal(container.querySelector('[data-action="toggle-voltage-pin-2"]')?.getAttribute('aria-pressed'), 'true');
    assert.equal(container.querySelector('[data-action="mark-voltage-pin-1"]')?.getAttribute('aria-pressed'), 'true');

    await click(dom, container, '[data-action="toggle-voltage-pin-2"]');
    assert.equal(container.querySelector('[data-action="toggle-voltage-pin-2"]')?.getAttribute('aria-pressed'), 'false');

    await click(dom, container, '[data-action="mark-voltage-pin-1"]');
    assert.equal(container.querySelector('[data-action="mark-voltage-pin-1"]')?.getAttribute('aria-pressed'), 'false');
  } finally {
    await cleanup();
  }
});

test('ISO 12098 exits directly without a vehicle record and asks to save when a record is active', async () => {
  const first = await setup();
  try {
    await click(first.dom, first.container, '[data-action="dashboard-iso12098"]');
    await click(first.dom, first.container, '[data-action="confirm-iso12098-preflight"]');
    assert.ok(first.container.querySelector('[data-screen="08-iso12098-live"]'));

    await click(first.dom, first.container, '[data-action="exit-voltage-home"]');
    assert.ok(first.container.querySelector('[data-screen="main-dashboard"]'));
    assert.equal(first.container.querySelector('[data-overlay="iso12098-voltage-exit"]'), null);
  } finally {
    await first.cleanup();
  }

  const recorded = await setup();
  try {
    await click(recorded.dom, recorded.container, '[data-nav="vehicle"]');
    await click(recorded.dom, recorded.container, '[data-action="new-vehicle"]');
    await fillRequiredVehicleIdentifiers(recorded.dom, recorded.container);
    await submitForm(recorded.dom, recorded.container);

    await click(recorded.dom, recorded.container, '[data-action="dashboard-iso12098"]');
    await click(recorded.dom, recorded.container, '[data-action="confirm-iso12098-preflight"]');
    await click(recorded.dom, recorded.container, '[data-action="exit-voltage-back"]');
    assert.ok(recorded.container.querySelector('[data-overlay="iso12098-voltage-exit"]'));

    await click(recorded.dom, recorded.container, '[data-action="discard-voltage-result"]');
    assert.ok(recorded.container.querySelector('[data-action="confirm-discard-voltage-result"]'));
    await click(recorded.dom, recorded.container, '[data-action="confirm-discard-voltage-result"]');
    assert.ok(recorded.container.querySelector('[data-screen="main-dashboard"]'));
  } finally {
    await recorded.cleanup();
  }
});

test('PIN10 validation overlays the ISO 12098 live screen', async () => {
  const { dom, container, cleanup } = await setup();
  try {
    await click(dom, container, '[data-action="dashboard-iso12098"]');
    await click(dom, container, '[data-action="confirm-iso12098-preflight"]');
    await click(dom, container, '[data-action="toggle-voltage-pin-10"]');
    assert.ok(container.querySelector('[data-screen="08-iso12098-live"]'));
    assert.ok(container.querySelector('[data-overlay="pin-10-validation"]'));
  } finally {
    await cleanup();
  }
});
