import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { createRoot } from 'react-dom/client';
import { AppShell } from '../src/components/AppShell';
import { I18nProvider } from '../src/i18n';

function setWidth(dom: JSDOM, width: number) {
  Object.defineProperty(dom.window, 'innerWidth', {
    configurable: true,
    value: width,
  });
}

test('390px reference viewport remains unscaled while narrow phones fit the same approved frame', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });

  const container = dom.window.document.getElementById('root');
  assert.ok(container);
  const root = createRoot(container);

  try {
    setWidth(dom, 390);
    await act(async () => {
      root.render(
        <I18nProvider>
          <AppShell onBack={() => undefined} onHome={() => undefined} onSettings={() => undefined}>
            <div>content</div>
          </AppShell>
        </I18nProvider>,
      );
    });

    const viewport = container.querySelector<HTMLElement>('.app-shell-viewport');
    const shell = container.querySelector<HTMLElement>('.app-shell');
    assert.ok(viewport);
    assert.ok(shell);
    assert.equal(viewport.dataset.referenceWidth, '390');
    assert.equal(viewport.dataset.referenceHeight, '844');
    assert.equal(Number(viewport.dataset.scale), 1);
    assert.equal(shell.style.transform, 'scale(1)');

    setWidth(dom, 360);
    await act(async () => {
      dom.window.dispatchEvent(new dom.window.Event('resize'));
    });
    assert.ok(Math.abs(Number(viewport.dataset.scale) - (360 / 390)) < 0.0001);

    setWidth(dom, 768);
    await act(async () => {
      dom.window.dispatchEvent(new dom.window.Event('resize'));
    });
    assert.equal(Number(viewport.dataset.scale), 1);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    Object.assign(globalThis, { window: previousWindow, document: previousDocument, IS_REACT_ACT_ENVIRONMENT: previousActEnvironment });
  }
});

test('Arabic and Persian keep the approved frame while switching document direction to RTL', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  setWidth(dom, 390);

  const container = dom.window.document.getElementById('root');
  assert.ok(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        <I18nProvider initialLocale="ar">
          <AppShell onBack={() => undefined} onHome={() => undefined} onSettings={() => undefined}>
            <div>content</div>
          </AppShell>
        </I18nProvider>,
      );
    });
    assert.equal(dom.window.document.documentElement.dir, 'rtl');
    assert.equal(dom.window.document.documentElement.lang, 'ar');
    assert.equal(container.querySelector<HTMLElement>('.app-shell-viewport')?.dataset.scale, '1');
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    Object.assign(globalThis, { window: previousWindow, document: previousDocument, IS_REACT_ACT_ENVIRONMENT: previousActEnvironment });
  }
});
