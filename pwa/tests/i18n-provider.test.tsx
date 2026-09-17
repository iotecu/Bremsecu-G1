import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { I18nProvider, useI18n } from '../src/i18n';

function Harness() {
  const { direction, locale, setLocale, t } = useI18n();
  const [operationalState, setOperationalState] = useState(0);

  return (
    <div>
      <output data-testid="locale">{locale}</output>
      <output data-testid="direction">{direction}</output>
      <output data-testid="counter">{t('demo.count', { count: operationalState })}</output>
      <button type="button" onClick={() => setOperationalState((value) => value + 1)}>
        increment
      </button>
      <button type="button" onClick={() => setLocale('ar')}>
        arabic
      </button>
      <button type="button" onClick={() => setLocale('fa')}>
        persian
      </button>
      <button type="button" onClick={() => setLocale('en')}>
        english
      </button>
      <button type="button" onClick={() => setLocale('invalid')}>
        invalid
      </button>
    </div>
  );
}

test('language changes preserve state, persist selection, and update root direction', async () => {
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

  try {
    await act(async () => {
      root.render(
        <I18nProvider initialLocale="tr">
          <Harness />
        </I18nProvider>,
      );
    });

    const buttons = [...container.querySelectorAll('button')];
    const click = async (index: number) => {
      await act(async () => buttons[index]?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
    };

    await click(0);
    await click(0);
    await click(1);

    assert.equal(dom.window.document.documentElement.lang, 'ar');
    assert.equal(dom.window.document.documentElement.dir, 'rtl');
    assert.equal(dom.window.localStorage.getItem('bremsecu.locale'), 'ar');
    assert.equal(container.querySelector('[data-testid="counter"]')?.textContent, 'العداد: 2');

    await click(2);
    assert.equal(dom.window.document.documentElement.lang, 'fa');
    assert.equal(dom.window.document.documentElement.dir, 'rtl');
    assert.equal(container.querySelector('[data-testid="counter"]')?.textContent, 'شمارنده: 2');

    await click(3);
    assert.equal(dom.window.document.documentElement.lang, 'en');
    assert.equal(dom.window.document.documentElement.dir, 'ltr');
    assert.equal(container.querySelector('[data-testid="counter"]')?.textContent, 'Counter: 2');

    await click(4);
    assert.equal(dom.window.document.documentElement.lang, 'tr');
    assert.equal(dom.window.document.documentElement.dir, 'ltr');
    assert.equal(dom.window.localStorage.getItem('bremsecu.locale'), 'tr');
    assert.equal(container.querySelector('[data-testid="counter"]')?.textContent, 'Sayaç: 2');
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
