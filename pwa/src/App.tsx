import React from 'react';
import { useI18n } from './i18n/useI18n';

export type ScreenId =
  | 'first-contact'
  | 'test-entry'
  | 'new-vehicle-record'
  | 'voltage'
  | 'cable'
  | 'lamp'
  | 'termination'
  | 'report'
  | 'settings';

export default function App() {
  const { t } = useI18n();

  return (
    <main data-product="BREMSECU G1 REV-2">
      <h1>{t('app.title')}</h1>
      <p>{t('app.scaffold')}</p>
      <p>{t('app.visualAuthority')}</p>
      <p>{t('app.engineeringAuthority')}</p>
    </main>
  );
}
