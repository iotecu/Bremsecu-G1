import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { AppShell } from '../src/components/AppShell';
import { I18nProvider } from '../src/i18n';

test('application shell uses local assets and exposes approved bottom navigation actions', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'https://bremsecu.test/',
  });
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
  const calls: string[] = [];

  try {
    await act(async () => {
      root.render(
        <I18nProvider initialLocale="tr">
          <AppShell
            onBack={() => calls.push('back')}
            onHome={() => calls.push('home')}
            onSettings={() => calls.push('settings')}
          >
            <div>content</div>
          </AppShell>
        </I18nProvider>,
      );
    });

    const logo = container.querySelector<HTMLImageElement>('.top-brand-bar__logo');
    assert.ok(logo);
    assert.match(logo.src, /\/assets\/bremsecu-logo\.png$/);

    for (const name of ['back', 'home', 'settings']) {
      const button = container.querySelector<HTMLButtonElement>(`[data-nav="${name}"]`);
      assert.ok(button);
      await act(async () => {
        button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
      });
    }

    assert.deepEqual(calls, ['back', 'home', 'settings']);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      IS_REACT_ACT_ENVIRONMENT: previousActEnvironment,
    });
  }
});
