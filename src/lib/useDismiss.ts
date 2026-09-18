import { useEffect, type RefObject } from 'react';

/** Disariya tiklandiginda ya da Esc'e basildiginda kapatir. */
export function useDismiss(
  ref: RefObject<HTMLElement>,
  active: boolean,
  onDismiss: () => void,
): void {
  useEffect(() => {
    if (!active) return;

    const onPointerDown = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss();
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onDismiss();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [ref, active, onDismiss]);
}
