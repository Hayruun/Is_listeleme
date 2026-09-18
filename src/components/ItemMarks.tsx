import { stepProgress } from '../lib/hierarchy';
import { daysSinceUpdate, isStale } from '../lib/staleness';
import { useStarred } from '../state/starred';
import type { WorkItem } from '../types';

/** Kisisel takip listesine ekleme/cikarma dugmesi. */
export function StarButton({ itemId }: { itemId: string }): JSX.Element {
  const { isStarred, toggleStar } = useStarred();
  const active = isStarred(itemId);

  return (
    <button
      type="button"
      className={`star${active ? ' star--on' : ''}`}
      aria-pressed={active}
      title={active ? 'Takip listemden çıkar' : 'Takip listeme ekle'}
      onClick={(event) => {
        event.stopPropagation();
        toggleStar(itemId);
      }}
    >
      {active ? '★' : '☆'}
    </button>
  );
}

/** "3/7 adım" rozeti; adim yoksa hicbir sey cizmez. */
export function StepBadge({ item }: { item: WorkItem }): JSX.Element | null {
  const steps = stepProgress(item);
  if (!steps) return null;

  const complete = steps.done === steps.total;
  return (
    <span
      className={`tag${complete ? ' tag--done' : ''}`}
      title={`${steps.done}/${steps.total} adım tamamlandı`}
    >
      ☑ {steps.done}/{steps.total}
    </span>
  );
}

/**
 * Bayatlama rozeti. Renk tek basina anlam tasimaz: kac gundur dokunulmadigi
 * rakamla yazilidir.
 */
export function StaleBadge({ item }: { item: WorkItem }): JSX.Element | null {
  if (!isStale(item)) return null;
  const days = daysSinceUpdate(item);

  return (
    <span className="badge badge--stale" title={`${days} gündür güncellenmedi`}>
      ⏱ {days}g
    </span>
  );
}
