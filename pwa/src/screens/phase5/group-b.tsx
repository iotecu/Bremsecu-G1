import React, { useState } from 'react';
import { assetUrl } from '../../assets';
import { useI18n, type TranslationKey } from '../../i18n';
import { useFirmwareSnapshot } from '../../services/runtime-react';
import {
  cableActiveProgress,
  cableProgressForPin,
  cableSummary,
  hasCrossEvidence,
  stringField,
  terminationResistanceOhms,
} from '../../services/view';

function isVisualDevelopment(): boolean {
  const meta = import.meta as ImportMeta & { readonly env?: { readonly DEV?: boolean } };
  return meta.env?.DEV === true;
}

const cable7638Functions = [
  'phase5.measurement.battery',
  'phase5.measurement.ignition',
  'phase5.measurement.chassis',
  'phase5.measurement.chassis',
  'phase5.measurement.abs',
  'phase5.measurement.canH',
  'phase5.measurement.canL',
] as const satisfies readonly TranslationKey[];

const cable12098Functions = [
  'phase5.measurement.leftSignal',
  'phase5.measurement.rightSignal',
  'phase5.measurement.rearFog',
  'phase5.measurement.chassis',
  'phase5.measurement.leftPark',
  'phase5.measurement.rightPark',
  'phase5.measurement.stop',
  'phase5.measurement.reverse',
  'phase5.measurement.continuous24',
  'phase5.measurement.lining',
  'phase5.measurement.brakeSystem',
  'phase5.measurement.axle',
  'phase5.measurement.chassis',
  'phase5.measurement.canH',
  'phase5.measurement.canL',
] as const satisfies readonly TranslationKey[];

export function CableSelectionScreen({
  iso,
  onStart,
}: {
  readonly iso: '7638' | '12098';
  readonly onStart: (enabledPinMask: number) => void;
}) {
  const { t } = useI18n();
  const functions = iso === '7638' ? cable7638Functions : cable12098Functions;
  const enabledPinMask = functions.reduce((mask, _value, index) => mask | (1 << index), 0);
  const sockets = iso === '7638' ? [1, 3] : [2, 4];

  return (
    <section
      className="p5-test-setup"
      data-screen={iso === '7638' ? '13-iso7638-cable-select' : '15-iso12098-cable-select'}
    >
      <div className="p5-test-setup__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8h5v8H3M21 8h-5v8h5M8 10h8M8 14h8M1 10h2M1 14h2M21 10h2M21 14h2" />
        </svg>
      </div>

      <header className="p5-test-setup__head">
        <h1>ISO {iso}</h1>
        <p>{t('phase5.cable.cableTest')}</p>
      </header>

      <div className="p5-test-setup__instructions">
        <p>{t('phase5.cable.connectBothEnds')}</p>
        <div className="p5-test-setup__sockets">
          <span>{sockets[0]}</span>
          <b>+</b>
          <span>{sockets[1]}</span>
        </div>
        <strong>{t('phase5.selection.numberedSocket')}</strong>
        <p>{t('phase5.selection.thenStart')}</p>
      </div>

      <button
        className="p5-test-setup__start"
        data-action="start-cable"
        type="button"
        onClick={() => onStart(enabledPinMask)}
      >
        {t('phase5.common.start')}
      </button>
    </section>
  );
}

export function CableMeasurementScreen({
  iso,
  onSave,
}: {
  readonly iso: '7638' | '12098';
  readonly onSave: () => void;
}) {
  const { t } = useI18n();
  const development = isVisualDevelopment();
  const firmware = useFirmwareSnapshot();
  const functions = iso === '7638' ? cable7638Functions : cable12098Functions;
  const mode = iso === '7638' ? 'cable_iso7638' : 'cable_iso12098';
  const liveProgress = cableActiveProgress(firmware, iso);
  const activePin = liveProgress.pin ?? (development ? 1 : null);
  const progress = liveProgress.percent ?? (development ? (iso === '7638' ? 43 : 27) : null);
  const summary = cableSummary(firmware, mode);

  return (
    <section className="p5-cable-live" data-screen={iso === '7638' ? '14-iso7638-cable-measurement' : '16-iso12098-cable-measurement'}>
      <header className="p5-test-title p5-test-title--compact">
        <img src={assetUrl(iso === '7638' ? 'cable-662-5072.png' : 'cable-683-7072.png')} alt="" aria-hidden="true" />
        <div><strong>ISO {iso}</strong><span>{t('phase5.cable.cableTest')}</span></div>
        <b>{t('phase5.cable.testing')}</b>
      </header>

      <section className="p5-cable-focus">
        <div>
          <small>{t('phase5.cable.currentFocus')}</small>
          <strong>{activePin ? t('phase5.common.pin') + ' ' + activePin : '—'}</strong>
          <span>{activePin ? t(functions[activePin - 1] ?? functions[0]!) : '—'}</span>
        </div>
        <div className="p5-progress">
          <span style={{ width: progress === null ? '0%' : progress + '%' }} />
        </div>
        <output>{progress === null ? '—' : progress + '%'}</output>
      </section>

      <div className={iso === '12098' ? 'p5-cable-live__table p5-cable-live__table--dense' : 'p5-cable-live__table'}>
        {functions.map((key, index) => {
          const pin = index + 1;
          const active = pin === activePin;
          const live = cableProgressForPin(firmware, iso, pin);
          const continuity = live ? stringField(live, 'continuity') : null;
          const cross = hasCrossEvidence(firmware, mode, pin);
          return (
            <div className={active ? 'p5-cable-result is-active' : 'p5-cable-result'} key={pin}>
              <strong>{t('phase5.common.pin')}{pin}</strong>
              <span>{t(key)}</span>
              <span className="p5-cable-result__continuity">{continuity ?? (active && development ? t('phase5.cable.scanning') : '—')}</span>
              <span className="p5-cable-result__cross">{cross ? t('phase5.cable.crossScan') : active && development ? t('phase5.cable.crossScan') : '—'}</span>
            </div>
          );
        })}
      </div>

      <div className="p5-cable-summary">
        <span>{t('phase5.cable.pass')}: <b>{summary ? summary.pass : development ? '0' : '—'}</b></span>
        <span>{t('phase5.cable.open')}: <b>{summary ? summary.open : development ? '0' : '—'}</b></span>
        <span>{t('phase5.cable.indeterminate')}: <b>{summary ? summary.indeterminate : development ? '0' : '—'}</b></span>
        <span>{t('phase5.cable.shortMiswire')}: <b>{summary ? summary.shortCount : development ? '0' : '—'}</b></span>
      </div>

      <button className="p5-save-bar" data-action="save-cable" type="button" onClick={onSave}>
        <img src={assetUrl('save1.svg')} alt="" aria-hidden="true" />
        {t('phase5.common.saveToReport')}
      </button>
    </section>
  );
}

export function TerminationSafetyScreen({
  iso,
  side,
  socket,
  onContinue,
}: {
  readonly iso: '7638' | '12098';
  readonly side: 'tractor' | 'trailer';
  readonly socket: 1 | 2 | 3 | 4;
  readonly onContinue: () => void;
}) {
  const { t } = useI18n();
  const [confirmed, setConfirmed] = useState(false);
  const sideLabel = side === 'tractor' ? t('phase5.form.tractor') : t('phase5.form.trailer');

  return (
    <section className="p5-termination-safety" data-screen={'can-' + iso + '-' + side + '-safety'}>
      <header>
        <img src={assetUrl('resistance.svg')} alt="" aria-hidden="true" />
        <div><strong>ISO {iso}</strong><span>{sideLabel} — {t('phase5.termination.title')}</span></div>
      </header>
      <div className="p5-danger-card">
        <b>!</b>
        <div>
          <h1>{t('phase5.termination.ignitionOff')}</h1>
          <p>{t('phase5.termination.deenergizeWarning')}</p>
        </div>
      </div>
      <label className="p5-termination-confirm">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
        <span>{t('phase5.termination.confirmDeenergized')}</span>
      </label>
      <div className="p5-connector-guide p5-connector-guide--single">
        <p>{t('phase5.termination.connectTarget', { side: sideLabel, iso })}</p>
        <div><span>{socket}</span></div>
      </div>
      <button className="p5-primary p5-termination-continue" data-action="confirm-can-safety" type="button" disabled={!confirmed} onClick={onContinue}>
        {t('phase5.termination.continueMeasurement')}
      </button>
    </section>
  );
}

export function TerminationResultScreen({
  iso,
  side,
  onSave,
}: {
  readonly iso: '7638' | '12098';
  readonly side: 'tractor' | 'trailer';
  readonly onSave: () => void;
}) {
  const { t } = useI18n();
  const development = isVisualDevelopment();
  const firmware = useFirmwareSnapshot();
  const mode = ('can_termination_iso' + iso + '_' + side) as
    | 'can_termination_iso7638_tractor'
    | 'can_termination_iso7638_trailer'
    | 'can_termination_iso12098_tractor'
    | 'can_termination_iso12098_trailer';
  const resistance = terminationResistanceOhms(firmware, mode);
  const sideLabel = side === 'tractor' ? t('phase5.form.tractor') : t('phase5.form.trailer');

  return (
    <section className="p5-termination-result" data-screen={'can-' + iso + '-' + side + '-resistance'}>
      <header>
        <img src={assetUrl('resistance.svg')} alt="" aria-hidden="true" />
        <div><strong>ISO {iso}</strong><span>{sideLabel} — {t('phase5.termination.title')}</span></div>
      </header>

      <section className="p5-resistance-card">
        <small>{t('phase5.termination.measuredResistance')}</small>
        <output>{resistance !== null ? resistance.toFixed(1) + ' Ω' : development ? '60.0 Ω' : '— Ω'}</output>
        <span>{t('phase5.termination.canPair')}</span>
      </section>

      <div className="p5-termination-detail">
        <div><span>{t('phase5.termination.expectedResistance')}</span><strong>{t('phase5.termination.pendingEngineering')}</strong></div>
        <div><span>{t('phase5.termination.safetyState')}</span><strong>{t('phase5.termination.deenergized')}</strong></div>
        <div><span>{t('phase5.termination.classification')}</span><strong>{development ? t('phase5.termination.pendingEngineering') : '—'}</strong></div>
      </div>

      <button className="p5-save-bar" data-action="save-can" type="button" onClick={onSave}>
        <img src={assetUrl('save1.svg')} alt="" aria-hidden="true" />
        {t('phase5.common.saveToReport')}
      </button>
    </section>
  );
}
