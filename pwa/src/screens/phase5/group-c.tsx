import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { assetUrl } from '../../assets';
import { useI18n, type TranslationKey } from '../../i18n';
import type { JsonObject } from '../../services/contracts';
import { shareTemporaryReportPdf } from '../../reports/share-report-pdf';
import { useFirmwareSnapshot } from '../../services/runtime-react';
import {
  loadCurrentForMode,
  objectField,
  stringField,
} from '../../services/view';

function isVisualDevelopment(): boolean {
  const meta = import.meta as ImportMeta & { readonly env?: { readonly DEV?: boolean } };
  return meta.env?.DEV === true;
}

const lampRows = [
  { pin: 1, key: 'phase5.measurement.leftSignal' },
  { pin: 2, key: 'phase5.measurement.rightSignal' },
  { pin: 3, key: 'phase5.measurement.rearFog' },
  { pin: 5, key: 'phase5.measurement.leftPark' },
  { pin: 6, key: 'phase5.measurement.rightPark' },
  { pin: 7, key: 'phase5.measurement.stop' },
  { pin: 8, key: 'phase5.measurement.reverse' },
] as const satisfies readonly { readonly pin: number; readonly key: TranslationKey }[];

export function LampMeasurementScreen({
  activeChannel,
  onBack,
  onHome,
  onToggleLamp,
  onToggleAxle,
}: {
  readonly activeChannel: number | 'axle' | null;
  readonly onBack: () => void;
  readonly onHome: () => void;
  readonly onToggleLamp: (pin: number) => void;
  readonly onToggleAxle: () => void;
}) {
  const { t } = useI18n();
  const development = isVisualDevelopment();
  const firmware = useFirmwareSnapshot();
  const currentMode = activeChannel === 'axle' ? 'axle_lift' : 'lamp_iso12098';
  const liveCurrent = activeChannel === null ? null : loadCurrentForMode(firmware, currentMode);

  const activeKey =
    typeof activeChannel === 'number'
      ? lampRows.find((row) => row.pin === activeChannel)?.key
      : activeChannel === 'axle'
        ? 'phase5.measurement.axle'
        : undefined;

  const currentDisplay =
    liveCurrent !== null
      ? Math.abs(liveCurrent) < 1
        ? Math.round(liveCurrent * 1000) + ' mA'
        : liveCurrent.toFixed(2) + ' A'
      : development && activeChannel !== null
        ? '300 mA'
        : '—';

  return (
    <section className="p5-lamp-page" data-screen="31-lamp-test-measurement">
      <header className="p5-voltage-page__top">
        <button className="p5-voltage-page__nav" data-action="exit-lamp-back" type="button" onClick={onBack} aria-label={t('navigation.back')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m14.5 5-7 7 7 7" />
            <path d="M8 12h11" />
          </svg>
        </button>

        <div className="p5-voltage-page__title">
          <span>{t('phase5.form.trailer')}</span>
          <h1>ISO 12098</h1>
          <p>{t('phase5.lamp.title')}</p>
        </div>

        <button className="p5-voltage-page__nav" data-action="exit-lamp-home" type="button" onClick={onHome} aria-label={t('navigation.home')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m3.5 10.5 8.5-7 8.5 7" />
            <path d="M5.5 9.5V21h13V9.5" />
            <path d="M9.5 21v-6h5v6" />
          </svg>
        </button>
      </header>

      <section className="p5-lamp-page__hero">
        <div className="p5-lamp-page__hero-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6" />
            <path d="M10 21h4" />
            <path d="M8.4 14.8A6 6 0 1 1 15.6 14.8C14.6 15.7 14 16.6 14 18h-4c0-1.4-.6-2.3-1.6-3.2Z" />
          </svg>
        </div>
        <div className="p5-lamp-page__hero-copy">
          <small>{t('phase5.common.activeMeasurement')}</small>
          <strong>
            {activeChannel === 'axle'
              ? t('phase5.measurement.axle')
              : typeof activeChannel === 'number'
                ? t('phase5.common.pin') + ' ' + activeChannel
                : '—'}
          </strong>
          <span>{activeKey ? t(activeKey) : t('phase5.lamp.oneAtATime')}</span>
        </div>
        <output>{currentDisplay}</output>
        <span className={'p5-lamp-page__status' + (activeChannel !== null ? ' is-active' : '')}>
          {activeChannel !== null ? t('phase5.lamp.outputOn') : t('phase5.lamp.outputOff')}
        </span>
      </section>

      <section className="p5-lamp-page__lines">
        <div className="p5-voltage-page__section-head">
          <h2>{t('phase5.lamp.channels')}</h2>
          <span>{t('phase5.lamp.oneAtATime')}</span>
        </div>

        <div className="p5-lamp-page__grid">
          {lampRows.map((row) => {
            const active = activeChannel === row.pin;
            return (
              <article className={'p5-lamp-row-new' + (active ? ' is-active' : '')} key={row.pin}>
                <div className="p5-lamp-row-new__pin">
                  <span>{t('phase5.common.pin')}</span>
                  <strong>{row.pin}</strong>
                </div>
                <div className="p5-lamp-row-new__copy">
                  <strong>{t(row.key)}</strong>
                  <span>{active ? currentDisplay : '— mA'}</span>
                </div>
                <button
                  aria-label={t(row.key)}
                  aria-pressed={active}
                  className={'p5-voltage-toggle' + (active ? ' is-on' : '')}
                  data-action={'toggle-lamp-pin-' + row.pin}
                  type="button"
                  onClick={() => onToggleLamp(row.pin)}
                >
                  <span aria-hidden="true" />
                </button>
              </article>
            );
          })}

          <article className={'p5-lamp-row-new p5-lamp-row-new--axle' + (activeChannel === 'axle' ? ' is-active' : '')}>
            <div className="p5-lamp-row-new__pin">
              <span>{t('phase5.common.pin')}</span>
              <strong>12</strong>
            </div>
            <div className="p5-lamp-row-new__copy">
              <strong>{t('phase5.measurement.axle')}</strong>
              <span>{activeChannel === 'axle' ? currentDisplay : '— mA'}</span>
            </div>
            <button
              aria-label={t('phase5.measurement.axle')}
              aria-pressed={activeChannel === 'axle'}
              className={'p5-voltage-toggle' + (activeChannel === 'axle' ? ' is-on' : '')}
              data-action="toggle-axle-lift"
              type="button"
              onClick={onToggleAxle}
            >
              <span aria-hidden="true" />
            </button>
          </article>
        </div>
      </section>
    </section>
  );
}

export function AxleLiftSafetyScreen({
  onCancel,
  onConfirm,
}: {
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  const { t } = useI18n();
  const [confirmed, setConfirmed] = useState(false);

  const modal = (
    <div className="p5-modal-layer p5-modal-layer--axle" data-overlay="axle-lift-safety">
      <section className="p5-axle-popup" data-screen="32-axle-lift-safety" role="dialog" aria-modal="true">
        <div className="p5-axle-popup__icon" aria-hidden="true">!</div>
        <h2>{t('phase5.axle.title')}</h2>
        <p>{t('phase5.axle.body')}</p>
        <div className="p5-axle-popup__warning">{t('phase5.axle.warning')}</div>
        <label className="p5-axle-popup__confirm">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
          <span>{t('phase5.axle.confirmation')}</span>
        </label>
        <div className="p5-axle-popup__actions">
          <button type="button" onClick={onCancel}>{t('phase5.axle.cancel')}</button>
          <button data-action="confirm-axle-safety" type="button" disabled={!confirmed} onClick={onConfirm}>{t('phase5.axle.confirm')}</button>
        </div>
      </section>
    </div>
  );

  return typeof document === 'undefined' ? modal : createPortal(modal, document.body);
}

export function LampExitModal({
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
    <div className="p5-modal-layer p5-modal-layer--voltage" data-overlay="lamp-exit">
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
            <button data-action="discard-lamp-result" type="button" onClick={() => setConfirmDiscard(true)}>{t('phase5.commonSave.exitWithoutSave')}</button>
            <button data-action="save-lamp-result" type="button" disabled={saving} onClick={saveAndExit}>{t('phase5.commonSave.saveAndExit')}</button>
          </div>
        ) : (
          <div className="p5-voltage-exit__confirm">
            <div className="p5-voltage-exit__warning">
              <span aria-hidden="true">!</span>
              <strong>{t('phase5.commonSave.exitWithoutSave')}</strong>
            </div>
            <div className="p5-voltage-exit__confirm-actions">
              <button type="button" onClick={() => setConfirmDiscard(false)}>{t('phase5.commonSave.returnToTest')}</button>
              <button data-action="confirm-discard-lamp-result" type="button" onClick={onDiscard}>{t('phase5.commonSave.exitWithoutSave')}</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function isReportVisualPreview(): boolean {
  if (typeof window === 'undefined') return false;
  const visualHost = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
  return visualHost && new URLSearchParams(window.location.search).get('visual') === '1';
}

function reportModeLabel(mode: string, t: (key: TranslationKey, vars?: Readonly<Record<string, string | number>>) => string): string {
  switch (mode) {
    case 'iso7638_voltage':
      return 'ISO 7638 ' + t('phase5.selection.voltageTest');
    case 'iso12098_voltage':
      return 'ISO 12098 ' + t('phase5.selection.voltageTest');
    case 'cable_iso7638':
      return 'ISO 7638 ' + t('phase5.cable.cableTest');
    case 'cable_iso12098':
      return 'ISO 12098 ' + t('phase5.cable.cableTest');
    case 'lamp_iso12098':
      return 'ISO 12098 ' + t('phase5.lamp.title');
    case 'axle_lift':
      return t('phase5.measurement.axle');
    case 'can_termination_iso7638_tractor':
      return 'ISO 7638 ' + t('phase5.termination.title') + ' · ' + t('phase5.form.tractor');
    case 'can_termination_iso7638_trailer':
      return 'ISO 7638 ' + t('phase5.termination.title') + ' · ' + t('phase5.form.trailer');
    case 'can_termination_iso12098_tractor':
      return 'ISO 12098 ' + t('phase5.termination.title') + ' · ' + t('phase5.form.tractor');
    case 'can_termination_iso12098_trailer':
      return 'ISO 12098 ' + t('phase5.termination.title') + ' · ' + t('phase5.form.trailer');
    default:
      return mode.replaceAll('_', ' ').toUpperCase();
  }
}

function reportTestState(test: JsonObject): 'success' | 'warning' | 'fail' | 'saved' {
  if (test.classificationFinal !== true) return 'saved';
  const status = typeof test.overallStatus === 'string' ? test.overallStatus.toUpperCase() : '';
  if (status === 'PASS' || status === 'SUCCESS' || status === 'OK') return 'success';
  if (status === 'WARN' || status === 'WARNING') return 'warning';
  if (status === 'FAIL' || status === 'FAILED' || status === 'ERROR') return 'fail';
  return 'saved';
}

export function ReportResultScreen({
  hasActiveRecord,
  onOldRecord,
  onSaveReport,
}: {
  readonly hasActiveRecord: boolean;
  readonly onOldRecord: () => void;
  readonly onSaveReport: () => void;
}) {
  const { t } = useI18n();
  const firmware = useFirmwareSnapshot();
  const visualPreview = isReportVisualPreview();
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState(false);

  const liveReport = hasActiveRecord ? firmware.report : null;
  const liveRecord = objectField(liveReport, 'record');
  const liveTestsValue = liveReport?.tests;
  const liveTests = Array.isArray(liveTestsValue)
    ? liveTestsValue.filter((item): item is JsonObject => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
    : [];

  const previewRecord: JsonObject | null = visualPreview && hasActiveRecord && !liveRecord
    ? {
        companyName: 'ABC LOJİSTİK',
        tractorPlate: '34 ABC 123',
        trailerPlate: '34 DRS 456',
        technicianId: 'Ahmet Yılmaz',
        createdAt: '18.08.2026',
        diagnosisNote: 'Elektrik sistemi kontrol edildi.',
        fee: '0,00',
      }
    : null;

  const previewTests: JsonObject[] = visualPreview && hasActiveRecord && liveTests.length === 0
    ? [
        { id: 'preview-1', mode: 'iso12098_voltage', overallStatus: 'PASS', classificationFinal: true },
        { id: 'preview-2', mode: 'cable_iso12098', overallStatus: 'PASS', classificationFinal: true },
        { id: 'preview-3', mode: 'iso7638_voltage', overallStatus: 'WARN', classificationFinal: true },
        { id: 'preview-4', mode: 'can_termination_iso12098_trailer', overallStatus: 'PASS', classificationFinal: true },
      ]
    : [];

  const reportRecord = liveRecord ?? previewRecord;
  const tests = liveTests.length > 0 ? liveTests : previewTests;
  const hasTests = tests.length > 0;
  const diagnosisNote = stringField(reportRecord, 'diagnosisNote') ?? '';
  const reportSaved = hasTests && diagnosisNote.trim().length > 0;
  const warningCount = tests.filter((item) => reportTestState(item) === 'warning').length;

  const customer =
    stringField(reportRecord, 'companyName') ??
    stringField(reportRecord, 'customerName') ??
    '—';
  const tractorPlate = stringField(reportRecord, 'tractorPlate') ?? '—';
  const trailerPlate = stringField(reportRecord, 'trailerPlate') ?? '—';
  const technician = stringField(reportRecord, 'technicianId') ?? '—';
  const createdAt = stringField(reportRecord, 'createdAt') ?? '—';

  async function shareReport() {
    if (!reportSaved || sharing) return;
    setSharing(true);
    setShareError(false);
    try {
      await shareTemporaryReportPdf({
        title: t('phase5.reports.title'),
        customer,
        tractorPlate,
        trailerPlate,
        technician,
        createdAt,
        diagnosis: diagnosisNote,
        fee: stringField(reportRecord, 'fee') ?? '0,00',
        tests: tests.map((item) => {
          const mode = stringField(item, 'mode') ?? '—';
          const state = reportTestState(item);
          const status =
            state === 'success'
              ? t('phase5.reports.success')
              : state === 'warning'
                ? t('phase5.reports.warning')
                : state === 'fail'
                  ? t('phase5.reports.failed')
                  : t('phase5.reports.savedResult');
          return { name: reportModeLabel(mode, t), status };
        }),
        labels: {
          customer: t('phase5.reports.customer'),
          tractor: t('phase5.form.tractor'),
          trailer: t('phase5.form.trailer'),
          technician: t('phase5.form.technician'),
          date: t('phase5.reports.date'),
          diagnosis: t('phase5.reportSave.diagnosisNote'),
          fee: t('phase5.reportSave.fee'),
          testResults: t('phase5.reports.testResults'),
        },
      });
    } catch {
      setShareError(true);
    } finally {
      setSharing(false);
    }
  }

  return (
    <section className="p5-report-page" data-screen="34-report-result">
      <header className="p5-report-page__head">
        <div>
          <span>{t('phase5.reports.activeRecord')}</span>
          <h1>{t('phase5.reports.title')}</h1>
          <p>{t('phase5.reports.subtitle')}</p>
        </div>
        <button data-action="open-report-old-record" type="button" onClick={onOldRecord}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6" />
            <path d="m16 16 4 4M8.5 11h5M11 8.5v5" />
          </svg>
          {t('phase5.reports.oldRecord')}
        </button>
      </header>

      {!hasActiveRecord ? (
        <section className="p5-report-empty">
          <div className="p5-report-empty__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3h9l3 3v15H6zM15 3v4h4M9 11h6M9 15h4" />
            </svg>
          </div>
          <h2>{t('phase5.reports.noActiveRecord')}</h2>
          <p>{t('phase5.reports.noActiveRecordHint')}</p>
          <button data-action="empty-report-old-record" type="button" onClick={onOldRecord}>{t('phase5.reports.oldRecord')}</button>
        </section>
      ) : (
        <>
          <section className="p5-report-summary">
            <span>{t('phase5.reports.activeRecord')}</span>
            <h2>{customer}</h2>
            <div className="p5-report-summary__plates">
              <span>{t('phase5.form.tractor')}: <strong>{tractorPlate}</strong></span>
              <i aria-hidden="true" />
              <span>{t('phase5.form.trailer')}: <strong>{trailerPlate}</strong></span>
            </div>
            <div className="p5-report-summary__counts">
              <strong>{t('phase5.reports.completedCount', { count: tests.length })}</strong>
              {warningCount > 0 ? <span>• {t('phase5.reports.warningCount', { count: warningCount })}</span> : null}
            </div>
            <div className="p5-report-summary__meta">
              <span>{createdAt}</span>
              <i aria-hidden="true" />
              <span>{technician}</span>
            </div>
          </section>

          <section className="p5-report-page__tests">
            <div className="p5-report-page__section-head">
              <h2>{t('phase5.reports.testResults')}</h2>
              <span>{tests.length}</span>
            </div>

            <div className="p5-report-test-list">
              {tests.map((item, index) => {
                const mode = stringField(item, 'mode') ?? '—';
                const id = stringField(item, 'id') ?? stringField(item, 'testId') ?? String(index + 1);
                const state = reportTestState(item);
                const stateLabel =
                  state === 'success'
                    ? t('phase5.reports.success')
                    : state === 'warning'
                      ? t('phase5.reports.warning')
                      : state === 'fail'
                        ? t('phase5.reports.failed')
                        : t('phase5.reports.savedResult');
                return (
                  <article className={'p5-report-test is-' + state} key={id}>
                    <strong>{reportModeLabel(mode, t)}</strong>
                    <span>{stateLabel}</span>
                  </article>
                );
              })}
              {!hasTests ? <p className="p5-report-page__no-tests">{t('phase5.reports.noCompletedTests')}</p> : null}
            </div>
          </section>

          <section className="p5-report-page__final">
            <h2>{t('phase5.reports.finalReport')}</h2>
            <div className="p5-report-page__actions">
              {hasTests ? (
                <button className="is-primary" data-action="open-report-save" type="button" onClick={onSaveReport}>
                  {reportSaved ? t('phase5.reports.editReport') : t('phase5.reports.createReport')}
                </button>
              ) : null}
              <button
                className="is-secondary"
                data-action="share-report"
                type="button"
                disabled={!reportSaved || sharing}
                onClick={() => { void shareReport(); }}
              >
                {sharing ? t('phase5.reports.sharing') : t('phase5.reports.share')}
              </button>
            </div>
            <p>{t('phase5.reports.pdfNote')}</p>
            {shareError ? <p className="p5-report-page__share-error" role="alert">{t('phase5.reports.shareError')}</p> : null}
          </section>
        </>
      )}
    </section>
  );
}

export function ReportSaveModal({
  onCancel,
  onSave,
}: {
  readonly onCancel: () => void;
  readonly onSave: (request: JsonObject) => void | Promise<void>;
}) {
  const { t } = useI18n();
  const firmware = useFirmwareSnapshot();
  const reportRecord = objectField(firmware.report, 'record');
  const [diagnosisNote, setDiagnosisNote] = useState(stringField(reportRecord, 'diagnosisNote') ?? '');
  const [fee, setFee] = useState(stringField(reportRecord, 'fee') ?? '0,00');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  async function save() {
    if (saving || diagnosisNote.trim().length === 0) return;
    setSaving(true);
    setSaveError(false);
    try {
      await onSave({ diagnosisNote: diagnosisNote.trim(), fee: fee.trim() || '0,00' });
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  const modal = (
    <div className="p5-modal-layer p5-modal-layer--report-save" data-overlay="35-report-save-modal">
      <section className="p5-report-save-new" role="dialog" aria-modal="true">
        <header>
          <h2>{t('phase5.reportSave.title')}</h2>
          <p>{t('phase5.reportSave.subtitle')}</p>
        </header>

        <label>
          <span>{t('phase5.reportSave.diagnosisNote')}</span>
          <textarea
            data-field="report-diagnosis"
            rows={7}
            placeholder={t('phase5.reportSave.diagnosisPlaceholder')}
            value={diagnosisNote}
            onChange={(event) => setDiagnosisNote(event.target.value)}
          />
        </label>

        <label>
          <span>{t('phase5.reportSave.fee')}</span>
          <div className="p5-report-save-new__fee">
            <input
              data-field="report-fee"
              inputMode="decimal"
              value={fee}
              onChange={(event) => setFee(event.target.value)}
            />
            <b>₺</b>
          </div>
        </label>

        {saveError ? <p className="p5-report-save-new__error" role="alert">{t('phase5.reportSave.saveError')}</p> : null}

        <div className="p5-report-save-new__actions">
          <button type="button" onClick={onCancel}>{t('phase5.reportSave.cancel')}</button>
          <button
            data-action="save-report-modal"
            type="button"
            disabled={saving || diagnosisNote.trim().length === 0}
            onClick={() => { void save(); }}
          >
            {saving ? t('phase5.reportSave.saving') : t('phase5.reportSave.save')}
          </button>
        </div>
      </section>
    </div>
  );

  return typeof document === 'undefined' ? modal : createPortal(modal, document.body);
}

export function CommonSaveModal({
  onReturn,
  onExitWithoutSave,
  onSaveAndExit,
}: {
  readonly onReturn: () => void;
  readonly onExitWithoutSave: () => void;
  readonly onSaveAndExit: (technicianNote: string) => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [technicianNote, setTechnicianNote] = useState('');

  return (
    <div className="p5-modal-layer" data-overlay="36-report-save-common-modal">
      <section className="p5-common-save" role="dialog" aria-modal="true">
        <h2>{t('phase5.commonSave.title')}</h2>
        <p>{t('phase5.commonSave.subtitle')}</p>
        <label>
          <span>{t('phase5.commonSave.technicianNote')}</span>
          <textarea
            rows={3}
            placeholder={t('phase5.commonSave.notePlaceholder')}
            value={technicianNote}
            onChange={(event) => setTechnicianNote(event.target.value)}
          />
        </label>
        <div className="p5-common-save__actions">
          <button
            data-action="save-and-exit"
            type="button"
            onClick={() => {
              void onSaveAndExit(technicianNote);
            }}
          >
            {t('phase5.commonSave.saveAndExit')}
          </button>
          <button data-action="exit-without-save" type="button" onClick={onExitWithoutSave}>
            {t('phase5.commonSave.exitWithoutSave')}
          </button>
          <button data-action="return-to-test" type="button" onClick={onReturn}>
            {t('phase5.commonSave.returnToTest')}
          </button>
        </div>
      </section>
    </div>
  );
}
