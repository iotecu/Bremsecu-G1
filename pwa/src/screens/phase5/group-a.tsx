import { useCarouselSwipe } from '../../components/swipe';
import { AssetImage } from '../../components/AssetImage';
import { isScreenTestBuild } from '../../screen-test/mode';
import React, { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { assetUrl } from '../../assets';
import { useI18n, type TranslationKey } from '../../i18n';
import type { MainCardIndex } from '../../navigation';
import type { JsonObject } from '../../services/contracts';
import { useFirmwareRuntime, useFirmwareSnapshot } from '../../services/runtime-react';
import { activePinForMode, voltageClassificationForPin, voltageForPin } from '../../services/view';

function isVisualDevelopment(): boolean {
  const meta = import.meta as ImportMeta & { readonly env?: { readonly DEV?: boolean } };
  return meta.env?.DEV === true || isScreenTestBuild();
}

export function LoginScreen({ onContinue }: { readonly onContinue: () => void }) {
  const { t } = useI18n();
  return (
    <section className="p5-login" data-screen="01-login">
      <AssetImage className="p5-login__background" src={assetUrl('login-background.webp')} alt="" aria-hidden="true" />
      <div className="p5-login__shade" />
      <AssetImage className="p5-login__tiger" src={assetUrl('tiger.png')} alt="" aria-hidden="true" />
      <AssetImage className="p5-login__logo" src={assetUrl('bremsecu-logo.png')} alt="Bremsecu" />
      <div className="p5-login__hotspot-ring"><AssetImage src={assetUrl('hotspot.png')} alt="" aria-hidden="true" /></div>
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
  onEnterTests,
}: {
  readonly onNewVehicle: () => void;
  readonly onOldRecord: () => void;
  readonly onEnterTests?: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="p5-entry" data-screen="02-vehicle-entry">
      <p className="p5-entry__eyebrow">{t('phase5.entry.testEntry')}</p>
      <button className="p5-entry__choice p5-entry__choice--new" data-action="new-vehicle" type="button" onClick={onNewVehicle}>
        <AssetImage src={assetUrl('tractor-icon.png')} alt="" aria-hidden="true" />
        <span>{t('phase5.entry.newVehicle')}</span>
      </button>
      <button className="p5-entry__choice p5-entry__choice--old" data-action="old-record" type="button" onClick={onOldRecord}>
        <AssetImage src={assetUrl('find.svg')} alt="" aria-hidden="true" />
        <span>{t('phase5.entry.existingRecord')}</span>
      </button>
      <button className="p5-entry__test-entry" data-action="enter-existing-tests" type="button" disabled={!onEnterTests} onClick={onEnterTests}>{t('phase5.entry.testEntry')}</button>
    </section>
  );
}

export function NewVehicleRecordScreen({ onSave }: { readonly onSave: (request: JsonObject) => void | Promise<void> }) {
  const { formatDate, t } = useI18n();
  const firmware = useFirmwareSnapshot();
  const technicians = Array.isArray(firmware.settings?.technicians)
    ? firmware.settings.technicians.filter((item): item is JsonObject => Boolean(item && typeof item === 'object' && !Array.isArray(item) && item.active === true && typeof item.id === 'string' && typeof item.name === 'string'))
    : [];
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
        <select name="technicianId" defaultValue=""><option value="" disabled>{t('phase5.form.technicianSelect')}</option><option value="">—</option>{technicians.map((technician) => <option key={String(technician.id)} value={String(technician.id)}>{String(technician.name)}</option>)}</select>
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
  const runtime = useFirmwareRuntime();
  const development = isVisualDevelopment() && !runtime;
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

const moduleTitleKeys = [
  'phase5.module.iso7638Voltage','phase5.module.iso12098Voltage','phase5.module.cable','phase5.module.canTermination',
  'phase5.module.lamp','phase5.module.reports','phase5.module.settings','phase5.module.battery',
] as const satisfies readonly TranslationKey[];
const moduleSideKeys = [
  'phase5.module.sideVoltage','phase5.module.sideVoltage','phase5.module.sideCable','phase5.module.sideTermination',
  'phase5.module.sideLamp','phase5.module.sideReport','phase5.module.sideSettings','phase5.module.sideBattery',
] as const satisfies readonly TranslationKey[];
const moduleAssets = [
  'iso7638-socket.webp','iso12098-socket.webp','cable-662-5072.png','resistance.svg',
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
      <button className="p5-carousel__arrow p5-carousel__arrow--left" aria-label={t('navigation.back')} type="button"  onClick={() => onMove(-1)}>‹</button>
      <div className="p5-selection" style={{ '--module-accent': moduleAccents[activeCardIndex] } as React.CSSProperties}>
        <div className="p5-selection__side">{isVoltage ? <AssetImage className="p5-side-vehicle" src={assetUrl('tractor-icon.png')} alt="" aria-hidden="true" /> : null}<span>{t(isVoltage ? 'phase5.selection.tractorSide' : moduleSideKeys[activeCardIndex])}</span></div>
        <article className="p5-selection__card">
          <AssetImage className="p5-selection__image" src={assetUrl(moduleAssets[activeCardIndex])} alt="" aria-hidden="true" />
          <h1>{t(moduleTitleKeys[activeCardIndex])}</h1>
          <button className="p5-start" data-action="start-test" type="button" disabled={!isVoltage} onClick={onStart}>{t('phase5.common.start')}</button>
        </article>
      </div>
      <button className="p5-carousel__arrow p5-carousel__arrow--right" aria-label={t('phase5.common.next')} type="button"  onClick={() => onMove(1)}>›</button>
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
  const runtime = useFirmwareRuntime();
  const development = isVisualDevelopment() && !runtime;
  const visualPreview =
    development ||
    (typeof window !== 'undefined' &&
      (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') &&
      new URLSearchParams(window.location.search).get('visual') === '1');
  const firmware = useFirmwareSnapshot();
  const rows = iso === '7638' ? iso7638Rows : iso12098Rows;
  const mode = iso === '7638' ? 'iso7638_voltage' : 'iso12098_voltage';
  const liveActivePin = activePinForMode(firmware, mode);
  const [focusedPin, setFocusedPin] = useState<number | null>(null);
  const activePin = focusedPin ?? liveActivePin ?? (visualPreview ? (iso === '7638' ? 1 : 3) : null);
  const activeRow = activePin === null ? null : rows.find(({ pin }) => pin === activePin) ?? null;
  const activeVoltage = activePin === null ? null : voltageForPin(firmware, mode, activePin);

  const activeClassification = activePin === null ? null : voltageClassificationForPin(firmware, mode, activePin);
  const failedRows = firmware.connection === 'open'
    ? rows.filter((row) => voltageClassificationForPin(firmware, mode, row.pin) === 'FAIL')
    : [];
  const failedPins = failedRows.map(({ pin }) => pin).join(',');
  const [acknowledgedPins, setAcknowledgedPins] = useState<readonly number[]>([]);
  const [inspectFailures, setInspectFailures] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // A recovered pin may alert again; active-pin changes and repeated telemetry
  // alone must never reopen an acknowledged failure.
  useEffect(() => {
    const current = failedPins.split(',').filter(Boolean).map(Number);
    setAcknowledgedPins((previous) => {
      const retained = previous.filter((pin) => current.includes(pin));
      return retained.length === previous.length ? previous : retained;
    });
    if (!current.length) setInspectFailures(false);
  }, [failedPins]);
  useEffect(() => {
    setAcknowledgedPins([]);
    setInspectFailures(false);
  }, [mode, firmware.latestTelemetry.test_started]);

  const hasBackgroundFailure = liveActivePin !== null && failedRows.some(({ pin }) => pin !== liveActivePin);
  const showFailureModal = hasBackgroundFailure && failedRows.some(({ pin }) => !acknowledgedPins.includes(pin));
  function acknowledgeFailures(inspect: boolean) {
    setAcknowledgedPins(failedRows.map(({ pin }) => pin));
    setInspectFailures(inspect);
    if (inspect) queueMicrotask(() => tableRef.current?.focus());
  }

  return (
    <section className={iso === '12098' ? 'p5-live p5-live--12098' : 'p5-live'} data-screen={iso === '7638' ? '06-iso7638-live' : '08-iso12098-live'}>
      <header className="p5-live__test-head">
        <div className="p5-live__side"><AssetImage src={assetUrl('tractor-icon.png')} alt="" aria-hidden="true" /><span>{t('phase5.selection.tractorSide')}</span></div>
        <AssetImage src={assetUrl(iso === '7638' ? 'iso7638-socket.webp' : 'iso12098-socket.webp')} alt="" aria-hidden="true" />
        <h1><span>ISO {iso}</span><span>{t('phase5.selection.voltageTest')}</span></h1>
        <span className="p5-live__active">{t('phase5.common.testActive')}</span>
      </header>

      <section className="p5-active-measurement">
        <h2>{t('phase5.common.activeMeasurement')}</h2>
        <div>
          <p><strong>{activePin === null ? '—' : t('phase5.common.pin') + ' ' + activePin}</strong><span>{activeRow ? t(activeRow.labelKey) : '—'}</span></p>
          <output>{activeVoltage ? activeVoltage.value.toFixed(2) + ' ' + activeVoltage.unit : visualPreview ? '24V' : '--'}</output>
          <span className={`p5-ok${activeClassification === 'FAIL' ? ' p5-ok--fail' : activeClassification === null && activeVoltage ? ' p5-ok--pending' : ''}`}>{(activeClassification === 'PASS' ? t('phase5.common.ok') : activeClassification === 'FAIL' ? t('phase5.pinFailures.fail') : null) ?? (activeVoltage ? t('phase5.pinFailures.pending') : visualPreview ? t('phase5.common.ok') : '—')}</span>
        </div>
      </section>

      <h2 className="p5-live__all">{t('phase5.common.allLines')}</h2>
      <div ref={tableRef} tabIndex={-1} aria-label={t('phase5.common.allLines')} className={`${iso === '12098' ? 'p5-channel-table p5-channel-table--15' : 'p5-channel-table'}${inspectFailures ? ' is-inspecting-failures' : ''}`}>
        {rows.map((row) => {
          const live = voltageForPin(firmware, mode, row.pin);
          const previewPassed = visualPreview && (iso === '12098' ? row.pin <= 4 : row.pin === activePin);
          const classification = voltageClassificationForPin(firmware, mode, row.pin);
          const rowPassed = classification === 'PASS' || (!live && previewPassed);
          const rowFailed = classification === 'FAIL';
          return (
          <div className={`${row.pin === activePin ? 'p5-channel-row is-active' : 'p5-channel-row'}${rowPassed ? ' is-passed' : ''}${rowFailed ? ' is-failed' : ''}`} key={row.pin}>
            <span className="p5-channel-row__pin">{t('phase5.common.pin')}{row.pin}</span>
            <span>{t(row.labelKey)}</span>
            <span className="p5-channel-row__state">{rowFailed ? t('phase5.pinFailures.fail') : rowPassed ? '✓' : ''}</span>
            <span>{live ? live.value.toFixed(2) + ' ' + live.unit : valueForKind(row.kind, visualPreview, t)}</span>
            {row.kind === 'conditional' && onConditionalPin ? (
              <button data-action={'validate-pin-' + row.pin} type="button" onClick={() => onConditionalPin(row.pin as 10 | 11 | 12)}>›</button>
            ) : <button className={`p5-channel-row__toggle${row.pin === activePin ? ' is-on' : ''}`} type="button" aria-label={t('phase5.common.activeMeasurement') + ' ' + t('phase5.common.pin') + row.pin} aria-pressed={row.pin === activePin} onClick={() => setFocusedPin(row.pin === focusedPin ? null:row.pin)}>{row.pin === activePin ? '✓':'×'}</button>}
          </div>
          );
        })}
      </div>
      {iso === '12098' ? <p className="p5-live__note">{t('phase5.measurement.note')}</p> : null}
      {failedRows.length > 0 ? (
        <button className="p5-failure-summary" type="button" onClick={() => { if (hasBackgroundFailure) setAcknowledgedPins([]); else { setInspectFailures(true); tableRef.current?.focus(); } }}>
          {t('phase5.pinFailures.summary', { count: failedRows.length })}
        </button>
      ) : null}
      {showFailureModal ? (
        <PinFailureModal
          iso={iso}
          activePin={liveActivePin!}
          activeLabel={activeRow ? t(activeRow.labelKey) : '—'}
          failures={failedRows.map((row) => ({ pin: row.pin, label: t(row.labelKey), reading: voltageForPin(firmware, mode, row.pin) }))}
          onContinue={() => acknowledgeFailures(false)}
          onInspect={() => acknowledgeFailures(true)}
        />
      ) : null}
      <button className="p5-save-bar" data-action="save-result" type="button" onClick={onSave}>
        <AssetImage src={assetUrl('save1.svg')} alt="" aria-hidden="true" />{t('phase5.common.saveToReport')}
      </button>
    </section>
  );
}

function PinFailureModal({ iso, activePin, activeLabel, failures, onContinue, onInspect }: {
  readonly iso: '7638' | '12098';
  readonly activePin: number;
  readonly activeLabel: string;
  readonly failures: readonly { pin: number; label: string; reading: { value: number; unit: string } | null }[];
  readonly onContinue: () => void;
  readonly onInspect: () => void;
}) {
  const { t, formatNumber } = useI18n();
  const dialogRef = useRef<HTMLElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    continueRef.current?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);

  return (
    <div className="p5-pin-failure-layer" data-overlay="pin-failures">
      <section ref={dialogRef} className="p5-pin-failure-modal" role="alertdialog" aria-modal="true" aria-labelledby="pin-failure-title" aria-describedby="pin-failure-description"
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onContinue(); }
          if (event.key === 'Tab') {
            const controls = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button');
            if (!controls?.length) return;
            const first = controls[0]!; const last = controls[controls.length - 1]!;
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
          }
        }}>
        <h2 id="pin-failure-title">{t(failures.length > 1 ? 'phase5.pinFailures.title' : 'phase5.pinFailures.singleTitle')}</h2>
        <p className="p5-pin-failure-context"><bdi>ISO {iso}</bdi> · {t('phase5.common.activeMeasurement')}: <bdi>{t('phase5.common.pin')} {activePin}</bdi> — {activeLabel}</p>
        <p id="pin-failure-description">{t('phase5.pinFailures.description')}</p>
        <ul className="p5-pin-failure-list">
          {failures.map(({ pin, label, reading }) => (
            <li key={pin}>
              <div><strong><bdi>{t('phase5.common.pin')} {pin}</bdi> — {label}</strong>{reading ? <span><bdi>{formatNumber(reading.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {reading.unit}</bdi></span> : null}</div>
              <bdi className="p5-pin-failure-status">{t('phase5.pinFailures.fail')}</bdi>
            </li>
          ))}
        </ul>
        <div className="p5-pin-failure-actions">
          <button ref={continueRef} data-action="continue-pin-check" type="button" onClick={onContinue}>{t('phase5.pinFailures.continue')}</button>
          <button data-action="inspect-pin-failures" type="button" onClick={onInspect}>{t('phase5.pinFailures.inspect')}</button>
        </div>
      </section>
    </div>
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
