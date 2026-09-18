import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { JSDOM } from 'jsdom';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import App from '../src/App';
import { I18nProvider } from '../src/i18n';

function setup() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
  Object.assign(globalThis, {
    window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, Event: dom.window.Event, MouseEvent: dom.window.MouseEvent,
  });
  const container = dom.window.document.getElementById('root')!;
  const root = createRoot(container);
  act(() => { root.render(<I18nProvider><App /></I18nProvider>); });
  return { container, root };
}

function click(container: HTMLElement, selector: string) {
  const element = container.querySelector<HTMLElement>(selector);
  assert.ok(element, 'Missing element: ' + selector);
  act(() => element.click());
}

function setInput(container: HTMLElement, selector: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(selector);
  assert.ok(input, 'Missing input: ' + selector);
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}

function fillRequiredVehicleIdentifiers(container: HTMLElement) {
  setInput(container, '[data-field="tractor-plate"]', '34 ABC 123');
  setInput(container, '[data-field="trailer-plate"]', '34 DRS 456');
}

function submitForm(container: HTMLElement) {
  const form = container.querySelector<HTMLFormElement>('[data-screen="03-new-vehicle"]')!;
  act(() => form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
}

test('Phase 5 group A follows entry flow into the first voltage card', () => {
  const { container, root } = setup();
  assert.ok(container.querySelector('[data-screen="01-login"]'));
  click(container, '[data-action="continue-login"]');
  assert.ok(container.querySelector('[data-screen="02-vehicle-entry"]'));
  click(container, '[data-action="new-vehicle"]');
  fillRequiredVehicleIdentifiers(container);
  submitForm(container);
  assert.ok(container.querySelector('[data-screen="05-iso7638-select"]'));
  act(() => root.unmount());
});

test('Phase 5 group A keeps old-record search as an overlay', () => {
  const { container, root } = setup();
  click(container, '[data-action="continue-login"]');
  click(container, '[data-action="old-record"]');
  assert.ok(container.querySelector('[data-overlay="old-record-search"]'));
  click(container, '.p5-modal-close');
  assert.equal(container.querySelector('[data-overlay="old-record-search"]'), null);
  assert.ok(container.querySelector('[data-screen="02-vehicle-entry"]'));
  act(() => root.unmount());
});

test('Phase 5 group A opens both approved voltage live screens', () => {
  const { container, root } = setup();
  click(container, '[data-action="continue-login"]');
  click(container, '[data-action="new-vehicle"]');
  fillRequiredVehicleIdentifiers(container);
  submitForm(container);
  click(container, '[data-action="start-test"]');
  assert.ok(container.querySelector('[data-screen="06-iso7638-live"]'));
  click(container, '[data-nav="back"]');
  click(container, '.p5-carousel__arrow--right');
  assert.ok(container.querySelector('[data-screen="07-iso12098-select"]'));
  click(container, '[data-action="start-test"]');
  assert.ok(container.querySelector('[data-screen="08-iso12098-live"]'));
  act(() => root.unmount());
});

test('PIN10 validation overlays the ISO 12098 live screen', () => {
  const { container, root } = setup();
  click(container, '[data-action="continue-login"]');
  click(container, '[data-action="new-vehicle"]');
  fillRequiredVehicleIdentifiers(container);
  submitForm(container);
  click(container, '.p5-carousel__arrow--right');
  click(container, '[data-action="start-test"]');
  click(container, '[data-action="validate-pin-10"]');
  assert.ok(container.querySelector('[data-screen="08-iso12098-live"]'));
  assert.ok(container.querySelector('[data-overlay="pin-10-validation"]'));
  act(() => root.unmount());
});
