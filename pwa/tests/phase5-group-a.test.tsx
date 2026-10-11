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

test('Phase 5 group A follows entry flow into the first voltage card', async () => {
  const { dom, container, cleanup } = await setup();
  try {
    assert.ok(container.querySelector('[data-screen="01-login"]'));
    await click(dom, container, '[data-action="continue-login"]');
    assert.ok(container.querySelector('[data-screen="02-vehicle-entry"]'));
    await click(dom, container, '[data-action="new-vehicle"]');
    await fillRequiredVehicleIdentifiers(dom, container);
    await submitForm(dom, container);
    assert.ok(container.querySelector('[data-screen="05-iso7638-select"]'));
  } finally {
    await cleanup();
  }
});

test('Phase 5 group A keeps old-record search as an overlay', async () => {
  const { dom, container, cleanup } = await setup();
  try {
    await click(dom, container, '[data-action="continue-login"]');
    await click(dom, container, '[data-action="old-record"]');
    assert.ok(container.querySelector('[data-overlay="old-record-search"]'));
    await click(dom, container, '.p5-modal-close');
    assert.equal(container.querySelector('[data-overlay="old-record-search"]'), null);
    assert.ok(container.querySelector('[data-screen="02-vehicle-entry"]'));
  } finally {
    await cleanup();
  }
});

test('Phase 5 group A opens both approved voltage live screens', async () => {
  const { dom, container, cleanup } = await setup();
  try {
    await click(dom, container, '[data-action="continue-login"]');
    await click(dom, container, '[data-action="new-vehicle"]');
    await fillRequiredVehicleIdentifiers(dom, container);
    await submitForm(dom, container);
    await click(dom, container, '[data-action="start-test"]');
    assert.ok(container.querySelector('[data-screen="06-iso7638-live"]'));
    await click(dom, container, '[data-nav="back"]');
    await click(dom, container, '.p5-carousel__arrow--right');
    assert.ok(container.querySelector('[data-screen="07-iso12098-select"]'));
    await click(dom, container, '[data-action="start-test"]');
    assert.ok(container.querySelector('[data-screen="08-iso12098-live"]'));
  } finally {
    await cleanup();
  }
});

test('PIN10 validation overlays the ISO 12098 live screen', async () => {
  const { dom, container, cleanup } = await setup();
  try {
    await click(dom, container, '[data-action="continue-login"]');
    await click(dom, container, '[data-action="new-vehicle"]');
    await fillRequiredVehicleIdentifiers(dom, container);
    await submitForm(dom, container);
    await click(dom, container, '.p5-carousel__arrow--right');
    await click(dom, container, '[data-action="start-test"]');
    await click(dom, container, '[data-action="validate-pin-10"]');
    assert.ok(container.querySelector('[data-screen="08-iso12098-live"]'));
    assert.ok(container.querySelector('[data-overlay="pin-10-validation"]'));
  } finally {
    await cleanup();
  }
});
