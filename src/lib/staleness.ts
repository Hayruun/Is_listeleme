import type { WorkItem } from '../types';

/** Bu kadar gundur dokunulmamis, akistaki isler "bayatlamis" sayilir. */
export const STALE_DAYS = 14;

const DAY = 24 * 60 * 60 * 1000;

/** Son guncellemeden bu yana gecen tam gun sayisi. */
export function daysSinceUpdate(item: WorkItem, now = Date.now()): number {
  const updated = new Date(item.updatedAt).getTime();
  if (Number.isNaN(updated)) return 0;
  return Math.max(0, Math.floor((now - updated) / DAY));
}

/**
 * Bayatlama yalnizca AKISTAKI isler icin anlamlidir: henuz baslanmamis bir
 * backlog kalemi uzun suredir duruyor diye sorun degildir, ama "devam ediyor"
 * diyip haftalardir kimsenin dokunmadigi bir is sorundur.
 */
export function isStale(item: WorkItem, days = STALE_DAYS, now = Date.now()): boolean {
  if (item.state !== 'active' && item.state !== 'blocked' && item.state !== 'review') {
    return false;
  }
  return daysSinceUpdate(item, now) >= days;
}
