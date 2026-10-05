import React, {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { useI18n, type TranslationKey } from '../../i18n';
import type { MainCardIndex } from '../../navigation';

const CARD_WIDTH = 240;
const CARD_GAP = 16;
const CARD_STRIDE = CARD_WIDTH + CARD_GAP;
const SWIPE_THRESHOLD = 44;

const moduleTitleKeys = [
  'phase5.module.iso7638Voltage',
  'phase5.module.iso12098Voltage',
  'phase5.module.cable',
  'phase5.module.canTermination',
  'phase5.module.lamp',
  'phase5.module.reports',
  'phase5.module.settings',
  'phase5.module.battery',
] as const satisfies readonly TranslationKey[];

const moduleSubtitleKeys = [
  'phase5.module.sideVoltage',
  'phase5.module.sideVoltage',
  'phase5.module.sideCable',
  'phase5.module.sideTermination',
  'phase5.module.sideLamp',
  'phase5.module.sideReport',
  'phase5.module.sideSettings',
  'phase5.module.sideBattery',
] as const satisfies readonly TranslationKey[];

const moduleGlyphs = ['V', 'V', '↔', 'Ω', 'L', 'R', '⚙', 'B'] as const;

function isInteractiveTarget(target: EventTarget | null): boolean {
  const candidate = target as (EventTarget & { closest?: (selector: string) => Element | null }) | null;
  return Boolean(
    candidate?.closest?.('button, a, input, select, textarea, [role="button"]'),
  );
}

export function RootCarousel({
  activeCardIndex,
  activeActions,
  onMove,
}: {
  readonly activeCardIndex: MainCardIndex;
  readonly activeActions?: ReactNode;
  readonly onMove: (direction: -1 | 1) => void;
}) {
  const { t } = useI18n();
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const dragXRef = useRef(0);

  const canMoveLeft = activeCardIndex > 0;
  const canMoveRight = activeCardIndex < moduleTitleKeys.length - 1;

  function updateDrag(next: number) {
    dragXRef.current = next;
    setDragX(next);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (isInteractiveTarget(event.target)) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    updateDrag(0);
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== event.pointerId) return;

    const rawDrag = event.clientX - startXRef.current;
    const atBlockedEdge =
      (rawDrag > 0 && !canMoveLeft) ||
      (rawDrag < 0 && !canMoveRight);

    updateDrag(atBlockedEdge ? rawDrag * .22 : rawDrag);
  }

  function settlePointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== event.pointerId) return;

    const distance = dragXRef.current;
    pointerIdRef.current = null;
    setDragging(false);

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    if (distance <= -SWIPE_THRESHOLD && canMoveRight) onMove(1);
    if (distance >= SWIPE_THRESHOLD && canMoveLeft) onMove(-1);

    updateDrag(0);
  }

  const transform =
    `translate3d(calc(-${CARD_WIDTH / 2}px - ${activeCardIndex * CARD_STRIDE}px + ${dragX}px), 0, 0)`;

  return (
    <div className="p5-legacy-carousel">
      <button
        className="p5-legacy-carousel__arrow p5-legacy-carousel__arrow--left"
        aria-label={t('navigation.back')}
        type="button"
        disabled={!canMoveLeft}
        onClick={() => onMove(-1)}
      >
        ‹
      </button>

      <div
        className="p5-legacy-carousel__viewport"
        role="region"
        aria-roledescription="carousel"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={settlePointer}
        onPointerCancel={settlePointer}
      >
        <div
          className={`p5-legacy-carousel__track${dragging ? ' is-dragging' : ''}`}
          style={{ transform }}
        >
          {moduleTitleKeys.map((titleKey, index) => {
            const cardIndex = index as MainCardIndex;
            const active = cardIndex === activeCardIndex;

            return (
              <div
                className={`p5-legacy-carousel__slide${active ? ' is-active' : ''}`}
                key={cardIndex}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} / ${moduleTitleKeys.length}`}
              >
                <article className="p5-legacy-module-card">
                  <div className="p5-legacy-module-card__wash" aria-hidden="true" />
                  <div className="p5-legacy-module-card__icon" aria-hidden="true">
                    <span>{moduleGlyphs[index]}</span>
                  </div>
                  <div className="p5-legacy-module-card__copy">
                    <h2>{t(titleKey)}</h2>
                    <p>{t(moduleSubtitleKeys[index])}</p>
                  </div>
                  {active && activeActions ? (
                    <div className="p5-legacy-module-card__actions">
                      {activeActions}
                    </div>
                  ) : null}
                </article>
              </div>
            );
          })}
        </div>
      </div>

      <button
        className="p5-legacy-carousel__arrow p5-legacy-carousel__arrow--right"
        aria-label={t('phase5.common.next')}
        type="button"
        disabled={!canMoveRight}
        onClick={() => onMove(1)}
      >
        ›
      </button>
    </div>
  );
}
