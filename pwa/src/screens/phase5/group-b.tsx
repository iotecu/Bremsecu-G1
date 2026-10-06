import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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
  readonly onStart: () => void;
}) {
  const { t } = useI18n();
  const sockets = iso === '7638' ? [1, 3] as const : [2, 4] as const;

  return (
    <section
      className="p5-test-setup"
      data-screen={iso === '7638' ? '13-iso7638-cable-select' : '15-iso12098-cable-select'}
    >
      <div className="p5-test-setup__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5v5a3 3 0 0 0 3 3h2" />
          <path d="M20 19v-5a3 3 0 0 0-3-3h-2" />
          <path d="M2.5 3h3v4h-3zM18.5 17h3v4h-3z" />
          <path d="M9 13h6M11 10l-2 3 2 3M13 8l2 3-2 3" />
        </svg>
      </div>

      <header className="p5-test-setup__head">
        <h1>ISO {iso}</h1>
        <p>{t('phase5.cable.cableTest')}</p>
      </header>

      <div className="p5-test-setup__instructions">
        <p>{t('phase5.cable.connectBothEnds')}</p>
        <div
          className="p5-test-setup__sockets"
          data-cable-sockets={sockets[0] + '-' + sockets[1]}
        >
          <span>{sockets[0]}</span>
          <b>+</b>
          <span>{sockets[1]}</span>
        </div>
        <strong>ISO {iso} · {sockets[0]} + {sockets[1]}</strong>
        <p>{t('phase5.selection.thenStart')}</p>
      </div>

      <button
        className="p5-test-setup__start"
        data-action="start-cable"
        type="button"
        onClick={onStart}
      >
        {t('phase5.common.start')}
      </button>
    </section>
  );
}

export function CableMeasurementScreen({
  iso,
  enabledPinMask,
  onBack,
  onHome,
  onTogglePin,
}: {
  readonly iso: '7638' | '12098';
  readonly enabledPinMask: number;
  readonly onBack: () => void;
  readonly onHome: () => void;
  readonly onTogglePin: (pin: number) => void;
}) {
  const { t } = useI18n();
  const development = isVisualDevelopment();
  const firmware = useFirmwareSnapshot();
  const pinCount = iso === '7638' ? 7 : 15;
  const functionCatalog = iso === '7638' ? cable7638Functions : cable12098Functions;
  const functions = functionCatalog.slice(0, pinCount);
  const mode = iso === '7638' ? 'cable_iso7638' : 'cable_iso12098';
  const liveProgress = cableActiveProgress(firmware, iso);
  const selectedPins = functions.reduce((count, _key, index) => count + ((enabledPinMask & (1 << index)) ? 1 : 0), 0);
  const firstSelectedPin = functions.findIndex((_key, index) => Boolean(enabledPinMask & (1 << index))) + 1;
  const activePin =
    enabledPinMask === 0
      ? null
      : liveProgress.pin ?? (development && firstSelectedPin > 0 ? firstSelectedPin : null);
  const progress =
    enabledPinMask === 0
      ? null
      : liveProgress.percent ?? (development && selectedPins > 0 ? 100 : null);
  const summary = enabledPinMask === 0 ? null : cableSummary(firmware, mode);

  return (
    <section
      className="p5-cable-page"
      data-cable-iso={iso}
      data-pin-count={pinCount}
      data-screen={iso === '7638' ? '14-iso7638-cable-measurement' : '16-iso12098-cable-measurement'}
    >
      <header className="p5-voltage-page__top">
        <button className="p5-voltage-page__nav" data-action="exit-cable-back" type="button" onClick={onBack} aria-label={t('navigation.back')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m14.5 5-7 7 7 7" />
            <path d="M8 12h11" />
          </svg>
        </button>

        <div className="p5-voltage-page__title">
          <span>{t('phase5.cable.testing')}</span>
          <h1>ISO {iso}</h1>
          <p>{t('phase5.cable.cableTest')}</p>
        </div>

        <button className="p5-voltage-page__nav" data-action="exit-cable-home" type="button" onClick={onHome} aria-label={t('navigation.home')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m3.5 10.5 8.5-7 8.5 7" />
            <path d="M5.5 9.5V21h13V9.5" />
            <path d="M9.5 21v-6h5v6" />
          </svg>
        </button>
      </header>

      <section className="p5-cable-page__hero">
        <div className="p5-cable-page__hero-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5v5a3 3 0 0 0 3 3h2" />
            <path d="M20 19v-5a3 3 0 0 0-3-3h-2" />
            <path d="M2.5 3h3v4h-3zM18.5 17h3v4h-3z" />
            <path d="M9 13h6M11 10l-2 3 2 3M13 8l2 3-2 3" />
          </svg>
        </div>
        <div className="p5-cable-page__hero-copy">
          <small>{t('phase5.cable.currentFocus')}</small>
          <strong>{activePin ? t('phase5.common.pin') + ' ' + activePin : '—'}</strong>
          <span>{activePin ? t(functions[activePin - 1] ?? functions[0]!) : t('phase5.cable.pinSelection')}</span>
        </div>
        <output>{selectedPins}/{functions.length}</output>
        <span className="p5-cable-page__progress">{progress === null ? '—' : progress + '%'}</span>
      </section>

      <section className="p5-cable-page__lines">
        <div className="p5-voltage-page__section-head">
          <h2>{t('phase5.common.allLines')}</h2>
          <span>{selectedPins > 0 ? t('phase5.cable.testing') : t('phase5.cable.pinSelection')}</span>
        </div>

        <div className="p5-cable-page__grid">
          {functions.map((key, index) => {
            const pin = index + 1;
            const selected = Boolean(enabledPinMask & (1 << index));
            const active = pin === activePin;
            const live = selected ? cableProgressForPin(firmware, iso, pin) : null;
            const continuity = live ? stringField(live, 'continuity') : null;
            const normalized = continuity?.toUpperCase() ?? null;
            const cross = selected && hasCrossEvidence(firmware, mode, pin);
            const previewPass = development && selected && !live;
            const passed = (normalized === 'PASS' && !cross) || previewPass;
            const failed = cross || normalized === 'OPEN';
            const indeterminate = normalized === 'INDETERMINATE';

            return (
              <article
                className={
                  'p5-cable-row' +
                  (selected ? ' is-selected' : '') +
                  (active ? ' is-active' : '') +
                  (passed ? ' is-pass' : '') +
                  (failed ? ' is-fail' : '')
                }
                key={pin}
              >
                <div className="p5-cable-row__pin">
                  <strong>{t('phase5.common.pin')}{pin}</strong>
                  <span className={selected ? 'is-on' : ''} aria-hidden="true" />
                </div>

                <strong className="p5-cable-row__label">{t(key)}</strong>

                <span
                  className={
                    'p5-cable-row__result' +
                    (passed ? ' is-pass' : '') +
                    (failed ? ' is-fail' : '') +
                    (indeterminate ? ' is-indeterminate' : '')
                  }
                  aria-label={passed ? t('phase5.cable.pass') : failed ? t('phase5.cable.open') : t('phase5.cable.indeterminate')}
                >
                  {passed ? '✓' : failed ? '×' : ''}
                </span>

                <span className="p5-cable-row__continuity">
                  {cross
                    ? t('phase5.cable.shortMiswire')
                    : normalized === 'PASS'
                      ? t('phase5.cable.pass')
                      : normalized === 'OPEN'
                        ? t('phase5.cable.open')
                        : normalized === 'INDETERMINATE'
                          ? t('phase5.cable.indeterminate')
                          : selected && development
                            ? t('phase5.cable.pass')
                            : '—'}
                </span>

                <button
                  aria-label={t(key)}
                  aria-pressed={selected}
                  className={'p5-voltage-toggle' + (selected ? ' is-on' : '')}
                  data-action={'toggle-cable-pin-' + pin}
                  type="button"
                  onClick={() => onTogglePin(pin)}
                >
                  <span aria-hidden="true" />
                </button>
              </article>
            );
          })}
        </div>

        <div className="p5-cable-page__footer">
          <p>{t('phase5.cable.pinSelection')}</p>
          <div>
            <span>{t('phase5.cable.pass')}: <b>{summary?.pass ?? '—'}</b></span>
            <span>{t('phase5.cable.open')}: <b>{summary?.open ?? '—'}</b></span>
            <span>{t('phase5.cable.shortMiswire')}: <b>{summary?.shortCount ?? '—'}</b></span>
          </div>
        </div>
      </section>
    </section>
  );
}

export function CableExitModal({
  iso,
  onCancel,
  onDiscard,
  onSave,
}: {
  readonly iso: '7638' | '12098';
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
    <div className="p5-modal-layer p5-modal-layer--voltage" data-overlay={'iso' + iso + '-cable-exit'}>
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
            <button data-action="discard-cable-result" type="button" onClick={() => setConfirmDiscard(true)}>{t('phase5.commonSave.exitWithoutSave')}</button>
            <button data-action="save-cable-result" type="button" disabled={saving} onClick={saveAndExit}>{t('phase5.commonSave.saveAndExit')}</button>
          </div>
        ) : (
          <div className="p5-voltage-exit__confirm">
            <div className="p5-voltage-exit__warning">
              <span aria-hidden="true">!</span>
              <strong>{t('phase5.commonSave.exitWithoutSave')}</strong>
            </div>
            <div className="p5-voltage-exit__confirm-actions">
              <button type="button" onClick={() => setConfirmDiscard(false)}>{t('phase5.commonSave.returnToTest')}</button>
              <button data-action="confirm-discard-cable-result" type="button" onClick={onDiscard}>{t('phase5.commonSave.exitWithoutSave')}</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export function TerminationSafetyScreen({
  iso,
  side,
  socket,
  onCancel,
  onContinue,
}: {
  readonly iso: '7638' | '12098';
  readonly side: 'tractor' | 'trailer';
  readonly socket: 1 | 2 | 3 | 4;
  readonly onCancel: () => void;
  readonly onContinue: () => void;
}) {
  const { t } = useI18n();
  const [confirmed, setConfirmed] = useState(false);
  const sideLabel = side === 'tractor' ? t('phase5.form.tractor') : t('phase5.form.trailer');

  const modal = (
    <div className="p5-modal-layer p5-modal-layer--can" data-overlay={'can-' + iso + '-' + side + '-preflight'}>
      <section className="p5-can-preflight" role="dialog" aria-modal="true">
        <div className="p5-can-preflight__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 4v16M19 4v16M8 7h8M8 17h8" />
            <path d="M10 10.5h4v3h-4z" />
          </svg>
        </div>

        <div className="p5-can-preflight__copy">
          <span>ISO {iso} · {sideLabel}</span>
          <h2>{t('phase5.termination.title')}</h2>
          <p>{t('phase5.termination.connectTarget', { side: sideLabel, iso })}</p>
        </div>

        <div className="p5-can-preflight__socket">
          <strong>{socket}</strong>
          <span>{t('phase5.selection.numberedSocket')}</span>
        </div>

        <div className="p5-can-preflight__warning">
          <span aria-hidden="true">!</span>
          <div>
            <strong>{t('phase5.termination.ignitionOff')}</strong>
            <p>{t('phase5.termination.deenergizeWarning')}</p>
          </div>
        </div>

        <label className="p5-can-preflight__confirm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>{t('phase5.termination.confirmDeenergized')}</span>
        </label>

        <div className="p5-can-preflight__actions">
          <button type="button" onClick={onCancel}>{t('navigation.back')}</button>
          <button
            data-action="confirm-can-safety"
            type="button"
            disabled={!confirmed}
            onClick={onContinue}
          >
            {t('phase5.termination.continueMeasurement')}
          </button>
        </div>
      </section>
    </div>
  );

  return typeof document === 'undefined' ? modal : createPortal(modal, document.body);
}

export function TerminationResultScreen({
  iso,
  side,
  socket,
  onBack,
  onHome,
}: {
  readonly iso: '7638' | '12098';
  readonly side: 'tractor' | 'trailer';
  readonly socket: 1 | 2 | 3 | 4;
  readonly onBack: () => void;
  readonly onHome: () => void;
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
  const displayResistance = resistance !== null
    ? resistance.toFixed(1) + ' Ω'
    : development
      ? '60.0 Ω'
      : '— Ω';

  return (
    <section className="p5-can-page" data-screen={'can-' + iso + '-' + side + '-resistance'}>
      <header className="p5-voltage-page__top">
        <button className="p5-voltage-page__nav" data-action="exit-can-back" type="button" onClick={onBack} aria-label={t('navigation.back')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m14.5 5-7 7 7 7" />
            <path d="M8 12h11" />
          </svg>
        </button>

        <div className="p5-voltage-page__title">
          <span>{sideLabel}</span>
          <h1>ISO {iso}</h1>
          <p>{t('phase5.termination.title')}</p>
        </div>

        <button className="p5-voltage-page__nav" data-action="exit-can-home" type="button" onClick={onHome} aria-label={t('navigation.home')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m3.5 10.5 8.5-7 8.5 7" />
            <path d="M5.5 9.5V21h13V9.5" />
            <path d="M9.5 21v-6h5v6" />
          </svg>
        </button>
      </header>

      <section className="p5-can-page__hero">
        <div className="p5-can-page__hero-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 4v16M19 4v16M8 7h8M8 17h8" />
            <path d="M10 10.5h4v3h-4z" />
          </svg>
        </div>
        <div className="p5-can-page__hero-copy">
          <small>{t('phase5.termination.measuredResistance')}</small>
          <strong>{sideLabel}</strong>
          <span>{t('phase5.termination.canPair')}</span>
        </div>
        <output>{displayResistance}</output>
        <span className="p5-can-page__status">{t('phase5.termination.deenergized')}</span>
      </section>

      <section className="p5-can-page__details">
        <article>
          <span>{t('phase5.selection.numberedSocket')}</span>
          <strong>{socket}</strong>
        </article>
        <article>
          <span>{t('phase5.termination.safetyState')}</span>
          <strong>{t('phase5.termination.deenergized')}</strong>
        </article>
        <article>
          <span>{t('phase5.termination.expectedResistance')}</span>
          <strong>{t('phase5.termination.pendingEngineering')}</strong>
        </article>
        <article>
          <span>{t('phase5.termination.classification')}</span>
          <strong>{t('phase5.termination.pendingEngineering')}</strong>
        </article>
      </section>

      <p className="p5-can-page__note">{t('phase5.termination.deenergizeWarning')}</p>
    </section>
  );
}

export function CanExitModal({
  iso,
  side,
  onCancel,
  onDiscard,
  onSave,
}: {
  readonly iso: '7638' | '12098';
  readonly side: 'tractor' | 'trailer';
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
    <div className="p5-modal-layer p5-modal-layer--voltage" data-overlay={'can-' + iso + '-' + side + '-exit'}>
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
            <button data-action="discard-can-result" type="button" onClick={() => setConfirmDiscard(true)}>{t('phase5.commonSave.exitWithoutSave')}</button>
            <button data-action="save-can-result" type="button" disabled={saving} onClick={saveAndExit}>{t('phase5.commonSave.saveAndExit')}</button>
          </div>
        ) : (
          <div className="p5-voltage-exit__confirm">
            <div className="p5-voltage-exit__warning">
              <span aria-hidden="true">!</span>
              <strong>{t('phase5.commonSave.exitWithoutSave')}</strong>
            </div>
            <div className="p5-voltage-exit__confirm-actions">
              <button type="button" onClick={() => setConfirmDiscard(false)}>{t('phase5.commonSave.returnToTest')}</button>
              <button data-action="confirm-discard-can-result" type="button" onClick={onDiscard}>{t('phase5.commonSave.exitWithoutSave')}</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

