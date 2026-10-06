import React, { useEffect, useState } from 'react';
import { assetUrl } from '../../assets';
import { useI18n } from '../../i18n';
import type { JsonObject } from '../../services/contracts';
import { useFirmwareSnapshot } from '../../services/runtime-react';
import { booleanField, objectField, stringField } from '../../services/view';

function isVisualDevelopment(): boolean {
  const meta = import.meta as ImportMeta & { readonly env?: { readonly DEV?: boolean } };
  return meta.env?.DEV === true;
}

function isVisualPreview(): boolean {
  if (isVisualDevelopment()) return true;
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('visual') === '1' && params.get('screen') === '38';
}

export function SettingsDetailScreen({
  onSave,
}: {
  readonly onSave: (request: JsonObject) => void | Promise<void>;
}) {
  const { availableLocales, locale, setLocale, t } = useI18n();
  const visualPreview = isVisualPreview();
  const firmware = useFirmwareSnapshot();
  const settings = firmware.settings;
  const device = objectField(settings, 'device') ?? firmware.device;

  const [keepAwake, setKeepAwake] = useState(true);
  const [company, setCompany] = useState(visualPreview ? 'ABC Ağır Vasıta Servisi' : '');
  const [technicianText, setTechnicianText] = useState(visualPreview ? 'Mehmet Kaya • Ahmet Demir' : '');

  useEffect(() => {
    const storedKeepAwake = booleanField(settings, 'keepScreenAwake');
    if (storedKeepAwake !== null) setKeepAwake(storedKeepAwake);
    const storedCompany = stringField(settings, 'serviceCompany');
    if (storedCompany !== null) setCompany(storedCompany);

    const technicians = settings?.technicians;
    if (Array.isArray(technicians)) {
      const names = technicians
        .map((item) => item && typeof item === 'object' && !Array.isArray(item)
          ? stringField(item as JsonObject, 'name')
          : null)
        .filter((name): name is string => Boolean(name));
      setTechnicianText(names.join('\n'));
    }
  }, [settings]);

  return (
    <section className="p5-settings-detail" data-screen="38-settings-detail">
      <header className="p5-settings-head">
        <img src={assetUrl('icon-settings-large.svg')} alt="" aria-hidden="true" />
        <div><h1>{t('phase5.settings.title')}</h1><p>{t('phase5.settings.subtitle')}</p></div>
      </header>

      <div className="p5-settings-grid">
        <label className="p5-settings-field">
          <span>{t('phase5.settings.language')}</span>
          <select value={locale} onChange={(event) => setLocale(event.target.value)}>
            {availableLocales.map((item) => <option key={item.code} value={item.code}>{item.nativeLabel}</option>)}
          </select>
        </label>

        <label className="p5-settings-toggle">
          <span><strong>{t('phase5.settings.keepAwake')}</strong><small>{t('phase5.settings.keepAwakeHint')}</small></span>
          <input type="checkbox" checked={keepAwake} onChange={(event) => setKeepAwake(event.target.checked)} />
        </label>

        <label className="p5-settings-field">
          <span>{t('phase5.settings.technicians')}</span>
          <textarea
            rows={2}
            placeholder={t('phase5.settings.techniciansPlaceholder')}
            value={technicianText}
            readOnly
          />
        </label>

        <label className="p5-settings-field">
          <span>{t('phase5.settings.company')}</span>
          <input
            placeholder={t('phase5.settings.companyPlaceholder')}
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </label>

        <label className="p5-settings-field">
          <span>{t('phase5.settings.reportLogo')}</span>
          <input type="file" accept="image/*" />
        </label>

        <section className="p5-device-info">
          <h2>{t('phase5.settings.deviceInfo')}</h2>
          <div><span>{t('phase5.settings.product')}</span><strong>{stringField(device, 'product') ?? (visualPreview ? 'Bremsecu G1' : '—')}</strong></div>
          <div><span>{t('phase5.settings.firmware')}</span><strong>{stringField(device, 'firmwareVersion') ?? (visualPreview ? 'v1.0.0' : '—')}</strong></div>
          <div><span>{t('phase5.settings.serial')}</span><strong>{stringField(device, 'serialNumber') ?? (visualPreview ? 'G1-V2' : '—')}</strong></div>
          {visualPreview ? <div><span>ÜRETİM TARİHİ</span><strong>17.08.2026</strong></div> : null}
        </section>
      </div>

      <button
        className="p5-primary p5-settings-save"
        data-action="save-settings"
        type="button"
        onClick={() => {
          void onSave({
            language: locale,
            keepScreenAwake: keepAwake,
            serviceCompany: company,
          });
        }}
      >
        {t('phase5.settings.save')}
      </button>
    </section>
  );
}

export function BatteryStatusScreen() {
  const { t } = useI18n();
  const development = isVisualDevelopment();

  const level = development ? '78' : '—';
  const metrics = [
    [t('phase5.battery.voltage'), development ? '12.8' : '—', 'V'],
    [t('phase5.battery.current'), development ? '2.4' : '—', 'A'],
    [t('phase5.battery.power'), development ? '30.7' : '—', 'W'],
  ] as const;

  return (
    <section className="p5-battery-screen" data-screen="39-battery-status">
      <header className="p5-battery-screen__head">
        <span className="p5-battery-screen__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2.5" y="6.5" width="18" height="11" rx="2" />
            <path d="M20.5 10h1.8v4h-1.8M6 10v4M10 10v4M14 10v4" />
          </svg>
        </span>
        <div>
          <h1>{t('phase5.module.battery')}</h1>
          <p>{t('phase5.module.sideBattery')}</p>
        </div>
        <output><span>%</span>{level}</output>
      </header>

      <div className="p5-battery-screen__metrics">
        {metrics.map(([label, value, unit]) => (
          <article key={label}>
            <span>{label}</span>
            <p><strong>{value}</strong><b>{unit}</b></p>
          </article>
        ))}
      </div>

      <p className="p5-battery-screen__status"><i /> ADC&nbsp;&nbsp;•&nbsp;&nbsp;INA226&nbsp;&nbsp;•&nbsp;&nbsp;LIVE</p>
    </section>
  );
}

