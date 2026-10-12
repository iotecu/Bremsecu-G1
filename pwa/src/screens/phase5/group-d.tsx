import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../i18n';
import type { JsonObject } from '../../services/contracts';
import {
  readLocalServiceSettings,
  subscribeLocalServiceSettings,
  technicianId,
  writeLocalServiceSettings,
  type LocalServiceSettings,
  type LocalTechnician,
} from '../../services/local-service-settings';
import { useFirmwareRuntime, useFirmwareSnapshot } from '../../services/runtime-react';
import { booleanField, numberField, objectField, stringField } from '../../services/view';

function isVisualDevelopment(): boolean {
  const meta = import.meta as ImportMeta & { readonly env?: { readonly DEV?: boolean } };
  return meta.env?.DEV === true;
}

function isVisualPreview(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('visual') === '1' && params.get('screen') === '38';
}

function firmwareTechnicians(settings: JsonObject | null): LocalTechnician[] {
  const value = settings?.technicians;
  if (!Array.isArray(value)) return [];

  return value.flatMap((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const object = item as JsonObject;
    const name = stringField(object, 'name');
    if (!name) return [];
    const id = stringField(object, 'id') ?? technicianId(name + '-' + index);
    return [{ id, name }];
  });
}

function serviceSettingsRequest(
  locale: string,
  state: LocalServiceSettings,
): JsonObject {
  return {
    language: locale,
    keepScreenAwake: state.keepScreenAwake,
    technicians: state.technicians.map((item) => ({ id: item.id, name: item.name })),
    serviceCompany: state.serviceCompany,
    serviceAddress: state.serviceAddress,
    servicePhone: state.servicePhone,
    serviceEmail: state.serviceEmail,
  };
}

export function SettingsDetailScreen({
  onSave,
  onDone,
  onCalibration,
}: {
  readonly onSave: (request: JsonObject) => void | Promise<void>;
  readonly onDone?: () => void;
  readonly onCalibration?: () => void;
}) {
  const { availableLocales, locale, setLocale, t } = useI18n();
  const visualPreview = isVisualPreview();
  const firmwareRuntime = useFirmwareRuntime();
  const firmware = useFirmwareSnapshot();
  const settings = firmware.settings;
  const [refreshedDevice, setRefreshedDevice] = useState<JsonObject | null>(null);

  useEffect(() => {
    if (visualPreview || !firmwareRuntime) return;
    let cancelled = false;

    void firmwareRuntime.refreshDevice().then((device) => {
      if (!cancelled && device) setRefreshedDevice(device);
    });

    return () => {
      cancelled = true;
    };
  }, [firmwareRuntime, visualPreview]);

  const device =
    refreshedDevice ??
    firmware.device ??
    objectField(settings, 'device');

  const initialLocal = useMemo(() => readLocalServiceSettings(), []);
  const [technicians, setTechnicians] = useState<LocalTechnician[]>(
    visualPreview && initialLocal.technicians.length === 0
      ? [
          { id: 'tech-mehmet-kaya', name: 'Mehmet Kaya' },
          { id: 'tech-ahmet-demir', name: 'Ahmet Demir' },
        ]
      : [...initialLocal.technicians],
  );
  const [keepAwake, setKeepAwake] = useState(initialLocal.keepScreenAwake);
  const [company, setCompany] = useState(
    initialLocal.serviceCompany || (visualPreview ? 'ABC Ağır Vasıta Servisi' : ''),
  );
  const [address, setAddress] = useState(initialLocal.serviceAddress);
  const [phone, setPhone] = useState(initialLocal.servicePhone);
  const [email, setEmail] = useState(initialLocal.serviceEmail);

  const [technicianModalOpen, setTechnicianModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [draftTechnicians, setDraftTechnicians] = useState<LocalTechnician[]>([]);
  const [newTechnicianName, setNewTechnicianName] = useState('');
  const [draftCompany, setDraftCompany] = useState('');
  const [draftAddress, setDraftAddress] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [draftEmail, setDraftEmail] = useState('');

  useEffect(() => {
    const local = readLocalServiceSettings();
    const fromFirmware = firmwareTechnicians(settings);
    const storedKeepAwake = booleanField(settings, 'keepScreenAwake');

    setTechnicians(local.technicians.length > 0 ? [...local.technicians] : fromFirmware);
    setCompany(local.serviceCompany || stringField(settings, 'serviceCompany') || '');
    setAddress(local.serviceAddress || stringField(settings, 'serviceAddress') || '');
    setPhone(local.servicePhone || stringField(settings, 'servicePhone') || '');
    setEmail(local.serviceEmail || stringField(settings, 'serviceEmail') || '');
    setKeepAwake(
      storedKeepAwake !== null && local.technicians.length === 0 &&
      !local.serviceCompany && !local.serviceAddress && !local.servicePhone && !local.serviceEmail
        ? storedKeepAwake
        : local.keepScreenAwake,
    );
  }, [settings]);

  useEffect(() => subscribeLocalServiceSettings(() => {
    const local = readLocalServiceSettings();
    setTechnicians([...local.technicians]);
    setCompany(local.serviceCompany);
    setAddress(local.serviceAddress);
    setPhone(local.servicePhone);
    setEmail(local.serviceEmail);
    setKeepAwake(local.keepScreenAwake);
  }), []);

  const technicianText = technicians.map((item) => item.name).join(' • ');
  const serviceContact = [address, phone, email].filter(Boolean).join(' • ');

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

  function currentSettings(overrides: Partial<LocalServiceSettings> = {}): LocalServiceSettings {
    return {
      technicians,
      serviceCompany: company,
      serviceAddress: address,
      servicePhone: phone,
      serviceEmail: email,
      keepScreenAwake: keepAwake,
      ...overrides,
    };
  }

  async function persist(overrides: Partial<LocalServiceSettings> = {}) {
    const next = writeLocalServiceSettings(currentSettings(overrides));
    try {
      await onSave(serviceSettingsRequest(locale, next));
    } catch {
      // Local settings remain usable while firmware / ESP integration is unavailable.
    }
    return next;
  }

  function openTechnicians() {
    setDraftTechnicians([...technicians]);
    setNewTechnicianName('');
    setTechnicianModalOpen(true);
  }

  function addTechnician() {
    const name = newTechnicianName.trim();
    if (!name) return;

    const normalized = name.toLocaleLowerCase(locale);
    if (draftTechnicians.some((item) => item.name.toLocaleLowerCase(locale) === normalized)) {
      setNewTechnicianName('');
      return;
    }

    let id = technicianId(name);
    let suffix = 2;
    while (draftTechnicians.some((item) => item.id === id)) {
      id = technicianId(name) + '-' + suffix;
      suffix += 1;
    }

    setDraftTechnicians((items) => [...items, { id, name }]);
    setNewTechnicianName('');
  }

  async function saveTechnicians() {
    const seen = new Set<string>();
    const cleaned = draftTechnicians.flatMap((item) => {
      const name = item.name.trim();
      const key = name.toLocaleLowerCase(locale);
      if (!name || seen.has(key)) return [];
      seen.add(key);
      return [{ ...item, name }];
    });

    setTechnicians(cleaned);
    await persist({ technicians: cleaned });
    setTechnicianModalOpen(false);
  }

  function openServiceInfo() {
    setDraftCompany(company);
    setDraftAddress(address);
    setDraftPhone(phone);
    setDraftEmail(email);
    setServiceModalOpen(true);
  }

  async function saveServiceInfo() {
    const next = {
      serviceCompany: draftCompany.trim(),
      serviceAddress: draftAddress.trim(),
      servicePhone: draftPhone.trim(),
      serviceEmail: draftEmail.trim(),
    };
    setCompany(next.serviceCompany);
    setAddress(next.serviceAddress);
    setPhone(next.servicePhone);
    setEmail(next.serviceEmail);
    await persist(next);
    setServiceModalOpen(false);
  }

  const modals = (
    <>
      {technicianModalOpen ? (
        <div className="p5-settings-modal-layer" role="presentation" onMouseDown={() => setTechnicianModalOpen(false)}>
          <section className="p5-settings-modal" role="dialog" aria-modal="true" aria-label={t('phase5.settings.technicians')} onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <h2>{t('phase5.settings.technicians')}</h2>
                <p>{t('phase5.settings.techniciansPlaceholder')}</p>
              </div>
              <button type="button" className="p5-settings-modal__close" onClick={() => setTechnicianModalOpen(false)}>×</button>
            </header>

            <div className="p5-settings-modal__add">
              <label>
                <span>{t('phase5.settings.technicianName')}</span>
                <input
                  autoFocus
                  value={newTechnicianName}
                  placeholder={t('phase5.settings.technicianNamePlaceholder')}
                  onChange={(event) => setNewTechnicianName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addTechnician();
                    }
                  }}
                />
              </label>
              <button type="button" onClick={addTechnician} disabled={!newTechnicianName.trim()}>
                {t('phase5.settings.addTechnician')}
              </button>
            </div>

            <div className="p5-settings-technician-list">
              {draftTechnicians.length === 0 ? (
                <p>{t('phase5.settings.noTechnicians')}</p>
              ) : draftTechnicians.map((item) => (
                <div key={item.id}>
                  <input
                    aria-label={t('phase5.settings.technicianName')}
                    value={item.name}
                    onChange={(event) => {
                      const name = event.target.value;
                      setDraftTechnicians((items) =>
                        items.map((entry) => entry.id === item.id ? { ...entry, name } : entry),
                      );
                    }}
                  />
                  <button
                    type="button"
                    aria-label={t('phase5.settings.removeTechnician')}
                    onClick={() => setDraftTechnicians((items) => items.filter((entry) => entry.id !== item.id))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <footer>
              <button type="button" onClick={() => setTechnicianModalOpen(false)}>{t('phase5.reportSave.cancel')}</button>
              <button type="button" className="is-primary" onClick={() => { void saveTechnicians(); }}>{t('phase5.reportSave.save')}</button>
            </footer>
          </section>
        </div>
      ) : null}

      {serviceModalOpen ? (
        <div className="p5-settings-modal-layer" role="presentation" onMouseDown={() => setServiceModalOpen(false)}>
          <section className="p5-settings-modal" role="dialog" aria-modal="true" aria-label={t('phase5.settings.company')} onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <h2>{t('phase5.settings.company')}</h2>
                <p>{t('phase5.settings.companyPlaceholder')}</p>
              </div>
              <button type="button" className="p5-settings-modal__close" onClick={() => setServiceModalOpen(false)}>×</button>
            </header>

            <div className="p5-settings-modal__fields">
              <label><span>{t('phase5.settings.companyName')}</span><input value={draftCompany} onChange={(event) => setDraftCompany(event.target.value)} /></label>
              <label><span>{t('phase5.settings.address')}</span><input value={draftAddress} onChange={(event) => setDraftAddress(event.target.value)} /></label>
              <label><span>{t('phase5.settings.phone')}</span><input inputMode="tel" value={draftPhone} onChange={(event) => setDraftPhone(event.target.value)} /></label>
              <label><span>{t('phase5.settings.email')}</span><input inputMode="email" value={draftEmail} onChange={(event) => setDraftEmail(event.target.value)} /></label>
            </div>

            <footer>
              <button type="button" onClick={() => setServiceModalOpen(false)}>{t('phase5.reportSave.cancel')}</button>
              <button type="button" className="is-primary" onClick={() => { void saveServiceInfo(); }}>{t('phase5.reportSave.save')}</button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );

  return (
    <>
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
                onChange={(event) => {
                  const value = event.target.checked;
                  setKeepAwake(value);
                  void persist({ keepScreenAwake: value });
                }}
              />
            </label>

            <div className="p5-settings-row">
              <span>
                <strong>{t('phase5.settings.technicians')}</strong>
                <small>{technicianText || t('phase5.settings.techniciansPlaceholder')}</small>
              </span>
              <button type="button" className="p5-settings-row__action" onClick={openTechnicians}>{t('phase5.settings.edit')}</button>
            </div>

            <div className="p5-settings-row p5-settings-row--company">
              <span>
                <strong>{t('phase5.settings.company')}</strong>
                <small>{company || t('phase5.settings.companyPlaceholder')}</small>
                <small>{serviceContact || t('phase5.settings.addressPhoneEmail')}</small>
              </span>
              <button type="button" className="p5-settings-row__action" onClick={openServiceInfo}>{t('phase5.settings.edit')}</button>
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

          {onCalibration ? (
            <button
              className="p5-settings-calibration"
              data-action="open-calibration-monitor"
              type="button"
              onClick={onCalibration}
            >
              <strong>Kalibrasyon Monitörü</strong>
              <span>RAW ADC / NODE V / PIN V canlı bench ölçümü</span>
            </button>
          ) : null}

          <button
            className="p5-primary p5-settings-save"
            data-action="save-settings"
            type="button"
            onClick={() => {
              void (async () => {
                await persist();
                onDone?.();
              })();
            }}
          >
            {t('phase5.settings.save')}
          </button>
        </div>
      </section>

      {typeof document === 'undefined' ? modals : createPortal(modals, document.body)}
    </>
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

      <p className="p5-battery-screen__status"><i />{t('phase5.battery.live')}</p>
    </section>
  );
}



type CalibrationIso = '7638' | '12098';

type CalibrationChannel = {
  readonly pin: number;
  readonly channelId: number;
  readonly label: string;
};

const calibration7638Channels: readonly CalibrationChannel[] = [
  { pin: 1, channelId: 1, label: 'AKÜ' },
  { pin: 2, channelId: 2, label: 'KONTAK' },
  { pin: 3, channelId: 0, label: 'GND 1' },
  { pin: 4, channelId: 3, label: 'GND 2' },
  { pin: 5, channelId: 4, label: 'ABS' },
  { pin: 6, channelId: 5, label: 'CAN H' },
  { pin: 7, channelId: 6, label: 'CAN L' },
];

const calibration12098Channels: readonly CalibrationChannel[] = [
  { pin: 1, channelId: 11, label: 'SOL SİNYAL' },
  { pin: 2, channelId: 9, label: 'SAĞ SİNYAL' },
  { pin: 3, channelId: 8, label: 'ARKA SİS' },
  { pin: 4, channelId: 20, label: 'GND 3' },
  { pin: 5, channelId: 7, label: 'SOL PARK' },
  { pin: 6, channelId: 10, label: 'SAĞ PARK' },
  { pin: 7, channelId: 14, label: 'STOP' },
  { pin: 8, channelId: 13, label: 'GERİ VİTES' },
  { pin: 9, channelId: 12, label: 'AKÜ' },
  { pin: 10, channelId: 15, label: 'BALATA SİNYAL' },
  { pin: 11, channelId: 17, label: 'YAYLI FREN' },
  { pin: 12, channelId: 16, label: 'ASANSÖR / DİNGİL' },
  { pin: 13, channelId: 21, label: 'GND 4' },
  { pin: 14, channelId: 25, label: 'CAN H' },
  { pin: 15, channelId: 18, label: 'CAN L' },
];

export function CalibrationMonitorScreen({
  onDone,
}: {
  readonly onDone?: () => void;
}) {
  const firmwareRuntime = useFirmwareRuntime();
  const [iso, setIso] = useState<CalibrationIso>('7638');
  const [referenceV, setReferenceV] = useState('0');
  const [samples, setSamples] = useState<Record<number, JsonObject>>({});
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  const channels = iso === '7638' ? calibration7638Channels : calibration12098Channels;

  async function sampleOne(channel: CalibrationChannel) {
    if (!firmwareRuntime) {
      setError('Firmware bağlantısı yok.');
      return;
    }
    try {
      const result = await firmwareRuntime.sampleCalibration(channel.channelId);
      setSamples((current) => ({ ...current, [channel.channelId]: result }));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ADC örneği okunamadı.');
    }
  }

  async function scanAll() {
    if (!firmwareRuntime || scanning) {
      if (!firmwareRuntime) setError('Firmware bağlantısı yok.');
      return;
    }
    setScanning(true);
    setError('');
    const next: Record<number, JsonObject> = {};
    try {
      for (const channel of channels) {
        next[channel.channelId] = await firmwareRuntime.sampleCalibration(channel.channelId);
      }
      setSamples((current) => ({ ...current, ...next }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ADC taraması tamamlanamadı.');
    } finally {
      setScanning(false);
    }
  }

  useEffect(() => {
    setSamples({});
    setError('');
  }, [iso]);

  return (
    <section className="p5-calibration-monitor" data-screen="calibration-monitor">
      <header className="p5-calibration-monitor__head">
        <div>
          <span>BENCH / SERVİS</span>
          <h1>Kalibrasyon Monitörü</h1>
          <p>Multimetre referansı ile RAW ADC, ADC node voltajı ve mevcut pin dönüşümünü yan yana okuyun.</p>
        </div>
        {onDone ? <button type="button" onClick={onDone}>Ayarlar'a dön</button> : null}
      </header>

      <section className="p5-calibration-monitor__controls">
        <div className="p5-calibration-monitor__tabs" role="tablist" aria-label="Kalibrasyon soketi">
          <button className={iso === '7638' ? 'is-active' : ''} type="button" onClick={() => setIso('7638')}>ISO 7638</button>
          <button className={iso === '12098' ? 'is-active' : ''} type="button" onClick={() => setIso('12098')}>ISO 12098</button>
        </div>

        <label>
          <span>Multimetrede uygulanan referans</span>
          <select value={referenceV} onChange={(event) => setReferenceV(event.target.value)}>
            <option value="0">0 V</option>
            <option value="3.3">3.3 V</option>
            <option value="12">12 V</option>
            <option value="18">18 V</option>
            <option value="24">24 V</option>
            <option value="30">30 V</option>
          </select>
        </label>

        <button className="p5-calibration-monitor__scan" type="button" disabled={scanning} onClick={() => { void scanAll(); }}>
          {scanning ? 'Taranıyor…' : 'Tüm kanalları oku'}
        </button>
      </section>

      <div className="p5-calibration-monitor__reference">
        <strong>REFERANS: {referenceV} V</strong>
        <span>Önce multimetrede değeri sabitle, sonra “Tüm kanalları oku”. GND kanalları pasif olarak yalnız okunur.</span>
      </div>

      {error ? <p className="p5-calibration-monitor__error">FIRMWARE: {error}</p> : null}

      <div className="p5-calibration-monitor__table">
        <div className="p5-calibration-monitor__row p5-calibration-monitor__row--head">
          <span>PIN</span><span>HAT</span><span>CH</span><span>RAW ADC</span><span>NODE V</span><span>PIN V</span><span>DURUM</span><span />
        </div>
        {channels.map((channel) => {
          const sample = samples[channel.channelId];
          const raw = sample ? numberField(sample, 'rawCount') : null;
          const node = sample ? numberField(sample, 'nodeValue') : null;
          const pinV = sample ? numberField(sample, 'engineeringValue') : null;
          const conversion = sample ? stringField(sample, 'conversion') : null;
          const family = sample ? stringField(sample, 'family') : null;
          return (
            <div className="p5-calibration-monitor__row" key={channel.channelId}>
              <strong>{channel.pin}</strong>
              <span><b>{channel.label}</b><small>{family ?? '—'}</small></span>
              <code>{channel.channelId}</code>
              <output>{raw === null ? '—' : raw}</output>
              <output>{node === null ? '—' : node.toFixed(6) + ' V'}</output>
              <output>{pinV === null ? '—' : pinV.toFixed(3) + ' V'}</output>
              <span className={'p5-calibration-monitor__state' + (conversion === 'CALIBRATED' ? ' is-ready' : '')}>{conversion ?? '—'}</span>
              <button type="button" disabled={scanning} onClick={() => { void sampleOne(channel); }}>Oku</button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
