import { PRIORITY_META, STATE_META, TYPE_META } from '../lib/constants';
import type { Priority, WorkItemState, WorkItemType } from '../types';

export function TypeChip({ type, compact = false }: { type: WorkItemType; compact?: boolean }): JSX.Element {
  const meta = TYPE_META[type];
  return (
    <span className="type-chip" style={{ background: meta.color, color: meta.ink }}>
      <span aria-hidden="true">{meta.icon}</span>
      {compact ? meta.short : meta.label}
    </span>
  );
}

export function StateBadge({ state }: { state: WorkItemState }): JSX.Element {
  const meta = STATE_META[state];
  return (
    <span
      className="badge"
      style={{
        color: meta.color,
        background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
        borderColor: `color-mix(in srgb, ${meta.color} 28%, transparent)`,
      }}
    >
      <span className="badge__dot" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

/**
 * Oncelik rozeti.
 *
 * Renk sirali bir ramp'in basamagi: P1 en koyu, P4 en soluk. Murekkep dolguya
 * gore secildigi icin her basamak okunur kalir ve "P1".."P4" metni her zaman
 * yazili oldugundan anlam hicbir zaman yalnizca renge emanet degildir.
 */
export function PriorityBadge({
  priority,
  withLabel = false,
}: {
  priority: Priority;
  withLabel?: boolean;
}): JSX.Element {
  const meta = PRIORITY_META[priority];

  return (
    <span
      className="badge"
      style={{
        background: meta.color,
        color: `var(--prio-${priority}-ink)`,
        borderColor: 'transparent',
      }}
      title={meta.label}
    >
      P{priority}
      {withLabel && ` · ${meta.short}`}
    </span>
  );
}

export function ProgressBar({ percent }: { percent: number }): JSX.Element {
  const value = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="progress__fill" style={{ width: `${value}%` }} />
    </div>
  );
}
