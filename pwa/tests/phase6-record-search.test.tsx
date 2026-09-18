import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from '../src/i18n';
import { RecordSearchModal } from '../src/screens/phase5/group-a';

test('record search renders authoritative firmware records and passes selected id to report inspection', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });

  const container = dom.window.document.getElementById('root');
  assert.ok(container);
  const root = createRoot(container);
  let inspected = '';

  try {
    await act(async () => {
      root.render(
        <I18nProvider>
          <RecordSearchModal
            context="reports"
            onClose={() => undefined}
            onInspect={(recordId) => { inspected = recordId; }}
            searchRecords={async () => ({
              records: [{
                id: 'rec-42',
                companyName: 'CANLI FİLO',
                tractorPlate: '34 LIVE 42',
                trailerPlate: '16 TR 42',
                trailerConnectionType: 'iso12098',
                updatedAt: '2026-09-18T10:00:00Z',
                status: 'open',
              }],
            })}
          />
        </I18nProvider>,
      );
      await new Promise((resolve) => setTimeout(resolve, 220));
    });

    assert.match(container.textContent ?? '', /CANLI FİLO/);
    const inspect = container.querySelector<HTMLElement>('[data-action="inspect-report-record"]');
    assert.ok(inspect);
    await act(async () => {
      inspect.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    });
    assert.equal(inspected, 'rec-42');

    const retest = container.querySelector<HTMLButtonElement>('[data-action="retest-record"]');
    assert.ok(retest?.disabled);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    Object.assign(globalThis, { window: previousWindow, document: previousDocument, IS_REACT_ACT_ENVIRONMENT: previousActEnvironment });
  }
});
