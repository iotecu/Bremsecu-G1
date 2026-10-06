import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { assetUrl } from '../../assets';
import { useI18n, type TranslationKey } from '../../i18n';
import type { JsonObject } from '../../services/contracts';
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
      <section className="p5-axle-popup" role="dialog" aria-modal="true">
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

export function ReportResultScreen({
  onRetest,
  onSaveReport,
}: {
  readonly onRetest: () => void;
  readonly onSaveReport: () => void;
}) {
  const { t } = useI18n();
  const development = isVisualDevelopment();
  const firmware = useFirmwareSnapshot();
  const reportRecord = objectField(firmware.report, 'record');
  const reportTests = firmware.report?.tests;
  const liveTests = Array.isArray(reportTests)
    ? reportTests.filter((item): item is JsonObject => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
    : [];
  const previewTests = development && liveTests.length === 0
    ? [
        ['ISO 7638', t('phase5.selection.voltageTest')],
        ['ISO 12098', t('phase5.cable.cableTest')],
      ]
    : [];

  return (
    <section className="p5-report-result" data-screen="34-report-result">
      <header className="p5-report-result__head">
        <img src={assetUrl('report-2.svg')} alt="" aria-hidden="true" />
        <div><h1>{t('phase5.reports.resultTitle')}</h1><p>{t('phase5.reports.activeRecord')}</p></div>
      </header>

      <section className="p5-report-record">
        <div><span>{t('phase5.reports.customer')}</span><strong>{stringField(reportRecord, 'companyName') ?? stringField(reportRecord, 'customerName') ?? (development ? 'ABC LOJİSTİK' : '—')}</strong></div>
        <div><span>{t('phase5.form.tractorPlate')}</span><strong>{stringField(reportRecord, 'tractorPlate') ?? (development ? '34 ABC 123' : '—')}</strong></div>
        <div><span>{t('phase5.form.trailerPlate')}</span><strong>{stringField(reportRecord, 'trailerPlate') ?? (development ? '34 DRS 456' : '—')}</strong></div>
      </section>

      <h2>{t('phase5.reports.completedTests')}</h2>
      <div className="p5-report-tests">
        {liveTests.length
          ? liveTests.map((item, index) => {
              const mode = stringField(item, 'mode') ?? stringField(item, 'testMode') ?? '—';
              const testId = stringField(item, 'testId') ?? String(index + 1);
              return <div key={testId}><strong>{mode}</strong><span>{testId}</span><b>{t('phase5.records.completed')}</b></div>;
            })
          : previewTests.length
            ? previewTests.map(([name, detail]) => (
                <div key={name}><strong>{name}</strong><span>{detail}</span><b>{t('phase5.records.completed')}</b></div>
              ))
            : <p>{t('phase5.reports.noCompletedTests')}</p>}
      </div>

      <div className="p5-report-actions">
        <button data-action="retest-report" type="button" onClick={onRetest}>{t('phase5.reports.retest')}</button>
        <button data-action="open-report-save" type="button" onClick={onSaveReport}>{t('phase5.reports.createReport')}</button>
      </div>
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
  const [diagnosisNote, setDiagnosisNote] = useState('');
  const [serviceNote, setServiceNote] = useState('');
  const [fee, setFee] = useState('');

  return (
    <div className="p5-modal-layer" data-overlay="35-report-save-modal">
      <section className="p5-report-save" role="dialog" aria-modal="true">
        <h2>{t('phase5.reportSave.title')}</h2>
        <p>{t('phase5.reportSave.subtitle')}</p>
        <label>
          <span>{t('phase5.reportSave.diagnosisNote')}</span>
          <textarea
            rows={3}
            placeholder={t('phase5.reportSave.diagnosisPlaceholder')}
            value={diagnosisNote}
            onChange={(event) => setDiagnosisNote(event.target.value)}
          />
        </label>
        <label>
          <span>{t('phase5.reportSave.serviceNote')}</span>
          <textarea
            rows={3}
            placeholder={t('phase5.reportSave.servicePlaceholder')}
            value={serviceNote}
            onChange={(event) => setServiceNote(event.target.value)}
          />
        </label>
        <label>
          <span>{t('phase5.reportSave.fee')}</span>
          <input
            inputMode="decimal"
            placeholder="0"
            value={fee}
            onChange={(event) => setFee(event.target.value)}
          />
        </label>
        <div className="p5-report-save__actions">
          <button type="button" onClick={onCancel}>{t('phase5.reportSave.cancel')}</button>
          <button
            data-action="save-report-modal"
            type="button"
            onClick={() => {
              void onSave({ diagnosisNote, serviceNote, fee });
            }}
          >
            {t('phase5.reportSave.save')}
          </button>
        </div>
      </section>
    </div>
  );
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
