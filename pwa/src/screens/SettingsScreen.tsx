import React, { useState } from 'react';
import LanguageSelector from '../components/LanguageSelector';
import { useI18n } from '../i18n/useI18n';
import './SettingsScreen.css';

type Props = {
  technicianNames?: string[];
  serviceName?: string;
  model?: string;
  firmware?: string;
  hardwareRevision?: string;
  productionDate?: string;
};

export default function SettingsScreen({
  technicianNames = ['Mehmet Kaya', 'Ahmet Demir'],
  serviceName = 'ABC Ağır Vasıta Servisi',
  model = 'Bremsecu G1',
  firmware = 'v1.0.0',
  hardwareRevision = 'G1-V2',
  productionDate = '17.08.2026',
}: Props) {
  const { locale, locales, t } = useI18n();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [keepAwake, setKeepAwake] = useState(true);

  const activeLanguage = locales.find((item) => item.code === locale)?.label ?? locale.toUpperCase();

  return (
    <>
      <main className="settings-screen">
        <section className="settings-card">
          <header className="settings-card__header">
            <h1>{t('settings.title')}</h1>
            <p>{t('settings.subtitle')}</p>
          </header>

          <button type="button" className="settings-row settings-row--button" onClick={() => setLanguageOpen(true)}>
            <span>
              <strong>{t('settings.language')}</strong>
              <small>{t('settings.languageHelp')}</small>
            </span>
            <b>{activeLanguage}</b>
          </button>

          <button type="button" className="settings-row settings-row--button" onClick={() => setKeepAwake((value) => !value)}>
            <span>
              <strong>{t('settings.keepAwake')}</strong>
              <small>{t('settings.keepAwakeHelp')}</small>
            </span>
            <b>{keepAwake ? t('settings.on') : t('settings.off')}</b>
          </button>

          <div className="settings-row">
            <span>
              <strong>{t('settings.technicians')}</strong>
              <small>{technicianNames.join(' • ')}</small>
            </span>
            <button type="button" className="settings-action">{t('settings.edit')}</button>
          </div>

          <div className="settings-row">
            <span>
              <strong>{t('settings.serviceInfo')}</strong>
              <small>{serviceName}</small>
              <small>{t('settings.addressPhoneEmail')}</small>
            </span>
            <button type="button" className="settings-action">{t('settings.edit')}</button>
          </div>

          <div className="settings-row">
            <span>
              <strong>{t('settings.reportLogo')}</strong>
            </span>
            <button type="button" className="settings-action">{t('settings.uploadLogo')}</button>
          </div>

          <h2 className="settings-section-title">{t('settings.deviceInfo')}</h2>

          <dl className="device-info">
            <div><dt>{t('settings.model')}</dt><dd>{model}</dd></div>
            <div><dt>{t('settings.firmware')}</dt><dd>{firmware}</dd></div>
            <div><dt>{t('settings.hardwareRevision')}</dt><dd>{hardwareRevision}</dd></div>
            <div><dt>{t('settings.productionDate')}</dt><dd>{productionDate}</dd></div>
          </dl>

          <button type="button" className="settings-save">{t('settings.save')}</button>
        </section>
      </main>

      <LanguageSelector open={languageOpen} onClose={() => setLanguageOpen(false)} />
    </>
  );
}
