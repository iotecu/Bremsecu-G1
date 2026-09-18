import React, { useMemo, useState, type FormEvent } from 'react';
import { assetUrl } from '../../assets';
import { useI18n, type TranslationKey } from '../../i18n';
import type { MainCardIndex } from '../../navigation';

function isVisualDevelopment(): boolean {
  const meta = import.meta as ImportMeta & { readonly env?: { readonly DEV?: boolean } };
  return meta.env?.DEV === true;
}

export function LoginScreen({ onContinue }: { readonly onContinue: () => void }) {
  const { t } = useI18n();
  return (
    <section className="p5-login" data-screen="01-login">
      <img className="p5-login__background" src={assetUrl('login-background.png')} alt="" aria-hidden="true" />
      <div className="p5-login__shade" />
      <img className="p5-login__tiger" src={assetUrl('tiger.png')} alt="" aria-hidden="true" />
      <img className="p5-login__logo" src={assetUrl('bremsecu-logo.png')} alt="Bremsecu" />
      <div className="p5-login__hotspot-ring"><img src={assetUrl('hotspot.png')} alt="" aria-hidden="true" /></div>
      <button className="p5-login__serial" data-action="continue-login" type="button" onClick={onContinue}>
        {t('phase5.login.serialNumber')}
      </button>
      <p className="p5-login__instruction">{t('phase5.login.hotspotInstruction')}</p>
    </section>
  );
}

export function VehicleEntryScreen({
  onNewVehicle,
  onOldRecord,
}: {
  readonly onNewVehicle: () => void;
  readonly onOldRecord: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="p5-entry" data-screen="02-vehicle-entry">
      <p className="p5-entry__eyebrow">{t('phase5.entry.testEntry')}</p>
      <button className="p5-entry__choice p5-entry__choice--new" data-action="new-vehicle" type="button" onClick={onNewVehicle}>
        <img src={assetUrl('tractor-icon.png')} alt="" aria-hidden="true" />
        <span>{t('phase5.entry.newVehicle')}</span>
      </button>
      <button className="p5-entry__choice p5-entry__choice--old" data-action="old-record" type="button" onClick={onOldRecord}>
        <img src={assetUrl('find.svg')} alt="" aria-hidden="true" />
        <span>{t('phase5.entry.existingRecord')}</span>
      </button>
    </section>
  );
}

export function NewVehicleRecordScreen({ onSave }: { readonly onSave: () => void }) {
  const { formatDate, t } = useI18n();
  const [tractorSelected, setTractorSelected] = useState(true);
  const [trailerSelected, setTrailerSelected] = useState(true);
  const [tractorPlate, setTractorPlate] = useState('');
  const [tractorChassis, setTractorChassis] = useState('');
  const [trailerPlate, setTrailerPlate] = useState('');
  const [trailerFleet, setTrailerFleet] = useState('');
  const [trailerChassis, setTrailerChassis] = useState('');
  const [connectionType, setConnectionType] = useState<'iso12098' | '2x7'>('iso12098');

  const canSubmit = useMemo(() => {
    const tractorIdentified = !tractorSelected || Boolean(tractorPlate.trim() || tractorChassis.trim());
    const trailerIdentified = !trailerSelected || Boolean(trailerPlate.trim() || trailerFleet.trim() || trailerChassis.trim());
    return (tractorSelected || trailerSelected) && tractorIdentified && trailerIdentified;
  }, [tractorSelected, trailerSelected, tractorPlate, tractorChassis, trailerPlate, trailerFleet, trailerChassis]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit) onSave();
  }

  return (
    <form className="p5-form" data-screen="03-new-vehicle" onSubmit={submit}>
      <div className="p5-form__heading">
        <div><h1>{t('phase5.form.title')}</h1><p>{t('phase5.form.subtitle')}</p></div>
        <time>{formatDate(new Date(), { day: '2-digit', month: '2-digit', year: 'numeric' })}</time>
      </div>

      <Field label={t('phase5.form.customerCompany')}><input placeholder={t('phase5.form.customerPlaceholder')} /></Field>
      <Field label={t('phase5.form.technician')}>
        <select defaultValue=""><option value="" disabled>{t('phase5.form.technicianSelect')}</option><option>—</option></select>
      </Field>

      <fieldset className="p5-form__vehicle-select">
        <legend>{t('phase5.form.vehicleSelection')}</legend>
        <button className={tractorSelected ? 'is-selected' : ''} type="button" onClick={() => setTractorSelected((value) => !value)}>
          {tractorSelected ? '✓ ' : ''}{t('phase5.form.tractor')}
        </button>
        <button className={trailerSelected ? 'is-selected' : ''} type="button" onClick={() => setTrailerSelected((value) => !value)}>
          {trailerSelected ? '✓ ' : ''}{t('phase5.form.trailer')}
        </button>
      </fieldset>

      <div className="p5-form__pair">
        <Field label={t('phase5.form.tractorPlate')}>
          <input data-field="tractor-plate" placeholder="34 ABC 123" value={tractorPlate} onChange={(event) => setTractorPlate(event.target.value)} />
        </Field>
        <Field label={t('phase5.form.tractorChassis')}>
          <input placeholder={t('phase5.common.optional')} value={tractorChassis} onChange={(event) => setTractorChassis(event.target.value)} />
        </Field>
      </div>
      <div className="p5-form__pair">
        <Field label={t('phase5.form.trailerPlate')}>
          <input placeholder={t('phase5.form.trailerPlatePlaceholder')} value={trailerPlate} onChange={(event) => setTrailerPlate(event.target.value)} />
        </Field>
        <Field label={t('phase5.form.fleetTrailerNo')}>
          <input placeholder={t('phase5.common.optional')} value={trailerFleet} onChange={(event) => setTrailerFleet(event.target.value)} />
        </Field>
      </div>
      <Field label={t('phase5.form.trailerChassis')}>
        <input placeholder={t('phase5.common.optional')} value={trailerChassis} onChange={(event) => setTrailerChassis(event.target.value)} />
      </Field>

      <fieldset className="p5-form__connection">
        <legend>{t('phase5.form.trailerConnectionType')}</legend>
        <button className={connectionType === 'iso12098' ? 'is-selected' : ''} type="button" onClick={() => setConnectionType('iso12098')}>{t('phase5.form.connector15')}</button>
        <button className={connectionType === '2x7' ? 'is-selected' : ''} type="button" onClick={() => setConnectionType('2x7')}>{t('phase5.form.connector2x7')}</button>
      </fieldset>

      <p className="p5-form__hint">{t('phase5.form.validationHint')}</p>
      <button className="p5-primary p5-form__submit" data-action="save-vehicle" disabled={!canSubmit} type="submit">{t('phase5.form.saveContinue')}</button>
    </form>
  );
}

function Field({ children, label }: { readonly children: React.ReactNode; readonly label: string }) {
  return <label className="p5-field"><span>{label}</span>{children}</label>;
}

export function RecordSearchModal({
  onClose,
  onRetest,
}: {
  readonly onClose: () => void;
  readonly onRetest: () => void;
}) {
  const { t } = useI18n();
  const records = isVisualDevelopment()
    ? [
        { name: 'ABC LOJİSTİK', tag: '15 PIN', tractor: '34 ABC 123', trailer: '34 DRS 456', meta: '18.08.2026 • Ahmet Yılmaz' },
        { name: 'ÖRNEK TAŞIMACILIK', tag: '2×7 PIN', tractor: '16 TRK 908', trailer: 'Filo 27', meta: '17.08.2026 • Mehmet Kaya' },
      ]
    : [];

  const filters: ReadonlyArray<readonly [string, TranslationKey]> = [
    ['all', 'phase5.records.all'],
    ['customer', 'phase5.records.customer'],
    ['tractor', 'phase5.records.tractorPlate'],
    ['trailer', 'phase5.records.trailerPlate'],
    ['chassis', 'phase5.records.chassisNo'],
    ['fleet', 'phase5.records.fleetTrailerNo'],
  ];

  return (
    <div className="p5-modal-layer" data-overlay="old-record-search">
      <section className="p5-record-modal" role="dialog" aria-modal="true" aria-labelledby="record-search-title">
        <button className="p5-modal-close" aria-label={t('navigation.back')} type="button" onClick={onClose}>×</button>
        <h2 id="record-search-title">{t('phase5.records.title')}</h2>
        <p className="p5-record-modal__subtitle">{t('phase5.records.subtitle')}</p>
        <label className="p5-search"><span aria-hidden="true">⌕</span><input aria-label={t('phase5.records.searchPlaceholder')} placeholder={t('phase5.records.searchPlaceholder')} /></label>
        <h3>{t('phase5.records.filter')}</h3>
        <div className="p5-filter-chips">
          {filters.map(([id, key], index) => <button className={index === 0 ? 'is-selected' : ''} type="button" key={id}>{t(key)}</button>)}
        </div>
        <h3 className="p5-record-modal__found">{t('phase5.records.foundRecords')}</h3>
        <div className="p5-record-list">
          {records.map((record) => (
            <article className="p5-record-card" key={record.name}>
              <div className="p5-record-card__head"><strong>{record.name}</strong><span>{record.tag}</span></div>
              <div className="p5-record-card__vehicles">
                <span>{t('phase5.form.tractor')}: {record.tractor}</span>
                <span>{t('phase5.form.trailer')}: {record.trailer}</span>
              </div>
              <small>{record.meta}</small>
              <div className="p5-record-card__actions">
                <button type="button">{t('phase5.records.inspectReport')}</button>
                <button data-action="retest-record" type="button" onClick={onRetest}>{t('phase5.records.retest')}</button>
              </div>
            </article>
          ))}
        </div>
        <p className="p5-record-modal__hint">{t('phase5.records.narrowHint')}</p>
      </section>
    </div>
  );
}

const moduleTitleKeys: readonly TranslationKey[] = [
  'phase5.module.iso7638Voltage','phase5.module.iso12098Voltage','phase5.module.cable','phase5.module.canTermination',
  'phase5.module.lamp','phase5.module.reports','phase5.module.settings','phase5.module.battery',
];
const moduleSideKeys: readonly TranslationKey[] = [
  'phase5.module.sideVoltage','phase5.module.sideVoltage','phase5.module.sideCable','phase5.module.sideTermination',
  'phase5.module.sideLamp','phase5.module.sideReport','phase5.module.sideSettings','phase5.module.sideBattery',
];
const moduleAssets = [
  'iso7638-socket.png','iso12098-socket.png','cable-662-5072.png','resistance.svg',
  'lamp-test.png','report-2.svg','icon-settings-large.svg','battery-status.svg',
] as const;
const moduleAccents = ['#FFFFFF','#FFFFFF','#2375B9','#ED9F0E','#B92323','#0ED6ED','#CDF711','#1115F7'] as const;

export function MainCarouselScreen({
  activeCardIndex,
  onMove,
  onStart,
}: {
  readonly activeCardIndex: MainCardIndex;
  readonly onMove: (direction: -1 | 1) => void;
  readonly onStart: () => void;
}) {
  const { t } = useI18n();
  const isVoltage = activeCardIndex === 0 || activeCardIndex === 1;
  const pinCount = activeCardIndex === 0 ? 7 : 15;
  const socketNumber = activeCardIndex === 0 ? 1 : 2;

  return (
    <section className="p5-carousel" data-screen={activeCardIndex === 0 ? '05-iso7638-select' : activeCardIndex === 1 ? '07-iso12098-select' : 'phase5-carousel'}>
      <button className="p5-carousel__arrow p5-carousel__arrow--left" aria-label={t('navigation.back')} type="button" disabled={activeCardIndex === 0} onClick={() => onMove(-1)}>‹</button>
      <div className="p5-selection" style={{ '--module-accent': moduleAccents[activeCardIndex] } as React.CSSProperties}>
        <div className="p5-selection__side"><span>{t(moduleSideKeys[activeCardIndex])}</span></div>
        <article className="p5-selection__card">
          <img className="p5-selection__image" src={assetUrl(moduleAssets[activeCardIndex])} alt="" aria-hidden="true" />
          <h1>{t(moduleTitleKeys[activeCardIndex])}</h1>
          <button className="p5-start" data-action="start-test" type="button" disabled={!isVoltage} onClick={onStart}>{t('phase5.common.start')}</button>
        </article>
      </div>
      <button className="p5-carousel__arrow p5-carousel__arrow--right" aria-label={t('phase5.common.next')} type="button" disabled={activeCardIndex === 7} onClick={() => onMove(1)}>›</button>
      {isVoltage ? (
        <div className="p5-guidance">
          <p>{t('phase5.selection.connectConnector', { pins: pinCount })}</p>
          <div className="p5-guidance__socket"><span>{socketNumber}</span><strong>{t('phase5.selection.numberedSocket')}</strong></div>
          <p>{t('phase5.selection.thenIgnition')}</p>
        </div>
      ) : null}
    </section>
  );
}

interface MeasurementRow {
  readonly pin: number;
  readonly labelKey: TranslationKey;
  readonly kind: '24v' | 'pulse' | 'gnd' | 'can' | 'conditional';
}
const iso7638Rows: readonly MeasurementRow[] = [
  { pin: 1, labelKey: 'phase5.measurement.battery', kind: '24v' },
  { pin: 2, labelKey: 'phase5.measurement.ignition', kind: '24v' },
  { pin: 3, labelKey: 'phase5.measurement.chassis', kind: 'gnd' },
  { pin: 4, labelKey: 'phase5.measurement.chassis', kind: 'gnd' },
  { pin: 5, labelKey: 'phase5.measurement.abs', kind: '24v' },
  { pin: 6, labelKey: 'phase5.measurement.canH', kind: 'can' },
  { pin: 7, labelKey: 'phase5.measurement.canL', kind: 'can' },
];
const iso12098Rows: readonly MeasurementRow[] = [
  { pin: 1, labelKey: 'phase5.measurement.leftSignal', kind: 'pulse' },
  { pin: 2, labelKey: 'phase5.measurement.rightSignal', kind: 'pulse' },
  { pin: 3, labelKey: 'phase5.measurement.rearFog', kind: '24v' },
  { pin: 4, labelKey: 'phase5.measurement.chassis', kind: 'gnd' },
  { pin: 5, labelKey: 'phase5.measurement.leftPark', kind: '24v' },
  { pin: 6, labelKey: 'phase5.measurement.rightPark', kind: '24v' },
  { pin: 7, labelKey: 'phase5.measurement.stop', kind: '24v' },
  { pin: 8, labelKey: 'phase5.measurement.reverse', kind: '24v' },
  { pin: 9, labelKey: 'phase5.measurement.continuous24', kind: '24v' },
  { pin: 10, labelKey: 'phase5.measurement.lining', kind: 'conditional' },
  { pin: 11, labelKey: 'phase5.measurement.brakeSystem', kind: 'conditional' },
  { pin: 12, labelKey: 'phase5.measurement.axle', kind: 'conditional' },
  { pin: 13, labelKey: 'phase5.measurement.chassis', kind: 'gnd' },
  { pin: 14, labelKey: 'phase5.measurement.canH', kind: 'can' },
  { pin: 15, labelKey: 'phase5.measurement.canL', kind: 'can' },
];

function valueForKind(kind: MeasurementRow['kind'], development: boolean, t: ReturnType<typeof useI18n>['t']): string {
  if (!development) return '--';
  if (kind === 'pulse') return t('phase5.measurement.pulse24');
  if (kind === 'gnd') return t('phase5.measurement.ground');
  if (kind === 'can') return t('phase5.measurement.can');
  if (kind === 'conditional') return t('phase5.common.conditional');
  return '24 V';
}

export function VoltageMeasurementScreen({
  iso,
  onConditionalPin,
  onSave,
}: {
  readonly iso: '7638' | '12098';
  readonly onConditionalPin?: (pin: 10 | 11 | 12) => void;
  readonly onSave: () => void;
}) {
  const { t } = useI18n();
  const development = isVisualDevelopment();
  const rows = iso === '7638' ? iso7638Rows : iso12098Rows;
  const activePin = iso === '7638' ? 1 : 3;
  const activeRow = rows.find(({ pin }) => pin === activePin)!;

  return (
    <section className="p5-live" data-screen={iso === '7638' ? '06-iso7638-live' : '08-iso12098-live'}>
      <header className="p5-live__test-head">
        <div className="p5-live__side">{t('phase5.selection.tractorSide')}</div>
        <img src={assetUrl(iso === '7638' ? 'iso7638-socket.png' : 'iso12098-socket.png')} alt="" aria-hidden="true" />
        <h1><span>ISO {iso}</span><span>{t('phase5.selection.voltageTest')}</span></h1>
        <span className="p5-live__active">{t('phase5.common.testActive')}</span>
      </header>

      <section className="p5-active-measurement">
        <h2>{t('phase5.common.activeMeasurement')}</h2>
        <div>
          <p><strong>{t('phase5.common.pin')} {activePin}</strong><span>{t(activeRow.labelKey)}</span></p>
          <output>{development ? '24V' : '--'}</output>
          <span className="p5-ok">{development ? t('phase5.common.ok') : '—'}</span>
        </div>
      </section>

      <h2 className="p5-live__all">{t('phase5.common.allLines')}</h2>
      <div className={iso === '12098' ? 'p5-channel-table p5-channel-table--15' : 'p5-channel-table'}>
        {rows.map((row) => (
          <div className={row.pin === activePin ? 'p5-channel-row is-active' : 'p5-channel-row'} key={row.pin}>
            <span className="p5-channel-row__pin">{t('phase5.common.pin')}{row.pin}</span>
            <span>{t(row.labelKey)}</span>
            <span className="p5-channel-row__state">{row.pin === activePin && development ? '✓' : '·'}</span>
            <span>{valueForKind(row.kind, development, t)}</span>
            {row.kind === 'conditional' && onConditionalPin ? (
              <button data-action={'validate-pin-' + row.pin} type="button" onClick={() => onConditionalPin(row.pin as 10 | 11 | 12)}>›</button>
            ) : <span className="p5-channel-row__toggle" />}
          </div>
        ))}
      </div>
      {iso === '12098' ? <p className="p5-live__note">{t('phase5.measurement.note')}</p> : null}
      <button className="p5-save-bar" data-action="save-result" type="button" onClick={onSave}>
        <img src={assetUrl('save1.svg')} alt="" aria-hidden="true" />{t('phase5.common.saveToReport')}
      </button>
    </section>
  );
}

const validationContent = {
  10: { title: 'phase5.validation.pin10Title', body: 'phase5.validation.pin10Body', warning: 'phase5.validation.genericWarning', check: 'phase5.validation.pin10Check' },
  11: { title: 'phase5.validation.pin11Title', body: 'phase5.validation.pin11Body', warning: 'phase5.validation.genericWarning', check: 'phase5.validation.pin11Check' },
  12: { title: 'phase5.validation.pin12Title', body: 'phase5.validation.pin12Body', warning: 'phase5.validation.pin12Warning', check: 'phase5.validation.pin12Check' },
} as const satisfies Record<10 | 11 | 12, Record<string, TranslationKey>>;

export function ConditionalValidationModal({
  pin,
  onUnavailable,
  onConfirm,
}: {
  readonly pin: 10 | 11 | 12;
  readonly onUnavailable: () => void;
  readonly onConfirm: () => void;
}) {
  const { t } = useI18n();
  const [confirmed, setConfirmed] = useState(false);
  const copy = validationContent[pin];
  return (
    <div className="p5-modal-layer p5-modal-layer--safety" data-overlay={'pin-' + pin + '-validation'}>
      <section className="p5-validation" role="dialog" aria-modal="true">
        <div className="p5-validation__warning-icon">!</div>
        <h2>{t(copy.title)}</h2>
        <p className="p5-validation__body">{t(copy.body)}</p>
        <div className="p5-validation__warning">{t(copy.warning)}</div>
        <label className="p5-validation__check">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
          <span>{t(copy.check)}</span>
        </label>
        <div className="p5-validation__actions">
          <button type="button" onClick={onUnavailable}>{t('phase5.common.functionUnavailable')}</button>
          <button data-action="confirm-validation" type="button" disabled={!confirmed} onClick={onConfirm}>{t('phase5.common.confirmAndStart')}</button>
        </div>
        <p className="p5-validation__footer">{t('phase5.validation.footer')}</p>
      </section>
    </div>
  );
}
