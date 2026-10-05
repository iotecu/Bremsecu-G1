import React, {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { assetUrl } from '../../assets';
import { useI18n, type TranslationKey } from '../../i18n';
import type { MainCardIndex } from '../../navigation';

const CARD_WIDTH = 328;
const CARD_GAP = 14;
const CARD_STRIDE = CARD_WIDTH + CARD_GAP;
const SWIPE_THRESHOLD = 48;

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

const moduleSideKeys = [
  'phase5.module.sideVoltage',
  'phase5.module.sideVoltage',
  'phase5.module.sideCable',
  'phase5.module.sideTermination',
  'phase5.module.sideLamp',
  'phase5.module.sideReport',
  'phase5.module.sideSettings',
  'phase5.module.sideBattery',
] as const satisfies readonly TranslationKey[];

const moduleAssets = [
  'iso7638-socket.png',
  'iso12098-socket.png',
  'cable-662-5072.png',
  'resistance.svg',
  'lamp-test.png',
  'report-2.svg',
  'icon-settings-large.svg',
  'battery-status.svg',
] as const;

const moduleAccents = [
  '#FFFFFF',
  '#FFFFFF',
  '#2375B9',
  '#ED9F0E',
  '#B92323',
  '#0ED6ED',
  '#CDF711',
  '#1115F7',
] as const;

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element &&
    Boolean(target.closest('button, a, input, select, textarea, [role="button"]'));
}

function ModulePreview({ index }: { readonly index: MainCardIndex }) {
  const { t } = useI18n();

  return (
    <div
      className="p5-selection p5-selection--carousel-preview"
      style={{ '--module-accent': moduleAccents[index] } as CSSProperties}
      aria-hidden="true"
    >
      <div className="p5-selection__side">
        <span>{t(moduleSideKeys[index])}</span>
      </div>
      <article className="p5-selection__card p5-selection__card--carousel-preview">
        <img
          className="p5-selection__image"
          src={assetUrl(moduleAssets[index])}
          alt=""
        />
        <h1>{t(moduleTitleKeys[index])}</h1>
      </article>
    </div>
  );
}

export function RootCarousel({
  activeCardIndex,
  children,
  onMove,
}: {
  readonly activeCardIndex: MainCardIndex;
  readonly children: ReactNode;
  readonly onMove: (direction: -1 | 1) => void;
}) {
  const { t } = useI18n();
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const dragXRef = useRef(0);

  const canMoveLeft = activeCardIndex > 0;
  const canMoveRight = activeCardIndex < 7;

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
    updateDrag(atBlockedEdge ? rawDrag * 0.22 : rawDrag);
  }

  function settlePointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== event.pointerId) return;

    const distance = dragXRef.current;
    pointerIdRef.current = null;
    setDragging(false);

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    if (distance <= -SWIPE_THRESHOLD && canMoveRight) {
      onMove(1);
    } else if (distance >= SWIPE_THRESHOLD && canMoveLeft) {
      onMove(-1);
    }

    updateDrag(0);
  }

  const transform =
    `translate3d(calc(-${CARD_WIDTH / 2}px - ${activeCardIndex * CARD_STRIDE}px + ${dragX}px), 0, 0)`;

  return (
    <>
      <button
        className="p5-carousel__arrow p5-carousel__arrow--left"
        aria-label={t('navigation.back')}
        type="button"
        disabled={!canMoveLeft}
        onClick={() => onMove(-1)}
      >
        ‹
      </button>

      <div
        className="p5-carousel__viewport"
        role="region"
        aria-roledescription="carousel"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={settlePointer}
        onPointerCancel={settlePointer}
      >
        <div
          className={`p5-carousel__track${dragging ? ' is-dragging' : ''}`}
          style={{ transform }}
        >
          {moduleTitleKeys.map((_titleKey, index) => {
            const cardIndex = index as MainCardIndex;
            return (
              <div
                className={`p5-carousel__slide${cardIndex === activeCardIndex ? ' is-active' : ''}`}
                key={cardIndex}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} / ${moduleTitleKeys.length}`}
              >
                {cardIndex === activeCardIndex ? children : <ModulePreview index={cardIndex} />}
              </div>
            );
          })}
        </div>
      </div>

      {canMoveRight ? (
        <button
          className="p5-carousel__arrow p5-carousel__arrow--right"
          aria-label={t('phase5.common.next')}
          type="button"
          onClick={() => onMove(1)}
        >
          ›
        </button>
      ) : (
        <span
          className="p5-carousel__arrow p5-carousel__arrow--right p5-carousel__arrow--decorative"
          aria-hidden="true"
        >
          ›
        </span>
      )}
    </>
  );
}
