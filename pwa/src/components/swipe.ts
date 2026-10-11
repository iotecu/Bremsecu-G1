import { useRef, type PointerEvent } from 'react';

/** One horizontal movement; vertical scrolling and interactive controls remain native. */
export function useCarouselSwipe(onMove: (direction: -1 | 1) => void) {
  const start = useRef<{ x:number; y:number; id:number } | null>(null);
  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (!event.isPrimary || event.button !== 0 || (event.target as HTMLElement).closest('button,input,select,textarea')) return;
      event.stopPropagation();
      start.current = { x:event.clientX, y:event.clientY, id:event.pointerId };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      const origin = start.current; start.current = null;
      if (!origin || origin.id !== event.pointerId) return;
      event.stopPropagation();
      const dx = event.clientX-origin.x, dy=event.clientY-origin.y;
      if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)*1.3) onMove(dx < 0 ? 1 : -1);
    },
    onPointerCancel() { start.current=null; },
  };
}
