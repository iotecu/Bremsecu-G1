import React, { useMemo, useState } from 'react';
import { assetUrl } from '../../assets';
import { useI18n, type TranslationKey } from '../../i18n';
import type { CanSubSlide } from '../../navigation';
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

export function CableRootCard({
  onMove,
  onOpenBranch,
}: {
  readonly onMove: (direction: -1 | 1) => void;
  readonly onOpenBranch: (branch: 'iso7638' | 'iso12098') => void;
}) {
  const { t } = useI18n();

  return (
    <section className="p5-carousel" data-screen="12-cable-test-select">
      <button className="p5-carousel__arrow p5-carousel__arrow--left" type="button" onClick={() => onMove(-1)}>‹</button>
      <div className="p5-selection" style={{ '--module-accent': '#2375B9' } as React.CSSProperties}>
        <div className="p5-selection__side"><span>{t('phase5.module.sideCable')}</span></div>
        <article className="p5-selection__card p5-selection__card--choice">
          <img className="p5-selection__image" src={assetUrl('cable-662-5072.png')} alt="" aria-hidden="true" />
          <h1>{t('phase5.module.cable')}</h1>
          <div className="p5-branch-actions">
            <button data-action="cable-iso7638" type="button" onClick={() => onOpenBranch('iso7638')}>ISO 7638</button>
            <button data-action="cable-iso12098" type="button" onClick={() => onOpenBranch('iso12098')}>ISO 12098</button>
          </div>
        </article>
      </div>
      <button className="p5-carousel__arrow p5-carousel__arrow--right" type="button" onClick={() => onMove(1)}>›</button>
      <p className="p5-root-note">{t('phase5.cable.chooseStandard')}</p>
    </section>
  );
}

export function CableSelectionScreen({
  iso,
  onStart,
}: {
  readonly iso: '7638' | '12098';
  readonly onStart: (enabledPinMask: number) => void;
}) {
  const { t } = useI18n();
  const functions = iso === '7638' ? cable7638Functions : cable12098Functions;
  const [enabled, setEnabled] = useState<boolean[]>(() => functions.map(() => true));
  const allEnabled = enabled.every(Boolean);
  const selectedCount = enabled.filter(Boolean).length;
  const enabledPinMask = enabled.reduce(
    (mask, value, index) => value ? mask | (1 << index) : mask,
    0,
  );
  const sockets = iso === '7638' ? [1, 3] : [2, 4];

  function toggleAll() {
    setEnabled(functions.map(() => !allEnabled));
  }

  return (
    <section className="p5-cable-select" data-screen={iso === '7638' ? '13-iso7638-cable-select' : '15-iso12098-cable-select'}>
      <header className="p5-test-title">
        <img src={assetUrl(iso === '7638' ? 'cable-662-5072.png' : 'cable-683-7072.png')} alt="" aria-hidden="true" />
        <div><strong>ISO {iso}</strong><span>{t('phase5.cable.cableTest')}</span></div>
      </header>

      <div className="p5-connector-guide">
        <p>{t('phase5.cable.connectBothEnds')}</p>
        <div>{sockets.map((socket) => <span key={socket}>{socket}</span>)}</div>
      </div>

      <div className="p5-cable-select__toolbar">
        <strong>{t('phase5.cable.pinSelection')}</strong>
        <button type="button" onClick={toggleAll}>{allEnabled ? t('phase5.cable.clearAll') : t('phase5.cable.selectAll')}</button>
      </div>

      <div className={iso === '12098' ? 'p5-cable-pins p5-cable-pins--dense' : 'p5-cable-pins'}>
        {functions.map((key, index) => (
          <label className={enabled[index] ? 'p5-cable-pin is-enabled' : 'p5-cable-pin'} key={index}>
            <input
              type="checkbox"
              checked={enabled[index]}
              onChange={() => setEnabled((current) => current.map((value, i) => i === index ? !value : value))}
            />
            <strong>{t('phase5.common.pin')}{index + 1}</strong>
            <span>{t(key)}</span>
          </label>
        ))}
      </div>

      <button className="p5-primary p5-cable-start" data-action="start-cable" type="button" disabled={selectedCount === 0} onClick={() => onStart(enabledPinMask)}>
        {t('phase5.cable.startSelected', { count: selectedCount })}
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

const canOptions = [
  { iso: '7638', side: 'tractor', socket: 1, asset: 'tractor-icon.png' },
  { iso: '12098', side: 'tractor', socket: 2, asset: 'tractor-icon.png' },
  { iso: '7638', side: 'trailer', socket: 3, asset: 'trailer-icon.png' },
  { iso: '12098', side: 'trailer', socket: 4, asset: 'trailer-icon.png' },
] as const;

export function CanTerminationRootCard({
  canSubSlide,
  onMove,
  onMoveSub,
  onStart,
}: {
  readonly canSubSlide: CanSubSlide;
  readonly onMove: (direction: -1 | 1) => void;
  readonly onMoveSub: (direction: -1 | 1) => void;
  readonly onStart: () => void;
}) {
  const { t } = useI18n();
  const option = canOptions[canSubSlide];
  const sideLabel = option.side === 'tractor' ? t('phase5.form.tractor') : t('phase5.form.trailer');

  return (
    <section className="p5-carousel" data-screen="17-can-termination-select">
      <button className="p5-carousel__arrow p5-carousel__arrow--left" type="button" onClick={() => onMove(-1)}>‹</button>
      <div className="p5-selection" style={{ '--module-accent': '#ED9F0E' } as React.CSSProperties}>
        <div className="p5-selection__side"><span>{t('phase5.module.sideTermination')}</span></div>
        <article className="p5-selection__card p5-selection__card--can">
          <img className="p5-selection__image p5-selection__image--resistance" src={assetUrl('resistance.svg')} alt="" aria-hidden="true" />
          <h1>{t('phase5.module.canTermination')}</h1>
          <div className="p5-can-subselector" data-can-subslide={canSubSlide}>
            <button type="button" disabled={canSubSlide === 0} onClick={(event) => { event.stopPropagation(); onMoveSub(-1); }}>‹</button>
            <div>
              <img src={assetUrl(option.asset)} alt="" aria-hidden="true" />
              <strong>{sideLabel}</strong>
              <span>ISO {option.iso}</span>
            </div>
            <button type="button" disabled={canSubSlide === 3} onClick={(event) => { event.stopPropagation(); onMoveSub(1); }}>›</button>
          </div>
          <button className="p5-start" data-action="start-can" type="button" onClick={onStart}>{t('phase5.common.start')}</button>
        </article>
      </div>
      <button className="p5-carousel__arrow p5-carousel__arrow--right" type="button" onClick={() => onMove(1)}>›</button>
      <div className="p5-guidance p5-guidance--can">
        <p>{t('phase5.termination.connectTarget', { side: sideLabel, iso: option.iso })}</p>
        <div className="p5-guidance__socket"><span>{option.socket}</span><strong>{t('phase5.selection.numberedSocket')}</strong></div>
      </div>
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
