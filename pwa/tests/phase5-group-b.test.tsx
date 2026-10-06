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

async function enterTests(dom: JSDOM, container: HTMLElement) {
  await click(dom, container, '[data-nav="vehicle"]');
  await click(dom, container, '[data-action="new-vehicle"]');
  await setInput(dom, container, '[data-field="tractor-plate"]', '34 ABC 123');
  await setInput(dom, container, '[data-field="trailer-plate"]', '34 DRS 456');

  const form = container.querySelector<HTMLFormElement>('[data-screen="03-new-vehicle"]');
  assert.ok(form);
  await act(async () => {
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  });
}

test('Group B opens ISO 7638 cable selection and measurement from the dashboard grid', async () => {
  const { dom, container, cleanup } = await setup();
  try {
    await enterTests(dom, container);
    await click(dom, container, '[data-action="dashboard-cable"]');
    assert.ok(container.querySelector('[data-screen="cable-menu"]'));

    await click(dom, container, '[data-action="cable-iso7638"]');
    assert.ok(container.querySelector('[data-screen="13-iso7638-cable-select"]'));
    assert.ok(container.querySelector('[data-cable-sockets="1-3"]'));

    await click(dom, container, '[data-action="start-cable"]');
    const iso7638Screen = container.querySelector('[data-screen="14-iso7638-cable-measurement"]');
    assert.ok(iso7638Screen);
    assert.equal(iso7638Screen.getAttribute('data-pin-count'), '7');
    assert.equal(container.querySelectorAll('[data-action^="toggle-cable-pin-"]').length, 7);
    assert.ok(container.querySelector('[data-action="toggle-cable-pin-7"]'));
    assert.equal(container.querySelector('[data-action="toggle-cable-pin-8"]'), null);
    assert.equal(container.querySelector('[data-action="toggle-cable-pin-15"]'), null);
    assert.equal(container.querySelector('.bottom-navigation'), null);
    assert.equal(container.querySelector('[data-action="save-cable"]'), null);

    const pin1 = container.querySelector('[data-action="toggle-cable-pin-1"]');
    const pin2 = container.querySelector('[data-action="toggle-cable-pin-2"]');
    assert.ok(pin1);
    assert.ok(pin2);
    assert.equal(pin1.getAttribute('aria-pressed'), 'false');
    assert.equal(pin2.getAttribute('aria-pressed'), 'false');

    await click(dom, container, '[data-action="toggle-cable-pin-1"]');
    assert.equal(container.querySelector('[data-action="toggle-cable-pin-1"]')?.getAttribute('aria-pressed'), 'true');

    await click(dom, container, '[data-action="toggle-cable-pin-2"]');
    assert.equal(container.querySelector('[data-action="toggle-cable-pin-1"]')?.getAttribute('aria-pressed'), 'true');
    assert.equal(container.querySelector('[data-action="toggle-cable-pin-2"]')?.getAttribute('aria-pressed'), 'true');

    await click(dom, container, '[data-action="toggle-cable-pin-1"]');
    assert.equal(container.querySelector('[data-action="toggle-cable-pin-1"]')?.getAttribute('aria-pressed'), 'false');
    assert.equal(container.querySelector('[data-action="toggle-cable-pin-2"]')?.getAttribute('aria-pressed'), 'true');
  } finally {
    await cleanup();
  }
});

test('Group B opens ISO 12098 cable selection without creating a Cross Scan route', async () => {
  const { dom, container, cleanup } = await setup();
  try {
    await enterTests(dom, container);
    await click(dom, container, '[data-action="dashboard-cable"]');
    await click(dom, container, '[data-action="cable-iso12098"]');
    assert.ok(container.querySelector('[data-screen="15-iso12098-cable-select"]'));
    assert.ok(container.querySelector('[data-cable-sockets="2-4"]'));

    await click(dom, container, '[data-action="start-cable"]');
    const iso12098Screen = container.querySelector('[data-screen="16-iso12098-cable-measurement"]');
    assert.ok(iso12098Screen);
    assert.equal(iso12098Screen.getAttribute('data-pin-count'), '15');
    assert.equal(container.querySelectorAll('[data-action^="toggle-cable-pin-"]').length, 15);
    assert.equal(container.querySelector('[data-screen*="cross"]'), null);
    assert.equal(container.querySelector('[data-action="save-cable"]'), null);
    assert.ok(container.querySelector('[data-action="toggle-cable-pin-1"]'));
    assert.ok(container.querySelector('[data-action="toggle-cable-pin-15"]'));

    await click(dom, container, '[data-action="toggle-cable-pin-15"]');
    assert.equal(container.querySelector('[data-action="toggle-cable-pin-15"]')?.getAttribute('aria-pressed'), 'true');
  } finally {
    await cleanup();
  }
});

test('cable measurement exits directly without a record and uses guarded save exit with a record', async () => {
  const quick = await setup();
  try {
    await click(quick.dom, quick.container, '[data-action="dashboard-cable"]');
    await click(quick.dom, quick.container, '[data-action="cable-iso7638"]');
    await click(quick.dom, quick.container, '[data-action="start-cable"]');
    await click(quick.dom, quick.container, '[data-action="exit-cable-home"]');
    assert.ok(quick.container.querySelector('[data-screen="main-dashboard"]'));
    assert.equal(quick.container.querySelector('[data-overlay="iso7638-cable-exit"]'), null);
  } finally {
    await quick.cleanup();
  }

  const recorded = await setup();
  try {
    await enterTests(recorded.dom, recorded.container);
    await click(recorded.dom, recorded.container, '[data-action="dashboard-cable"]');
    await click(recorded.dom, recorded.container, '[data-action="cable-iso12098"]');
    await click(recorded.dom, recorded.container, '[data-action="start-cable"]');
    await click(recorded.dom, recorded.container, '[data-action="toggle-cable-pin-1"]');
    await click(recorded.dom, recorded.container, '[data-action="exit-cable-back"]');

    assert.ok(recorded.container.querySelector('[data-overlay="iso12098-cable-exit"]'));
    await click(recorded.dom, recorded.container, '[data-action="discard-cable-result"]');
    assert.ok(recorded.container.querySelector('[data-action="confirm-discard-cable-result"]'));
    await click(recorded.dom, recorded.container, '[data-action="confirm-discard-cable-result"]');
    assert.ok(recorded.container.querySelector('[data-screen="main-dashboard"]'));
  } finally {
    await recorded.cleanup();
  }
});

test('nested CAN selector advances independently and opens the matching safety/result flow', async () => {
  const { dom, container, cleanup } = await setup();
  try {
    await enterTests(dom, container);
    await click(dom, container, '[data-action="dashboard-can"]');
    assert.ok(container.querySelector('[data-screen="can-menu"]'));
    await click(dom, container, '[data-action="can-12098-tractor"]');
    assert.ok(container.querySelector('[data-screen="can-12098-tractor-safety"]'));

    const checkbox = container.querySelector<HTMLInputElement>('.p5-termination-confirm input');
    assert.ok(checkbox);
    await act(async () => {
      checkbox.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    });

    await click(dom, container, '[data-action="confirm-can-safety"]');
    assert.ok(container.querySelector('[data-screen="can-12098-tractor-resistance"]'));
  } finally {
    await cleanup();
  }
});

test('termination result avoids browser-owned PASS/FAIL threshold classification', async () => {
  const { dom, container, cleanup } = await setup();
  try {
    await enterTests(dom, container);
    await click(dom, container, '[data-action="dashboard-can"]');
    await click(dom, container, '[data-action="can-7638-tractor"]');

    const checkbox = container.querySelector<HTMLInputElement>('.p5-termination-confirm input');
    assert.ok(checkbox);
    await act(async () => {
      checkbox.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    });
    await click(dom, container, '[data-action="confirm-can-safety"]');

    const text = container.querySelector('[data-screen="can-7638-tractor-resistance"]')?.textContent ?? '';
    assert.equal(/\bPASS\b|\bFAIL\b/.test(text), false);
  } finally {
    await cleanup();
  }
});
