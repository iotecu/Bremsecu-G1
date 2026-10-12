import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatLocalizedDate,
  formatLocalizedNumber,
  isLocaleCode,
  localeRegistry,
  readStoredLocale,
  resolveTranslation,
  translate,
} from '../src/i18n';
import en from '../src/i18n/locales/en.json';
import tr from '../src/i18n/locales/tr.json';

test('the runtime exposes exactly the approved locale order', () => {
  assert.deepEqual(
    localeRegistry.map(({ code }) => code),
    ['tr', 'en', 'de', 'fr', 'it', 'el', 'ru', 'ar', 'fa', 'bg', 'pl', 'sr', 'ro', 'es'],
  );
});

test('stored locale validation falls back to Turkish', () => {
  assert.equal(readStoredLocale({ getItem: () => 'de' }), 'de');
  assert.equal(readStoredLocale({ getItem: () => 'not-approved' }), 'tr');
  assert.equal(readStoredLocale({ getItem: () => null }), 'tr');
  assert.equal(readStoredLocale({ getItem: () => { throw new Error('blocked'); } }), 'tr');
});

test('locale guards reject values outside the authority', () => {
  assert.equal(isLocaleCode('fa'), true);
  assert.equal(isLocaleCode('en-US'), false);
  assert.equal(isLocaleCode(undefined), false);
});

test('translations resolve locally and interpolate variables', () => {
  assert.equal(translate('tr', 'demo.count', { count: 4 }), 'Sayaç: 4');
  assert.equal(translate('ar', 'demo.count', { count: 4 }), 'العداد: 4');
});

test('a missing target value falls back to the Turkish source value', () => {
  const incompleteTarget = structuredClone(en);
  delete (incompleteTarget.demo as { date?: string }).date;

  assert.equal(
    resolveTranslation(incompleteTarget as typeof tr, tr, 'demo.date', { value: '17.09.2026' }),
    'Örnek tarih: 17.09.2026',
  );
});

test('number and date formatting follow the selected locale', () => {
  assert.equal(formatLocalizedNumber('tr', 1234567.89), '1.234.567,89');
  assert.equal(formatLocalizedNumber('en', 1234567.89), '1,234,567.89');
  assert.match(
    formatLocalizedDate('de', new Date(Date.UTC(2026, 8, 17)), {
      timeZone: 'UTC',
      year: 'numeric',
    }),
    /2026/,
  );
});
