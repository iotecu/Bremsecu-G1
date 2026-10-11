import { useCarouselSwipe } from '../../components/swipe';
import { AssetImage } from '../../components/AssetImage';
import { isScreenTestBuild } from '../../screen-test/mode';
import React, { useRef, useState } from 'react';
import { assetUrl } from '../../assets';
import { useI18n, type TranslationKey } from '../../i18n';
import type { CanSubSlide } from '../../navigation';
import { useFirmwareRuntime, useFirmwareSnapshot } from '../../services/runtime-react';
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
  return meta.env?.DEV === true || isScreenTestBuild();
}

function isVisualCanDetail(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const screen = Number(params.get('screen') ?? '0');
  return params.get('visual') === '1' && screen >= 18 && screen <= 21;
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
          <AssetImage className="p5-selection__image" src={assetUrl('cable-662-5072.png')} alt="" aria-hidden="true" />
          <h1>{t('phase5.module.cable')}</h1>
          <AssetImage className="p5-cable-root-second" src={assetUrl('cable-683-7072.png')} alt="" aria-hidden="true" />
          <button className="p5-start" data-action="cable-iso7638" type="button" onClick={() => onOpenBranch('iso7638')}>{t('phase5.common.start')}</button>
        </article>
      </div>
      <button className="p5-carousel__arrow p5-carousel__arrow--right" type="button" onClick={() => onMove(1)}>›</button>
      <p className="p5-root-note">{t('phase5.cable.chooseStandard')}</p>
    </section>
  );
}

export function CableSelectionScreen({
  iso,
  onMove,
  onStart,
}: {
  readonly iso: '7638' | '12098';
  readonly onStart: (enabledPinMask: number) => void;
  readonly onMove?: (direction:-1|1) => void;
}) {
  const { t } = useI18n();
  const functions = iso === '7638' ? cable7638Functions : cable12098Functions;
  const enabledPinMask = functions.reduce((mask, _value, index) => mask | (1 << index), 0);
  const swipe=useCarouselSwipe((direction) => onMove?.(direction));
  const sockets = iso === '7638' ? [1, 3] : [2, 4];
  const socketAsset = iso === '7638' ? 'iso7638-socket.webp' : 'iso12098-socket.webp';

  return (
    <section
      {...swipe} className="p5-carousel p5-cable-select-approved"
      data-screen={iso === '7638' ? '13-iso7638-cable-select' : '15-iso12098-cable-select'}
    >
      <button className="p5-carousel__arrow p5-carousel__arrow--left" type="button" onClick={() => onMove?.(-1)}>‹</button>
      <div className="p5-selection" style={{ '--module-accent': '#2375B9' } as React.CSSProperties}>
        <div className="p5-selection__side"><span>{t('phase5.module.sideCable')}</span></div>
        <article className="p5-selection__card p5-selection__card--cable-standard">
          <AssetImage
            className="p5-selection__image p5-selection__image--cable-socket"
            src={assetUrl(socketAsset)}
            alt=""
            aria-hidden="true"
          />
          <h1>
            <span>ISO {iso}</span>
            <span>{t('phase5.cable.cableTest')}</span>
          </h1>
          <button
            className="p5-start"
            data-action="start-cable"
            type="button"
            onClick={() => onStart(enabledPinMask)}
          >
            {t('phase5.common.start')}
          </button>
        </article>
      </div>
      <button className="p5-carousel__arrow p5-carousel__arrow--right" type="button" onClick={() => onMove?.(1)}>›</button>

      <div className="p5-guidance p5-guidance--cable-approved">
        <p>{t('phase5.cable.connectBothEnds')}</p>
        <div className="p5-cable-sockets">
          <span>{sockets[0]}</span><b>+</b><span>{sockets[1]}</span>
          <strong>{t('phase5.selection.numberedSocket')}</strong>
        </div>
        <p>{t('phase5.selection.thenStart')}</p>
      </div>
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
  const runtime = useFirmwareRuntime();
  const development = isVisualDevelopment() && !runtime;
  const firmware = useFirmwareSnapshot();
  const functions = iso === '7638' ? cable7638Functions : cable12098Functions;
  const [disabledPins,setDisabledPins]=useState<number[]>([]);
  const changing = useRef(false);
  const [changingPins,setChangingPins]=useState(false);
  const [pinError,setPinError]=useState(false);
  const togglePin=async(pin:number) => {
    if(changing.current) return;
    const next=disabledPins.includes(pin)?disabledPins.filter(p=>p!==pin):[...disabledPins,pin];
    const mask=functions.reduce((m,_,i)=>next.includes(i+1)?m:m|(1<<i),0);
    changing.current=true;setChangingPins(true);setPinError(false);
    try {
      await runtime?.stopTest();
      if(mask) await runtime?.startTest({mode:iso === '7638'?'cable_iso7638':'cable_iso12098',enabledPinMask:mask});
      setDisabledPins(next);
    } catch { setPinError(true); }
    finally { changing.current=false;setChangingPins(false); }
  };
  const mode = iso === '7638' ? 'cable_iso7638' : 'cable_iso12098';
  const liveProgress = cableActiveProgress(firmware, iso);
  const activePin = liveProgress.pin ?? (development ? 1 : null);
  const progress = liveProgress.percent ?? (development ? (iso === '7638' ? 43 : 27) : null);
  const summary = disabledPins.length === functions.length ? null:cableSummary(firmware, mode);

  return (
    <section className="p5-cable-live" data-screen={iso === '7638' ? '14-iso7638-cable-measurement' : '16-iso12098-cable-measurement'}>
      <header className="p5-test-title p5-test-title--compact">
        <AssetImage src={assetUrl(iso === '7638' ? 'cable-662-5072.png' : 'cable-683-7072.png')} alt="" aria-hidden="true" />
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
          const continuity = live && !disabledPins.includes(pin) ? stringField(live, 'continuity') : null;
          const cross = hasCrossEvidence(firmware, mode, pin);
          return (
            <div className={active ? 'p5-cable-result is-active' : 'p5-cable-result'} key={pin}>
              <strong>{t('phase5.common.pin')}{pin}</strong>
              <span>{t(key)}</span>
              <span className="p5-cable-result__continuity">{continuity ?? (active && development ? t('phase5.cable.scanning') : '—')}</span>
              <span className="p5-cable-result__cross">{cross ? t('phase5.cable.crossScan') : active && development ? t('phase5.cable.crossScan') : '—'}</span><button type="button" role="switch" disabled={changingPins} aria-checked={!disabledPins.includes(pin)} aria-label={t('phase5.cable.pinSelection') + ' ' + pin} onClick={() => { void togglePin(pin); }}>{disabledPins.includes(pin)?'×':'✓'}</button>
            </div>
          );
        })}
      </div>

      {pinError ? <p role="alert">{t('phase5.operation.failed')}</p> : null}
      <div className="p5-cable-summary">
        <span>{t('phase5.cable.pass')}: <b>{summary ? summary.pass : development ? '0' : '—'}</b></span>
        <span>{t('phase5.cable.open')}: <b>{summary ? summary.open : development ? '0' : '—'}</b></span>
        <span>{t('phase5.cable.indeterminate')}: <b>{summary ? summary.indeterminate : development ? '0' : '—'}</b></span>
        <span>{t('phase5.cable.shortMiswire')}: <b>{summary ? summary.shortCount : development ? '0' : '—'}</b></span>
      </div>

      <button className="p5-save-bar" data-action="save-cable" type="button" onClick={onSave}>
        <AssetImage src={assetUrl('save1.svg')} alt="" aria-hidden="true" />
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
  showSelector,
  onSelectorOpen,
  onMove,
  onMoveSub,
  onStart,
}: {
  readonly canSubSlide: CanSubSlide;
  readonly showSelector?:boolean;
  readonly onSelectorOpen?:(open:boolean) => void;
  readonly onMove: (direction: -1 | 1) => void;
  readonly onMoveSub: (direction: -1 | 1) => void;
  readonly onStart: () => void;
}) {
  const { t } = useI18n();
  const [localSelectorOpen, setLocalSelectorOpen] = useState(isVisualCanDetail);
  const selectorOpen=showSelector ?? localSelectorOpen;
  const setSelectorOpen=onSelectorOpen ?? setLocalSelectorOpen;
  const subSwipe=useCarouselSwipe(onMoveSub);
  const option = canOptions[canSubSlide];
  const sideLabel = option.side === 'tractor' ? t('phase5.selection.tractorSide') : t('phase5.selection.trailerSide');

  if (!selectorOpen) {
    return (
      <section className="p5-carousel p5-can-root" data-screen="17-can-termination-select">
        <button className="p5-carousel__arrow p5-carousel__arrow--left" type="button" onClick={() => onMove(-1)}>‹</button>
        <div className="p5-selection" style={{ '--module-accent': '#ED9F0E' } as React.CSSProperties}>
          <div className="p5-selection__side"><span>{t('phase5.module.sideTermination')}</span></div>
          <article className="p5-selection__card p5-selection__card--can-root">
            <AssetImage className="p5-can-root__resistance" src={assetUrl('resistance.svg')} alt="" aria-hidden="true" />
            <h1>{t('phase5.module.canTermination')}</h1>
            <button className="p5-start" data-action="open-can-selector" type="button" onClick={() => setSelectorOpen(true)}>
              <span aria-hidden="true">▶</span> {t('phase5.common.start')}
            </button>
          </article>
        </div>
        <button className="p5-carousel__arrow p5-carousel__arrow--right" type="button" onClick={() => onMove(1)}>›</button>
        <button className="p5-can-root-check" type="button" onClick={() => setSelectorOpen(true)}>
          <span>{t('phase5.termination.ignitionOff')}</span><i aria-hidden="true" />
        </button>
      </section>
    );
  }

  return (
    <section {...subSwipe} className={`p5-carousel p5-can-detail p5-can-detail--${option.side}`} data-screen="17-can-termination-select" data-can-subslide={canSubSlide}>
      <button className="p5-carousel__arrow p5-carousel__arrow--left" type="button"  onClick={() => onMoveSub(-1)}>‹</button>
      <div className="p5-selection" style={{ '--module-accent': option.side === 'tractor' ? '#F4F4F4' : '#E5343A' } as React.CSSProperties}>
        <div className="p5-selection__side"><AssetImage className="p5-side-vehicle" src={assetUrl(option.asset)} alt="" aria-hidden="true" /><span>{sideLabel}</span></div>
        <article className="p5-selection__card p5-selection__card--can-detail">
          <AssetImage className="p5-can-detail__socket" src={assetUrl(option.iso === '7638' ? 'iso7638-socket.webp' : 'iso12098-socket.webp')} alt="" aria-hidden="true" />
          <AssetImage className="p5-can-detail__resistance" src={assetUrl('resistance.svg')} alt="" aria-hidden="true" />
          <h1><span>ISO {option.iso}</span><span>{t('phase5.module.sideTermination')}</span></h1>
          <button className="p5-start" data-action="start-can" type="button" onClick={onStart}>{t('phase5.common.start')}</button>
        </article>
      </div>
      <button className="p5-carousel__arrow p5-carousel__arrow--right" type="button"  onClick={() => onMoveSub(1)}>›</button>
      <div className="p5-guidance p5-guidance--can">
        <p>{t('phase5.termination.connectTarget', { side: sideLabel, iso: option.iso })}</p>
        <div className="p5-guidance__socket"><span>{option.socket}</span><strong>{t('phase5.selection.numberedSocket')}</strong></div>
        <p>{t('phase5.selection.thenStart')}</p>
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
        <AssetImage src={assetUrl('resistance.svg')} alt="" aria-hidden="true" />
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
  const runtime = useFirmwareRuntime();
  const development = isVisualDevelopment() && !runtime;
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
        <AssetImage src={assetUrl('resistance.svg')} alt="" aria-hidden="true" />
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
        <AssetImage src={assetUrl('save1.svg')} alt="" aria-hidden="true" />
        {t('phase5.common.saveToReport')}
      </button>
    </section>
  );
}
