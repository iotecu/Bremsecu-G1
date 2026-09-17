import { useState } from 'react';
import { useI18n } from './i18n';
import './styles.css';

const sampleDate = new Date(Date.UTC(2026, 8, 17, 12));

export default function App() {
  const {
    availableLocales,
    direction,
    formatDate,
    formatNumber,
    locale,
    setLocale,
    t,
  } = useI18n();
  const [preservedCount, setPreservedCount] = useState(0);
  const selectedLocale = availableLocales.find((item) => item.code === locale);

  return (
    <main className="foundation-check" data-product="BREMSECU G1">
      <h1>{t('app.title')}</h1>
      <p>{t('app.foundationReady')}</p>

      <label htmlFor="locale-selector">{t('language.selectorLabel')}</label>
      <select
        aria-label={t('accessibility.languageSelector')}
        id="locale-selector"
        onChange={(event) => setLocale(event.target.value)}
        value={locale}
      >
        {availableLocales.map((item) => (
          <option key={item.code} value={item.code}>
            {item.nativeLabel}
          </option>
        ))}
      </select>

      <dl>
        <div>
          <dt>{t('language.currentLabel')}</dt>
          <dd>{selectedLocale?.nativeLabel}</dd>
        </div>
        <div>
          <dt>{t('language.directionLabel')}</dt>
          <dd>{t(direction === 'rtl' ? 'language.rtl' : 'language.ltr')}</dd>
        </div>
      </dl>

      <section aria-labelledby="state-check-title">
        <h2 id="state-check-title">{t('demo.stateTitle')}</h2>
        <p>{t('demo.stateDescription')}</p>
        <p>{t('demo.count', { count: preservedCount })}</p>
        <button type="button" onClick={() => setPreservedCount((count) => count + 1)}>
          {t('demo.increment')}
        </button>
      </section>

      <p>{t('demo.number', { value: formatNumber(1234567.89) })}</p>
      <p>
        {t('demo.date', {
          value: formatDate(sampleDate, {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }),
        })}
      </p>
    </main>
  );
}
