import React, { useState } from 'react';
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

export function LampRootCard({
  onMove,
  onStart,
}: {
  readonly onMove: (direction: -1 | 1) => void;
  readonly onStart: () => void;
}) {
  const { t } = useI18n();

  return (
    <section className="p5-carousel" data-screen="30-lamp-test-select">
      <button className="p5-carousel__arrow p5-carousel__arrow--left" type="button" onClick={() => onMove(-1)}>‹</button>
      <div className="p5-selection" style={{ '--module-accent': '#B92323' } as React.CSSProperties}>
        <div className="p5-selection__side"><span>{t('phase5.module.sideLamp')}</span></div>
        <article className="p5-selection__card">
          <img className="p5-selection__image p5-selection__image--lamp" src={assetUrl('lamp-test.png')} alt="" aria-hidden="true" />
          <h1>{t('phase5.module.lamp')}</h1>
          <button className="p5-start" data-action="start-lamp" type="button" onClick={onStart}>{t('phase5.common.start')}</button>
        </article>
      </div>
      <button className="p5-carousel__arrow p5-carousel__arrow--right" type="button" onClick={() => onMove(1)}>›</button>
      <div className="p5-guidance">
        <p>{t('phase5.lamp.connectTrailer')}</p>
        <div className="p5-guidance__socket"><span>4</span><strong>{t('phase5.selection.numberedSocket')}</strong></div>
        <p>{t('phase5.lamp.oneAtATime')}</p>
      </div>
    </section>
  );
}

export function LampMeasurementScreen({
  onActivate,
  onAxleLift,
  onSave,
}: {
  readonly onActivate: (pin: number) => boolean | Promise<boolean>;
  readonly onAxleLift: () => void;
  readonly onSave: () => void;
}) {
  const { t } = useI18n();
  const development = isVisualDevelopment();
  const firmware = useFirmwareSnapshot();
  const [previewPin, setPreviewPin] = useState<number | null>(development ? 1 : null);
  const liveCurrent = loadCurrentForMode(firmware, 'lamp_iso12098');

  const activeKey = previewPin ? lampRows.find((row) => row.pin === previewPin)?.key : undefined;

  return (
    <section className="p5-lamp-live" data-screen="31-lamp-test-measurement">
      <header className="p5-lamp-head">
        <div className="p5-lamp-head__side">{t('phase5.form.trailer')}</div>
        <img src={assetUrl('lamp-test.png')} alt="" aria-hidden="true" />
        <div><strong>ISO 12098</strong><span>{t('phase5.lamp.title')}</span></div>
        <b>{t('phase5.common.testActive')}</b>
      </header>

      <section className="p5-lamp-active">
        <div>
          <small>{t('phase5.common.activeMeasurement')}</small>
          <strong>{previewPin ? t('phase5.common.pin') + ' ' + previewPin : '—'}</strong>
          <span>{activeKey ? t(activeKey) : '—'}</span>
        </div>
        <div>
          <small>{t('phase5.lamp.current')}</small>
          <output>{liveCurrent !== null ? liveCurrent.toFixed(2) + ' A' : development && previewPin ? '2.4 A' : '— A'}</output>
        </div>
      </section>

      <h2 className="p5-lamp-live__title">{t('phase5.lamp.channels')}</h2>
      <div className="p5-lamp-table">
        {lampRows.map((row) => {
          const active = row.pin === previewPin;
          return (
            <div className={active ? 'p5-lamp-row is-active' : 'p5-lamp-row'} key={row.pin}>
              <strong>{t('phase5.common.pin')}{row.pin}</strong>
              <span>{t(row.key)}</span>
              <span>{active && development ? t('phase5.lamp.outputOn') : t('phase5.lamp.outputOff')}</span>
              <button
                data-action={'lamp-pin-' + row.pin}
                type="button"
                onClick={() => {
                  void Promise.resolve(onActivate(row.pin)).then((accepted) => {
                    if (accepted) setPreviewPin(row.pin);
                  });
                }}
              >
                {t('phase5.lamp.activate')}
              </button>
            </div>
          );
        })}
        <div className="p5-lamp-row p5-lamp-row--axle">
          <strong>{t('phase5.common.pin')}12</strong>
          <span>{t('phase5.measurement.axle')}</span>
          <span>{t('phase5.lamp.safetyRequired')}</span>
          <button data-action="open-axle-safety" type="button" onClick={onAxleLift}>{t('phase5.lamp.openSafety')}</button>
        </div>
      </div>

      <p className="p5-lamp-note">{t('phase5.lamp.oneAtATime')}</p>

      <button className="p5-save-bar" data-action="save-lamp" type="button" onClick={onSave}>
        <img src={assetUrl('save1.svg')} alt="" aria-hidden="true" />
        {t('phase5.common.saveToReport')}
      </button>
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

  return (
    <section className="p5-axle-safety" data-screen="32-axle-lift-safety">
      <div className="p5-axle-card">
        <div className="p5-axle-card__icon">!</div>
        <h1>{t('phase5.axle.title')}</h1>
        <p>{t('phase5.axle.body')}</p>
        <div className="p5-axle-card__warning">{t('phase5.axle.warning')}</div>
        <label>
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
          <span>{t('phase5.axle.confirmation')}</span>
        </label>
        <div className="p5-axle-card__actions">
          <button type="button" onClick={onCancel}>{t('phase5.axle.cancel')}</button>
          <button data-action="confirm-axle-safety" type="button" disabled={!confirmed} onClick={onConfirm}>{t('phase5.axle.confirm')}</button>
        </div>
      </div>
    </section>
  );
}

export function ReportsRootCard({
  onMove,
  onOpen,
}: {
  readonly onMove: (direction: -1 | 1) => void;
  readonly onOpen: () => void;
}) {
  const { t } = useI18n();

  return (
    <section className="p5-carousel" data-screen="33-reports">
      <button className="p5-carousel__arrow p5-carousel__arrow--left" type="button" onClick={() => onMove(-1)}>‹</button>
      <div className="p5-selection" style={{ '--module-accent': '#0ED6ED' } as React.CSSProperties}>
        <div className="p5-selection__side"><span>{t('phase5.module.sideReport')}</span></div>
        <article className="p5-selection__card">
          <img className="p5-selection__image p5-selection__image--report" src={assetUrl('report-2.svg')} alt="" aria-hidden="true" />
          <h1>{t('phase5.module.reports')}</h1>
          <button className="p5-start p5-start--cyan" data-action="open-reports" type="button" onClick={onOpen}>{t('phase5.reports.open')}</button>
        </article>
      </div>
      <button className="p5-carousel__arrow p5-carousel__arrow--right" type="button" onClick={() => onMove(1)}>›</button>
      <p className="p5-root-note">{t('phase5.reports.rootHint')}</p>
    </section>
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
        <img src={assetUrl('save1.svg')} alt="" aria-hidden="true" />
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
          <button type="button" onClick={onReturn}>{t('phase5.commonSave.returnToTest')}</button>
          <button data-action="exit-without-save" type="button" onClick={onExitWithoutSave}>{t('phase5.commonSave.exitWithoutSave')}</button>
          <button
            data-action="save-and-exit"
            type="button"
            onClick={() => {
              void onSaveAndExit(technicianNote);
            }}
          >
            {t('phase5.commonSave.saveAndExit')}
          </button>
        </div>
      </section>
    </div>
  );
}
