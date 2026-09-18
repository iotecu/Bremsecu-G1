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
  await click(dom, container, '[data-action="continue-login"]');
  await click(dom, container, '[data-action="new-vehicle"]');
  await setInput(dom, container, '[data-field="tractor-plate"]', '34 ABC 123');
  await setInput(dom, container, '[data-field="trailer-plate"]', '34 DRS 456');

  const form = container.querySelector<HTMLFormElement>('[data-screen="03-new-vehicle"]');
  assert.ok(form);
  await act(async () => {
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  });
}

test('Group B opens ISO 7638 cable selection and measurement from the main carousel', async () => {
  const { dom, container, cleanup } = await setup();
  try {
    await enterTests(dom, container);
    await click(dom, container, '.p5-carousel__arrow--right');
    await click(dom, container, '.p5-carousel__arrow--right');
    assert.ok(container.querySelector('[data-screen="12-cable-test-select"]'));

    await click(dom, container, '[data-action="cable-iso7638"]');
    assert.ok(container.querySelector('[data-screen="13-iso7638-cable-select"]'));

    await click(dom, container, '[data-action="start-cable"]');
    assert.ok(container.querySelector('[data-screen="14-iso7638-cable-measurement"]'));
  } finally {
    await cleanup();
  }
});

test('Group B opens ISO 12098 cable selection without creating a Cross Scan route', async () => {
  const { dom, container, cleanup } = await setup();
  try {
    await enterTests(dom, container);
    await click(dom, container, '.p5-carousel__arrow--right');
    await click(dom, container, '.p5-carousel__arrow--right');
    await click(dom, container, '[data-action="cable-iso12098"]');
    assert.ok(container.querySelector('[data-screen="15-iso12098-cable-select"]'));

    await click(dom, container, '[data-action="start-cable"]');
    assert.ok(container.querySelector('[data-screen="16-iso12098-cable-measurement"]'));
    assert.equal(container.querySelector('[data-screen*="cross"]'), null);
  } finally {
    await cleanup();
  }
});

test('nested CAN selector advances independently and opens the matching safety/result flow', async () => {
  const { dom, container, cleanup } = await setup();
  try {
    await enterTests(dom, container);
    await click(dom, container, '.p5-carousel__arrow--right');
    await click(dom, container, '.p5-carousel__arrow--right');
    await click(dom, container, '.p5-carousel__arrow--right');
    assert.ok(container.querySelector('[data-screen="17-can-termination-select"]'));

    const rootBefore = container.querySelector('[data-screen="17-can-termination-select"]');
    await click(dom, container, '.p5-can-subselector > button:last-child');
    assert.ok(rootBefore === container.querySelector('[data-screen="17-can-termination-select"]'));
    assert.equal(container.querySelector('[data-can-subslide="1"]')?.getAttribute('data-can-subslide'), '1');

    await click(dom, container, '[data-action="start-can"]');
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
    await click(dom, container, '.p5-carousel__arrow--right');
    await click(dom, container, '.p5-carousel__arrow--right');
    await click(dom, container, '.p5-carousel__arrow--right');
    await click(dom, container, '[data-action="start-can"]');

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
