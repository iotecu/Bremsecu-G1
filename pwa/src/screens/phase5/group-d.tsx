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
      setTechnicianText(names.join(' • '));
    }
  }, [settings]);

  const serviceAddress = [
    stringField(settings, 'serviceAddress'),
    stringField(settings, 'servicePhone'),
    stringField(settings, 'serviceEmail'),
  ].filter((value): value is string => Boolean(value)).join(' • ');

  const model =
    stringField(device, 'model') ??
    stringField(device, 'product') ??
    (visualPreview ? 'Bremsecu G1' : '—');
  const firmwareVersion =
    stringField(device, 'firmwareVersion') ??
    (visualPreview ? 'v1.0.0' : '—');
  const hardwareRevision =
    stringField(device, 'boardRevision') ??
    stringField(device, 'hardwareRevision') ??
    (visualPreview ? 'G1-V2' : '—');
  const productionDate =
    stringField(device, 'productionDate') ??
    (visualPreview ? '17.08.2026' : '—');

  return (
    <section className="p5-settings-detail p5-settings-detail--approved" data-screen="38-settings-detail">
      <div className="p5-settings-panel">
        <header className="p5-settings-title">
          <h1>{t('phase5.settings.title')}</h1>
          <p>{t('phase5.settings.subtitle')}</p>
        </header>

        <div className="p5-settings-list">
          <label className="p5-settings-row p5-settings-row--language">
            <span>
              <strong>{t('phase5.settings.language')}</strong>
              <small>{t('phase5.settings.languageHint')}</small>
            </span>
            <span className="p5-settings-language-value">
              <select
                aria-label={t('accessibility.languageSelector')}
                value={locale}
                onChange={(event) => setLocale(event.target.value)}
              >
                {availableLocales.map((item) => (
                  <option key={item.code} value={item.code}>{item.nativeLabel}</option>
                ))}
              </select>
              <b aria-hidden="true">⌄</b>
            </span>
          </label>

          <label className="p5-settings-row p5-settings-row--toggle">
            <span>
              <strong>{t('phase5.settings.keepAwake')}</strong>
              <small>{t('phase5.settings.keepAwakeHint')}</small>
            </span>
            <input
              aria-label={t('phase5.settings.keepAwake')}
              type="checkbox"
              checked={keepAwake}
              onChange={(event) => setKeepAwake(event.target.checked)}
            />
          </label>

          <div className="p5-settings-row">
            <span>
              <strong>{t('phase5.settings.technicians')}</strong>
              <small>{technicianText || t('phase5.settings.techniciansPlaceholder')}</small>
            </span>
            <button type="button" className="p5-settings-row__action">{t('phase5.settings.edit')}</button>
          </div>

          <div className="p5-settings-row p5-settings-row--company">
            <span>
              <strong>{t('phase5.settings.company')}</strong>
              <small>{company || t('phase5.settings.companyPlaceholder')}</small>
              <small>{serviceAddress || t('phase5.settings.addressPhoneEmail')}</small>
            </span>
            <button type="button" className="p5-settings-row__action">{t('phase5.settings.edit')}</button>
          </div>

          <label className="p5-settings-row p5-settings-row--logo">
            <span>
              <strong>{t('phase5.settings.reportLogo')}</strong>
              <small>{t('phase5.settings.reportLogoHint')}</small>
            </span>
            <span className="p5-settings-row__action p5-settings-upload">
              {t('phase5.settings.uploadLogo')}
              <input type="file" accept="image/*" />
            </span>
          </label>
        </div>

        <h2 className="p5-settings-device-title">{t('phase5.settings.deviceInfo')}</h2>
        <section className="p5-settings-device">
          <div><span>{t('phase5.settings.model')}</span><strong>{model}</strong></div>
          <div><span>{t('phase5.settings.firmware')}</span><strong>{firmwareVersion}</strong></div>
          <div><span>{t('phase5.settings.hardwareRevision')}</span><strong>{hardwareRevision}</strong></div>
          <div><span>{t('phase5.settings.productionDate')}</span><strong>{productionDate}</strong></div>
        </section>

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
      </div>
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

