import type { Priority, WorkItemState, WorkItemType } from '../types';

interface TypeMeta {
  label: string;
  short: string;
  color: string;
  /** Rozet zemininin uzerine yazilacak murekkep; palete gore hesaplanir. */
  ink: string;
  icon: string;
  /** Altina eklenebilecek tur(ler); ilki varsayilan. */
  children: WorkItemType[];
}

export const TYPE_META: Record<WorkItemType, TypeMeta> = {
  epic: {
    label: 'Epic',
    short: 'EPC',
    color: 'var(--type-epic)',
    ink: 'var(--type-epic-ink)',
    icon: '◆',
    children: ['feature', 'story'],
  },
  feature: {
    label: 'Feature',
    short: 'FTR',
    color: 'var(--type-feature)',
    ink: 'var(--type-feature-ink)',
    icon: '◈',
    children: ['story', 'bug'],
  },
  story: {
    label: 'User Story',
    short: 'STR',
    color: 'var(--type-story)',
    ink: 'var(--type-story-ink)',
    icon: '▣',
    children: ['task', 'bug'],
  },
  task: {
    label: 'Task',
    short: 'TSK',
    color: 'var(--type-task)',
    ink: 'var(--type-task-ink)',
    icon: '▪',
    children: [],
  },
  bug: {
    label: 'Bug',
    short: 'BUG',
    color: 'var(--type-bug)',
    ink: 'var(--type-bug-ink)',
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

export const PRIORITY_META: Record<Priority, { label: string; short: string; color: string }> = {
  1: { label: 'P1 · Kritik', short: 'Kritik', color: 'var(--prio-1)' },
  2: { label: 'P2 · Yüksek', short: 'Yüksek', color: 'var(--prio-2)' },
  3: { label: 'P3 · Orta', short: 'Orta', color: 'var(--prio-3)' },
  4: { label: 'P4 · Düşük', short: 'Düşük', color: 'var(--prio-4)' },
};

export const PRIORITY_ORDER: Priority[] = [1, 2, 3, 4];

/**
 * Avatar renkleri. Hepsi paletten turetildi ve beyaz metinle okunabilecek
 * kadar koyu tutuldu.
 */
export const PERSON_COLORS = [
  '#105666',
  '#0a3323',
  '#6e8547',
  '#b4645c',
  '#2e7d6b',
  '#3e6e8c',
  '#8a6a3c',
  '#5c7a3a',
  '#a05a52',
  '#4a6b7c',
];
