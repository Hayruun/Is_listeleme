import type { WorkItemState, WorkItemType } from '../types';

export interface Palette {
  id: string;
  name: string;
  note: string;
  /**
   * Bes marka rengi. Sirasiyla epic, feature, user story, task ve bug
   * turlerine karsilik gelir; vurgu rengi accentIndex ile secilir.
   */
  colors: [string, string, string, string, string];
  accentIndex: number;
  /** Palete ozel semantik durum renkleri; verilmezse varsayilanlar kullanilir. */
  states?: Record<WorkItemState, string>;
  /** Renk korlugune uygun oldugu isaretlenmis paletler rozetlenir. */
  accessible?: boolean;
}

export const TYPE_SLOTS: WorkItemType[] = ['epic', 'feature', 'story', 'task', 'bug'];

export const SLOT_LABELS = ['Epic', 'Feature', 'User Story', 'Task', 'Bug'];

/** Palet bir sey soylemezse kullanilan semantik durum renkleri. */
export const DEFAULT_STATES: Record<WorkItemState, string> = {
  new: '#64748b',
  active: '#2563eb',
  blocked: '#dc2626',
  review: '#d97706',
  done: '#16a34a',
};

export const PALETTES: Palette[] = [
  {
    id: 'default',
    name: 'Varsayılan',
    note: 'Nötr, yüksek kontrastlı başlangıç teması.',
    colors: ['#4f46e5', '#0284c7', '#0d9488', '#64748b', '#e11d48'],
    accentIndex: 0,
  },
  {
    id: 'accessible',
    name: 'Erişilebilir',
    note: 'Renk körlüğüne uygun (Okabe–Ito). Üç yaygın tip için de ayırt edilebilir.',
    colors: ['#0072b2', '#009e73', '#e69f00', '#56626e', '#d55e00'],
    accentIndex: 0,
    accessible: true,
    states: {
      new: '#56626e',
      active: '#0072b2',
      blocked: '#d55e00',
      review: '#e69f00',
      done: '#009e73',
    },
  },
  {
    id: 'lotus',
    name: 'Nilüfer',
    note: 'Koyu yeşil, yosun, bej ve gül kurusu.',
    colors: ['#0a3323', '#105666', '#839958', '#8a9384', '#d3968c'],
    accentIndex: 1,
    states: {
      new: '#7b8a7e',
      active: '#105666',
      blocked: '#b4645c',
      review: '#8f7526',
      done: '#5f7340',
    },
  },
  {
    id: 'forest',
    name: 'Orman',
    note: 'Koyu yeşil, mavi-gri, yosun ve vanilya.',
    colors: ['#243c2c', '#59789f', '#7a9445', '#8d9aa6', '#9a8226'],
    accentIndex: 1,
  },
  {
    id: 'navy',
    name: 'Lacivert & Pudra',
    note: 'Lacivert, gök mavisi ve azalea pembesi.',
    colors: ['#2f4156', '#3d7ea6', '#5f8a7d', '#8a8fa3', '#c2547b'],
    accentIndex: 0,
  },
];

export const DEFAULT_PALETTE_ID = 'default';

export function findPalette(id: string): Palette | undefined {
  return PALETTES.find((palette) => palette.id === id);
}
