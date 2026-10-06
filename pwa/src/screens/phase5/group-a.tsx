import React, { useEffect, useMemo, useState, type FormEvent } from 'react';
import { assetUrl } from '../../assets';
import { useI18n, type TranslationKey } from '../../i18n';
import type { JsonObject } from '../../services/contracts';
import { useFirmwareSnapshot } from '../../services/runtime-react';
import { activePinForMode, voltageForPin } from '../../services/view';

function isVisualDevelopment(): boolean {
  const meta = import.meta as ImportMeta & { readonly env?: { readonly DEV?: boolean } };
  return meta.env?.DEV === true;
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

export function NewVehicleRecordScreen({ onSave }: { readonly onSave: (request: JsonObject) => void | Promise<void> }) {
  const { formatDate, t } = useI18n();
  const [tractorSelected, setTractorSelected] = useState(true);
  const [trailerSelected, setTrailerSelected] = useState(true);
  const visualPreview =
    typeof window !== 'undefined' &&
    (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') &&
    new URLSearchParams(window.location.search).get('visual') === '1';
  const [tractorPlate, setTractorPlate] = useState('');
  const [tractorChassis, setTractorChassis] = useState('');
  const [trailerPlate, setTrailerPlate] = useState('');
  const [trailerFleet, setTrailerFleet] = useState('');
  const [trailerChassis, setTrailerChassis] = useState('');
  const [connectionType, setConnectionType] = useState<'iso12098' | '2x7'>('iso12098');

  const canSubmit = useMemo(() => {
    if (visualPreview) return true;
    const tractorIdentified = !tractorSelected || Boolean(tractorPlate.trim() || tractorChassis.trim());
    const trailerIdentified = !trailerSelected || Boolean(trailerPlate.trim() || trailerFleet.trim() || trailerChassis.trim());
    return (tractorSelected || trailerSelected) && tractorIdentified && trailerIdentified;
  }, [visualPreview, tractorSelected, trailerSelected, tractorPlate, tractorChassis, trailerPlate, trailerFleet, trailerChassis]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const valueOf = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement | null)?.value.trim() ?? '';

    const tractorIdentified =
      !tractorSelected || Boolean(valueOf('tractorPlate') || valueOf('tractorChassis'));
    const trailerIdentified =
      !trailerSelected || Boolean(valueOf('trailerPlate') || valueOf('trailerFleet') || valueOf('trailerChassis'));

    if ((tractorSelected || trailerSelected) && tractorIdentified && trailerIdentified) {
      const request: JsonObject = {
        customerName: valueOf('customerName'),
        technicianId: valueOf('technicianId'),
        tractorPlate: valueOf('tractorPlate'),
        tractorChassis: valueOf('tractorChassis'),
        trailerPlate: valueOf('trailerPlate'),
        fleetOrTrailerNo: valueOf('trailerFleet'),
        trailerChassis: valueOf('trailerChassis'),
        vehicleSideContext:
          tractorSelected && trailerSelected
            ? 'tractor+trailer'
            : tractorSelected
              ? 'tractor'
              : 'trailer',
        trailerConnectionType: connectionType,
      };
      void onSave(request);
    }
  }

  return (
    <form className="p5-form" data-screen="03-new-vehicle" onSubmit={submit}>
      <div className="p5-form__heading">
        <div><h1>{t('phase5.form.title')}</h1><p>{t('phase5.form.subtitle')}</p></div>
        <time>{formatDate(visualPreview ? new Date('2026-08-18T12:00:00Z') : new Date(), { day: '2-digit', month: '2-digit', year: 'numeric' })}</time>
      </div>

      <Field label={t('phase5.form.customerCompany')}><input name="customerName" placeholder={t('phase5.form.customerPlaceholder')} /></Field>
      <Field label={t('phase5.form.technician')}>
        <select name="technicianId" defaultValue=""><option value="" disabled>{t('phase5.form.technicianSelect')}</option><option value="">—</option></select>
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
          <input data-field="tractor-plate" name="tractorPlate" placeholder="34 ABC 123" value={tractorPlate} onChange={(event) => setTractorPlate(event.target.value)} />
        </Field>
        <Field label={t('phase5.form.tractorChassis')}>
          <input name="tractorChassis" placeholder={t('phase5.common.optional')} value={tractorChassis} onChange={(event) => setTractorChassis(event.target.value)} />
        </Field>
      </div>
      <div className="p5-form__pair">
        <Field label={t('phase5.form.trailerPlate')}>
          <input data-field="trailer-plate" name="trailerPlate" placeholder={t('phase5.form.trailerPlatePlaceholder')} value={trailerPlate} onChange={(event) => setTrailerPlate(event.target.value)} />
        </Field>
        <Field label={t('phase5.form.fleetTrailerNo')}>
          <input name="trailerFleet" placeholder={t('phase5.common.optional')} value={trailerFleet} onChange={(event) => setTrailerFleet(event.target.value)} />
        </Field>
      </div>
      <Field label={t('phase5.form.trailerChassis')}>
        <input name="trailerChassis" placeholder={t('phase5.common.optional')} value={trailerChassis} onChange={(event) => setTrailerChassis(event.target.value)} />
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
  context = 'entry',
  onClose,
  onInspect,
  onRetest,
  searchRecords,
}: {
  readonly context?: 'entry' | 'reports';
  readonly onClose: () => void;
  readonly onInspect?: (recordId: string) => void | Promise<void>;
  readonly onRetest?: (recordId: string) => void | Promise<void>;
  readonly searchRecords?: (query?: Readonly<Record<string, string>>) => Promise<JsonObject>;
}) {
  const { t } = useI18n();
  const development = isVisualDevelopment();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [liveRecords, setLiveRecords] = useState<readonly JsonObject[]>([]);
  const [loading, setLoading] = useState(Boolean(searchRecords));

  const previewRecords: readonly JsonObject[] = development
    ? [
        { id: 'dev-1', companyName: 'ABC LOJİSTİK', trailerConnectionType: 'iso12098', tractorPlate: '34 ABC 123', trailerPlate: '34 DRS 456', updatedAt: '18.08.2026', status: 'completed' },
        { id: 'dev-2', companyName: 'ÖRNEK TAŞIMACILIK', trailerConnectionType: '2x7', tractorPlate: '16 TRK 908', fleetOrTrailerNo: 'Filo 27', updatedAt: '17.08.2026', status: 'completed' },
      ]
    : [];

  useEffect(() => {
    if (!searchRecords) {
      setLiveRecords(previewRecords);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      const value = query.trim();
      const apiKey =
        filter === 'customer' ? 'customer'
          : filter === 'tractor' ? 'tractorPlate'
            : filter === 'trailer' ? 'trailerPlate'
              : filter === 'chassis' ? 'chassis'
                : filter === 'fleet' ? 'fleetOrTrailerNo'
                  : null;
      const params: Record<string, string> = { limit: '20' };
      if (apiKey && value) params[apiKey] = value;

      setLoading(true);
      void searchRecords(params)
        .then((result) => {
          if (cancelled) return;
          const records = result.records;
          const parsed = Array.isArray(records)
            ? records.filter((item): item is JsonObject => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
            : [];

          if (filter === 'all' && value) {
            const needle = value.toLocaleLowerCase();
            setLiveRecords(parsed.filter((record) =>
              [
                'customerName','companyName','tractorPlate','trailerPlate',
                'tractorChassis','trailerChassis','fleetOrTrailerNo',
              ].some((key) => {
                const field = record[key];
                return typeof field === 'string' && field.toLocaleLowerCase().includes(needle);
              }),
            ));
          } else {
            setLiveRecords(parsed);
          }
        })
        .catch(() => {
          if (!cancelled) setLiveRecords([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filter, query, searchRecords]);

  const filters: ReadonlyArray<readonly [string, TranslationKey]> = [
    ['all', 'phase5.records.all'],
    ['customer', 'phase5.records.customer'],
    ['tractor', 'phase5.records.tractorPlate'],
    ['trailer', 'phase5.records.trailerPlate'],
    ['chassis', 'phase5.records.chassisNo'],
    ['fleet', 'phase5.records.fleetTrailerNo'],
  ];

  return (
    <div className="p5-modal-layer" data-overlay={context === 'reports' ? '40-old-record-search-alt' : 'old-record-search'}>
      <section className="p5-record-modal" role="dialog" aria-modal="true" aria-labelledby="record-search-title">
        <button className="p5-modal-close" aria-label={t('navigation.back')} type="button" onClick={onClose}>×</button>
        <h2 id="record-search-title">{context === 'reports' ? t('phase5.reports.searchTitle') : t('phase5.records.title')}</h2>
        <p className="p5-record-modal__subtitle">{context === 'reports' ? t('phase5.reports.searchSubtitle') : t('phase5.records.subtitle')}</p>
        <label className="p5-search">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label={t('phase5.records.searchPlaceholder')}
            placeholder={t('phase5.records.searchPlaceholder')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <h3>{t('phase5.records.filter')}</h3>
        <div className="p5-filter-chips">
          {filters.map(([id, key]) => (
            <button className={filter === id ? 'is-selected' : ''} type="button" key={id} onClick={() => setFilter(id)}>
              {t(key)}
            </button>
          ))}
        </div>
        <h3 className="p5-record-modal__found">{t('phase5.records.foundRecords')}</h3>
        <div className="p5-record-list">
          {loading ? <p className="p5-record-modal__hint">…</p> : null}
          {!loading && liveRecords.map((record, index) => {
            const recordId = typeof record.id === 'string' ? record.id : 'record-' + index;
            const name =
              typeof record.companyName === 'string' && record.companyName
                ? record.companyName
                : typeof record.customerName === 'string' && record.customerName
                  ? record.customerName
                  : '—';
            const connection = typeof record.trailerConnectionType === 'string' ? record.trailerConnectionType : '';
            const tag = connection === '2x7' ? '2×7 PIN' : connection ? '15 PIN' : '—';
            const tractor = typeof record.tractorPlate === 'string' && record.tractorPlate ? record.tractorPlate : '—';
            const trailer =
              typeof record.trailerPlate === 'string' && record.trailerPlate
                ? record.trailerPlate
                : typeof record.fleetOrTrailerNo === 'string' && record.fleetOrTrailerNo
                  ? record.fleetOrTrailerNo
                  : '—';
            const meta = [
              typeof record.updatedAt === 'string' ? record.updatedAt : '',
              typeof record.status === 'string' ? record.status : '',
            ].filter(Boolean).join(' • ');

            return (
              <article className="p5-record-card" key={recordId}>
                <div className="p5-record-card__head"><strong>{name}</strong><span>{tag}</span></div>
                <div className="p5-record-card__vehicles">
                  <span>{t('phase5.form.tractor')}: {tractor}</span>
                  <span>{t('phase5.form.trailer')}: {trailer}</span>
                </div>
                <small>{meta || '—'}</small>
                <div className="p5-record-card__actions">
                  <button
                    data-action="inspect-report-record"
                    type="button"
                    disabled={!onInspect}
                    onClick={() => {
                      if (onInspect) void onInspect(recordId);
                    }}
                  >
                    {t('phase5.records.inspectReport')}
                  </button>
                  <button
                    data-action="retest-record"
                    type="button"
                    disabled={!onRetest}
                    onClick={() => {
                      if (onRetest) void onRetest(recordId);
                    }}
                  >
                    {t('phase5.records.retest')}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        <p className="p5-record-modal__hint">{t('phase5.records.narrowHint')}</p>
      </section>
    </div>
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

export function VoltagePreflightModal({
  onCancel,
  onConfirm,
}: {
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="p5-modal-layer p5-modal-layer--voltage" data-overlay="iso7638-voltage-preflight">
      <section className="p5-voltage-preflight" role="dialog" aria-modal="true" aria-labelledby="iso7638-preflight-title">
        <div className="p5-voltage-preflight__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13.6 2.5 6.8 13h4.8l-1.2 8.5L17.2 11h-4.8l1.2-8.5Z" />
          </svg>
        </div>
        <div className="p5-voltage-preflight__copy">
          <span>ISO 7638</span>
          <h2 id="iso7638-preflight-title">{t('phase5.selection.voltageTest')}</h2>
          <p>{t('phase5.selection.connectConnector', { pins: 7 })}</p>
        </div>

        <div className="p5-voltage-preflight__socket">
          <strong>1</strong>
          <span>{t('phase5.selection.numberedSocket')}</span>
        </div>

        <div className="p5-voltage-preflight__ignition">
          <span aria-hidden="true">!</span>
          <p>{t('phase5.selection.thenIgnition')}</p>
        </div>

        <div className="p5-voltage-preflight__actions">
          <button type="button" onClick={onCancel}>{t('navigation.back')}</button>
          <button data-action="confirm-iso7638-preflight" type="button" onClick={onConfirm}>{t('phase5.common.confirmAndStart')}</button>
        </div>
      </section>
    </div>
  );
}

export function Iso7638VoltageScreen({
  onBack,
  onHome,
}: {
  readonly onBack: () => void;
  readonly onHome: () => void;
}) {
  const { t } = useI18n();
  const development = isVisualDevelopment();
  const visualPreview =
    development ||
    (typeof window !== 'undefined' &&
      (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') &&
      new URLSearchParams(window.location.search).get('visual') === '1');
  const firmware = useFirmwareSnapshot();
  const mode = 'iso7638_voltage';
  const activePin = activePinForMode(firmware, mode) ?? (visualPreview ? 1 : null);
  const activeRow = activePin === null ? null : iso7638Rows.find(({ pin }) => pin === activePin) ?? null;
  const activeVoltage = activePin === null ? null : voltageForPin(firmware, mode, activePin);

  const displayVoltage =
    activeVoltage
      ? activeVoltage.value.toFixed(2) + ' ' + activeVoltage.unit
      : visualPreview
        ? '24.00 V'
        : '—';

  return (
    <section className="p5-voltage-page" data-screen="06-iso7638-live">
      <header className="p5-voltage-page__top">
        <button className="p5-voltage-page__nav" data-action="exit-voltage-back" type="button" onClick={onBack} aria-label={t('navigation.back')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m14.5 5-7 7 7 7" />
            <path d="M8 12h11" />
          </svg>
        </button>

        <div className="p5-voltage-page__title">
          <span>{t('phase5.selection.tractorSide')}</span>
          <h1>ISO 7638</h1>
          <p>{t('phase5.selection.voltageTest')}</p>
        </div>

        <button className="p5-voltage-page__nav" data-action="exit-voltage-home" type="button" onClick={onHome} aria-label={t('navigation.home')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m3.5 10.5 8.5-7 8.5 7" />
            <path d="M5.5 9.5V21h13V9.5" />
            <path d="M9.5 21v-6h5v6" />
          </svg>
        </button>
      </header>

      <section className="p5-voltage-page__hero">
        <div className="p5-voltage-page__hero-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13.6 2.5 6.8 13h4.8l-1.2 8.5L17.2 11h-4.8l1.2-8.5Z" />
          </svg>
        </div>
        <div className="p5-voltage-page__hero-copy">
          <small>{t('phase5.common.activeMeasurement')}</small>
          <strong>{activePin === null ? '—' : t('phase5.common.pin') + ' ' + activePin}</strong>
          <span>{activeRow ? t(activeRow.labelKey) : '—'}</span>
        </div>
        <output>{displayVoltage}</output>
        <span className={'p5-voltage-page__status' + ((activeVoltage?.valid || visualPreview) ? ' is-ok' : '')}>
          {(activeVoltage?.valid || visualPreview) ? t('phase5.common.ok') : t('phase5.common.testActive')}
        </span>
      </section>

      <section className="p5-voltage-page__lines">
        <div className="p5-voltage-page__section-head">
          <h2>{t('phase5.common.allLines')}</h2>
          <span>{t('phase5.common.testActive')}</span>
        </div>

        <div className="p5-voltage-page__grid">
          {iso7638Rows.map((row) => {
            const live = voltageForPin(firmware, mode, row.pin);
            const passed = Boolean(live?.valid || (visualPreview && row.pin <= 5));
            const active = row.pin === activePin;
            return (
              <article className={'p5-voltage-line' + (active ? ' is-active' : '') + (passed ? ' is-passed' : '')} key={row.pin}>
                <div className="p5-voltage-line__pin">
                  <span>{t('phase5.common.pin')}</span>
                  <strong>{row.pin}</strong>
                </div>
                <div className="p5-voltage-line__copy">
                  <strong>{t(row.labelKey)}</strong>
                  <span>{row.kind === 'gnd' ? t('phase5.measurement.ground') : row.kind === 'can' ? t('phase5.measurement.can') : '24V'}</span>
                </div>
                <output>{live ? live.value.toFixed(2) + ' ' + live.unit : valueForKind(row.kind, visualPreview, t)}</output>
                <i aria-hidden="true">{passed ? '✓' : ''}</i>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}

export function VoltageExitModal({
  onCancel,
  onDiscard,
  onSave,
}: {
  readonly onCancel: () => void;
  readonly onDiscard: () => void;
  readonly onSave: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [saving, setSaving] = useState(false);

  async function saveAndExit() {
    if (saving) return;
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p5-modal-layer p5-modal-layer--voltage" data-overlay="iso7638-voltage-exit">
      <section className="p5-voltage-exit" role="dialog" aria-modal="true">
        <div className="p5-voltage-exit__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2.5h8l4 4V21.5H6zM14 2.5v4h4M9 11h6M9 15h6M9 18h4" />
          </svg>
        </div>

        <h2>{t('phase5.commonSave.title')}</h2>
        <p>{t('phase5.commonSave.subtitle')}</p>

        {!confirmDiscard ? (
          <div className="p5-voltage-exit__actions">
            <button type="button" onClick={onCancel}>{t('phase5.commonSave.returnToTest')}</button>
            <button data-action="discard-voltage-result" type="button" onClick={() => setConfirmDiscard(true)}>{t('phase5.commonSave.exitWithoutSave')}</button>
            <button data-action="save-voltage-result" type="button" disabled={saving} onClick={saveAndExit}>{t('phase5.commonSave.saveAndExit')}</button>
          </div>
        ) : (
          <div className="p5-voltage-exit__confirm">
            <div className="p5-voltage-exit__warning">
              <span aria-hidden="true">!</span>
              <strong>{t('phase5.commonSave.exitWithoutSave')}</strong>
            </div>
            <div className="p5-voltage-exit__confirm-actions">
              <button type="button" onClick={() => setConfirmDiscard(false)}>{t('phase5.commonSave.returnToTest')}</button>
              <button data-action="confirm-discard-voltage-result" type="button" onClick={onDiscard}>{t('phase5.commonSave.exitWithoutSave')}</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
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
  const visualPreview =
    development ||
    (typeof window !== 'undefined' &&
      (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') &&
      new URLSearchParams(window.location.search).get('visual') === '1');
  const firmware = useFirmwareSnapshot();
  const rows = iso === '7638' ? iso7638Rows : iso12098Rows;
  const mode = iso === '7638' ? 'iso7638_voltage' : 'iso12098_voltage';
  const liveActivePin = activePinForMode(firmware, mode);
  const activePin = liveActivePin ?? (visualPreview ? (iso === '7638' ? 1 : 3) : null);
  const activeRow = activePin === null ? null : rows.find(({ pin }) => pin === activePin) ?? null;
  const activeVoltage = activePin === null ? null : voltageForPin(firmware, mode, activePin);

  return (
    <section className={iso === '12098' ? 'p5-live p5-live--12098' : 'p5-live'} data-screen={iso === '7638' ? '06-iso7638-live' : '08-iso12098-live'}>
      <header className="p5-live__test-head">
        <div className="p5-live__side">{t('phase5.selection.tractorSide')}</div>
        <img src={assetUrl(iso === '7638' ? 'iso7638-socket.png' : 'iso12098-socket.png')} alt="" aria-hidden="true" />
        <h1><span>ISO {iso}</span><span>{t('phase5.selection.voltageTest')}</span></h1>
        <span className="p5-live__active">{t('phase5.common.testActive')}</span>
      </header>

      <section className="p5-active-measurement">
        <h2>{t('phase5.common.activeMeasurement')}</h2>
        <div>
          <p><strong>{activePin === null ? '—' : t('phase5.common.pin') + ' ' + activePin}</strong><span>{activeRow ? t(activeRow.labelKey) : '—'}</span></p>
          <output>{activeVoltage ? activeVoltage.value.toFixed(2) + ' ' + activeVoltage.unit : visualPreview ? '24V' : '--'}</output>
          <span className="p5-ok">{activeVoltage ? (activeVoltage.valid ? t('phase5.common.ok') : '—') : visualPreview ? t('phase5.common.ok') : '—'}</span>
        </div>
      </section>

      <h2 className="p5-live__all">{t('phase5.common.allLines')}</h2>
      <div className={iso === '12098' ? 'p5-channel-table p5-channel-table--15' : 'p5-channel-table'}>
        {rows.map((row) => {
          const live = voltageForPin(firmware, mode, row.pin);
          const previewPassed = visualPreview && (iso === '12098' ? row.pin <= 4 : row.pin === activePin);
          const rowPassed = Boolean(live?.valid || previewPassed);
          return (
          <div className={`${row.pin === activePin ? 'p5-channel-row is-active' : 'p5-channel-row'}${rowPassed ? ' is-passed' : ''}`} key={row.pin}>
            <span className="p5-channel-row__pin">{t('phase5.common.pin')}{row.pin}</span>
            <span>{t(row.labelKey)}</span>
            <span className="p5-channel-row__state">{rowPassed ? '✓' : ''}</span>
            <span>{live ? live.value.toFixed(2) + ' ' + live.unit : valueForKind(row.kind, visualPreview, t)}</span>
            {row.kind === 'conditional' && onConditionalPin ? (
              <button data-action={'validate-pin-' + row.pin} type="button" onClick={() => onConditionalPin(row.pin as 10 | 11 | 12)}>›</button>
            ) : <span className={`p5-channel-row__toggle${row.pin === activePin ? ' is-on' : ''}`}>{visualPreview ? (row.pin === activePin ? '✓' : '×') : ''}</span>}
          </div>
          );
        })}
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
