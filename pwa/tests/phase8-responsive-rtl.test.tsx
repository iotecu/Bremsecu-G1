import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { createRoot } from 'react-dom/client';
import { AppShell } from '../src/components/AppShell';
import { I18nProvider } from '../src/i18n';

test('application shell uses the real viewport without a virtual 390x844 scale canvas', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });

  const container = dom.window.document.getElementById('root');
  assert.ok(container);
  const root = createRoot(container);

  try {
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
    assert.equal(viewport.dataset.scale, undefined);
    assert.equal(viewport.dataset.referenceWidth, undefined);
    assert.equal(shell.style.transform, '');
    assert.ok(container.querySelector('.app-shell__content'));
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    Object.assign(globalThis, { window: previousWindow, document: previousDocument, IS_REACT_ACT_ENVIRONMENT: previousActEnvironment });
  }
});

test('Arabic and Persian switch document direction to RTL without changing shell geometry', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });

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
    assert.equal(container.querySelector<HTMLElement>('.app-shell')?.style.transform, '');
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    Object.assign(globalThis, { window: previousWindow, document: previousDocument, IS_REACT_ACT_ENVIRONMENT: previousActEnvironment });
  }
});
