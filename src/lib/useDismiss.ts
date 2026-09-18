import { useEffect, type RefObject } from 'react';
import { useEscapeLayer } from './escapeStack';

/**
 * Disariya tiklandiginda ya da Esc'e basildiginda kapatir.
 * Esc, katman yigini uzerinden ele alinir: acik bir secici varken Esc
 * yalnizca seciciyi kapatir, altindaki panel acik kalir.
 */
export function useDismiss(
  ref: RefObject<HTMLElement>,
  active: boolean,
  onDismiss: () => void,
): void {
  useEscapeLayer(active, onDismiss);

  useEffect(() => {
    if (!active) return;

    const onPointerDown = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss();
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [ref, active, onDismiss]);
}
