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

export function SettingsRootCard({
  onMove,
  onOpen,
}: {
  readonly onMove: (direction: -1 | 1) => void;
  readonly onOpen: () => void;
}) {
  const { t } = useI18n();

  return (
    <section className="p5-carousel" data-screen="37-settings">
      <button className="p5-carousel__arrow p5-carousel__arrow--left" type="button" onClick={() => onMove(-1)}>‹</button>
      <div className="p5-selection" style={{ '--module-accent': '#CDF711' } as React.CSSProperties}>
        <div className="p5-selection__side"><span>{t('phase5.module.sideSettings')}</span></div>
        <article className="p5-selection__card">
          <img className="p5-selection__image p5-selection__image--settings" src={assetUrl('icon-settings-large.svg')} alt="" aria-hidden="true" />
          <h1>{t('phase5.module.settings')}</h1>
          <button className="p5-start p5-start--lime" data-action="open-settings" type="button" onClick={onOpen}>
            {t('phase5.settings.open')}
          </button>
        </article>
      </div>
      <button className="p5-carousel__arrow p5-carousel__arrow--right" type="button" onClick={() => onMove(1)}>›</button>
      <p className="p5-root-note">{t('phase5.settings.rootHint')}</p>
    </section>
  );
}

export function SettingsDetailScreen({
  onSave,
}: {
  readonly onSave: (request: JsonObject) => void | Promise<void>;
}) {
  const { availableLocales, locale, setLocale, t } = useI18n();
  const development = isVisualDevelopment();
  const firmware = useFirmwareSnapshot();
  const settings = firmware.settings;
  const device = objectField(settings, 'device') ?? firmware.device;

  const [keepAwake, setKeepAwake] = useState(true);
  const [company, setCompany] = useState('');
  const [technicianText, setTechnicianText] = useState('');

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
            {availableLocales.map((item) => <option key={item.code} value={item.code}>{item.code.toUpperCase()}</option>)}
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
          <div><span>{t('phase5.settings.product')}</span><strong>{stringField(device, 'product') ?? (development ? 'BREMSECU G1' : '—')}</strong></div>
          <div><span>{t('phase5.settings.firmware')}</span><strong>{stringField(device, 'firmwareVersion') ?? (development ? 'development-fixture' : '—')}</strong></div>
          <div><span>{t('phase5.settings.serial')}</span><strong>{stringField(device, 'serialNumber') ?? (development ? 'DEV-ONLY' : '—')}</strong></div>
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

export function BatteryStatusCard({ onMove }: { readonly onMove: (direction: -1 | 1) => void }) {
  const { t } = useI18n();
  const development = isVisualDevelopment();

  const metrics = [
    [t('phase5.battery.voltage'), development ? '12.8 V' : '— V'],
    [t('phase5.battery.current'), development ? '-0.8 A' : '— A'],
    [t('phase5.battery.power'), development ? '-10.2 W' : '— W'],
  ] as const;

  return (
    <section className="p5-battery-card" data-screen="39-battery-status">
      <button className="p5-carousel__arrow p5-carousel__arrow--left" type="button" onClick={() => onMove(-1)}>‹</button>

      <header className="p5-battery-card__head">
        <img src={assetUrl('battery-status.svg')} alt="" aria-hidden="true" />
        <div><h1>{t('phase5.battery.title')}</h1><p>{t('phase5.battery.subtitle')}</p></div>
      </header>

      <section className="p5-battery-level">
        <img src={assetUrl('battery-status.svg')} alt="" aria-hidden="true" />
        <div>
          <small>{t('phase5.battery.level')}</small>
          <output>{development ? '86%' : '—%'}</output>
        </div>
      </section>

      <div className="p5-battery-metrics">
        {metrics.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>

      <p className="p5-battery-note">{t('phase5.battery.note')}</p>
    </section>
  );
}
