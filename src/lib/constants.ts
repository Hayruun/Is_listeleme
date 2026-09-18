import type { Priority, WorkItemState, WorkItemType } from '../types';

interface TypeMeta {
  label: string;
  short: string;
  color: string;
  icon: string;
  /** Altina eklenebilecek tur(ler); ilki varsayilan. */
  children: WorkItemType[];
}

export const TYPE_META: Record<WorkItemType, TypeMeta> = {
  epic: {
    label: 'Epic',
    short: 'EPC',
    color: 'var(--type-epic)',
    icon: '◆',
    children: ['feature', 'story'],
  },
  feature: {
    label: 'Feature',
    short: 'FTR',
    color: 'var(--type-feature)',
    icon: '◈',
    children: ['story', 'bug'],
  },
  story: {
    label: 'User Story',
    short: 'STR',
    color: 'var(--type-story)',
    icon: '▣',
    children: ['task', 'bug'],
  },
  task: {
    label: 'Task',
    short: 'TSK',
    color: 'var(--type-task)',
    icon: '▪',
    children: [],
  },
  bug: {
    label: 'Bug',
    short: 'BUG',
    color: 'var(--type-bug)',
    icon: '●',
    children: ['task'],
  },
};

export const TYPE_ORDER: WorkItemType[] = ['epic', 'feature', 'story', 'task', 'bug'];

interface StateMeta {
  label: string;
  color: string;
  /** Tamamlanma yuzdesi hesabinda sayilsin mi. */
  completed: boolean;
}

export const STATE_META: Record<WorkItemState, StateMeta> = {
  new: { label: 'Yeni', color: 'var(--state-new)', completed: false },
  active: { label: 'Devam Ediyor', color: 'var(--state-active)', completed: false },
  blocked: { label: 'Engellendi', color: 'var(--state-blocked)', completed: false },
  review: { label: 'İncelemede', color: 'var(--state-review)', completed: false },
  done: { label: 'Tamamlandı', color: 'var(--state-done)', completed: true },
};

export const STATE_ORDER: WorkItemState[] = ['new', 'active', 'blocked', 'review', 'done'];

export const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  1: { label: 'P1 · Kritik', color: 'var(--prio-1)' },
  2: { label: 'P2 · Yüksek', color: 'var(--prio-2)' },
  3: { label: 'P3 · Orta', color: 'var(--prio-3)' },
  4: { label: 'P4 · Düşük', color: 'var(--prio-4)' },
};

export const PRIORITY_ORDER: Priority[] = [1, 2, 3, 4];

/** Yeni kisi eklenirken sirayla kullanilan avatar renkleri. */
export const PERSON_COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#64748b',
];
