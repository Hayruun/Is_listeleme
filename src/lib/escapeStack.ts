import { useEffect, useRef } from 'react';

/**
 * Esc tusu icin katman yigini.
 *
 * Her katmanin kendi document dinleyicisini kurmasi, ayni olayda birden fazla
 * katmanin birden kapanmasina yol aciyordu (secici acikken Esc hem seciciyi hem
 * altindaki paneli kapatiyordu). Burada TEK bir dinleyici var ve Esc her zaman
 * yiginin en ustundeki katmana gider.
 */
type Layer = { close: () => void };

const stack: Layer[] = [];
let installed = false;

function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;
  const top = stack[stack.length - 1];
  if (!top) return;
  event.stopPropagation();
  top.close();
}

function install(): void {
  if (installed) return;
  document.addEventListener('keydown', onKeyDown);
  installed = true;
}

/**
 * Bilesen acik oldugu surece kendini yigina ekler. Esc'e basildiginda
 * yalnizca en ustteki katmanin kapatma islevi calisir.
 */
export function useEscapeLayer(active: boolean, onEscape: () => void): void {
  // Kapatma islevi her cizimde degisebilir; yigindaki kayit sabit kalsin diye
  // ref uzerinden okunur.
  const latest = useRef(onEscape);
  latest.current = onEscape;

  useEffect(() => {
    if (!active) return;
    install();

    const layer: Layer = { close: () => latest.current() };
    stack.push(layer);

    return () => {
      const index = stack.indexOf(layer);
      if (index !== -1) stack.splice(index, 1);
    };
  }, [active]);
}
