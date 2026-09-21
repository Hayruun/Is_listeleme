import { useMemo, useRef, useState } from 'react';
import {
  PRIORITY_META,
  PRIORITY_ORDER,
  STATE_META,
  STATE_ORDER,
  TYPE_META,
  TYPE_ORDER,
} from '../lib/constants';
import { EMPTY_FILTERS, type FilterState } from '../lib/filters';
import { STALE_DAYS } from '../lib/staleness';
import { useDismiss } from '../lib/useDismiss';
import { useBoard } from '../state/boardStore';
import { Avatar } from './Avatar';
import type { Priority, WorkItemState, WorkItemType } from '../types';

interface Props {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  /** "Bana atananlar" kisayolu icin oturum acan kisinin kimligi. */
  currentUserId: string;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

/** Uygulanmis her filtre degeri icin bir rozet: etiketi ve kaldirma islevi. */
interface ActiveFilter {
  key: string;
  label: string;
  remove: () => void;
}

/**
 * Filtre cubugu.
 *
 * Yirmiden fazla cip surekli ekranda durunca arayuz dagiliyordu; secenekler
 * tek bir "Filtreler" dugmesinin altina toplandi. Acik filtreler gizli
 * kalmasin diye, secilen her deger cubugun altinda kaldirilabilir bir rozet
 * olarak gorunmeye devam eder.
 */
export function FilterBar({ filters, onChange, currentUserId }: Props): JSX.Element {
  const { board } = useBoard();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useDismiss(panelRef, open, () => setOpen(false));

  // Kisayol, kisi filtresinin kendisini kullanir; boylece digerleriyle tutarli
  // davranir ve ayri bir durum tutmaya gerek kalmaz.
  const onlyMine = filters.assignees.includes(currentUserId);

  const active = useMemo<ActiveFilter[]>(() => {
    const list: ActiveFilter[] = [];

    for (const type of filters.types) {
      list.push({
        key: `type-${type}`,
        label: TYPE_META[type].label,
        remove: () => onChange({ ...filters, types: toggle(filters.types, type) }),
      });
    }
    for (const state of filters.states) {
      list.push({
        key: `state-${state}`,
        label: STATE_META[state].label,
        remove: () => onChange({ ...filters, states: toggle(filters.states, state) }),
      });
    }
    for (const priority of filters.priorities) {
      list.push({
        key: `prio-${priority}`,
        label: PRIORITY_META[priority].label,
        remove: () => onChange({ ...filters, priorities: toggle(filters.priorities, priority) }),
      });
    }
    for (const personId of filters.assignees) {
      const person = board.people.find((entry) => entry.id === personId);
      list.push({
        key: `person-${personId}`,
        label: personId === currentUserId ? 'Bana atananlar' : (person?.name ?? 'Bilinmeyen kişi'),
        remove: () => onChange({ ...filters, assignees: toggle(filters.assignees, personId) }),
      });
    }
    if (filters.starredOnly) {
      list.push({
        key: 'starred',
        label: 'Takip listem',
        remove: () => onChange({ ...filters, starredOnly: false }),
      });
    }
    if (filters.staleOnly) {
      list.push({
        key: 'stale',
        label: 'Bayatlamış',
        remove: () => onChange({ ...filters, staleOnly: false }),
      });
    }
    if (filters.hideDone) {
      list.push({
        key: 'hideDone',
        label: 'Tamamlananlar gizli',
        remove: () => onChange({ ...filters, hideDone: false }),
      });
    }
    return list;
  }, [filters, board.people, currentUserId, onChange]);

  return (
    <div className="filters">
      <div className="filters__bar">
        <div className="picker" ref={panelRef}>
          <button
            type="button"
            className={`btn btn--sm${active.length > 0 ? ' btn--primary' : ''}`}
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-haspopup="dialog"
          >
            <FunnelIcon />
            Filtreler
            {active.length > 0 && <span className="filters__count">{active.length}</span>}
          </button>

          {open && (
            <div className="filters__panel" role="dialog" aria-label="Filtreler">
              <Group title="Hızlı filtreler">
                <Chip
                  pressed={onlyMine}
                  onClick={() =>
                    onChange({ ...filters, assignees: toggle(filters.assignees, currentUserId) })
                  }
                >
                  <span aria-hidden="true">★</span> Bana atananlar
                </Chip>
                <Chip
                  pressed={filters.starredOnly}
                  onClick={() => onChange({ ...filters, starredOnly: !filters.starredOnly })}
                >
                  <span aria-hidden="true">★</span> Takip listem
                </Chip>
                <Chip
                  pressed={filters.staleOnly}
                  onClick={() => onChange({ ...filters, staleOnly: !filters.staleOnly })}
                  title={`Akıştaki ama ${STALE_DAYS} gündür güncellenmemiş işler`}
                >
                  <span aria-hidden="true">⏱</span> Bayatlamış
                </Chip>
                <Chip
                  pressed={filters.hideDone}
                  onClick={() => onChange({ ...filters, hideDone: !filters.hideDone })}
                  title="Tamamlanmış epic kutularını listeden çıkarır"
                >
                  Tamamlanan epic’leri gizle
                </Chip>
              </Group>

              <Group title="Tür">
                {TYPE_ORDER.map((type: WorkItemType) => (
                  <Chip
                    key={type}
                    pressed={filters.types.includes(type)}
                    onClick={() => onChange({ ...filters, types: toggle(filters.types, type) })}
                  >
                    <span aria-hidden="true" style={{ color: TYPE_META[type].color }}>
                      {TYPE_META[type].icon}
                    </span>
                    {TYPE_META[type].label}
                  </Chip>
                ))}
              </Group>

              <Group title="Durum">
                {STATE_ORDER.map((state: WorkItemState) => (
                  <Chip
                    key={state}
                    pressed={filters.states.includes(state)}
                    onClick={() => onChange({ ...filters, states: toggle(filters.states, state) })}
                  >
                    <span
                      className="badge__dot"
                      aria-hidden="true"
                      style={{ background: STATE_META[state].color }}
                    />
                    {STATE_META[state].label}
                  </Chip>
                ))}
              </Group>

              <Group title="Öncelik">
                {PRIORITY_ORDER.map((priority: Priority) => (
                  <Chip
                    key={priority}
                    pressed={filters.priorities.includes(priority)}
                    onClick={() =>
                      onChange({ ...filters, priorities: toggle(filters.priorities, priority) })
                    }
                  >
                    <span
                      className="badge__dot"
                      aria-hidden="true"
                      style={{ background: PRIORITY_META[priority].color }}
                    />
                    {PRIORITY_META[priority].label}
                  </Chip>
                ))}
              </Group>

              {board.people.length > 0 && (
                <Group title="Kişi">
                  {board.people.map((person) => (
                    <Chip
                      key={person.id}
                      pressed={filters.assignees.includes(person.id)}
                      onClick={() =>
                        onChange({ ...filters, assignees: toggle(filters.assignees, person.id) })
                      }
                    >
                      <Avatar person={person} size="sm" />
                      {person.name}
                    </Chip>
                  ))}
                </Group>
              )}

              <div className="filters__footer">
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={() => onChange(EMPTY_FILTERS)}
                  disabled={active.length === 0 && filters.query.trim() === ''}
                >
                  Tümünü temizle
                </button>
                <span className="spacer" />
                <button type="button" className="btn btn--sm" onClick={() => setOpen(false)}>
                  Kapat
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="search">
          <span className="search__icon" aria-hidden="true">
            ⌕
          </span>
          <input
            className="input"
            value={filters.query}
            maxLength={120}
            placeholder="Başlık, açıklama, etiket veya kişi ara…"
            onChange={(event) => onChange({ ...filters, query: event.target.value })}
            aria-label="Ara"
          />
        </div>
      </div>

      {active.length > 0 && (
        <div className="filters__active">
          {active.map((entry) => (
            <button
              key={entry.key}
              type="button"
              className="activefilter"
              onClick={entry.remove}
              title={`"${entry.label}" filtresini kaldır`}
            >
              {entry.label}
              <span className="activefilter__x" aria-hidden="true">
                ×
              </span>
            </button>
          ))}

          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={() => onChange({ ...EMPTY_FILTERS, query: filters.query })}
          >
            Temizle
          </button>
        </div>
      )}
    </div>
  );
}

/** Huni simgesi; Unicode karsiliklari platformlar arasi tutarsiz cizildigi icin cizim. */
function FunnelIcon(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path
        d="M1 2h10L7.2 6.4v3.3L4.8 11V6.4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="filters__group">
      <span className="field__label">{title}</span>
      <div className="filters__chips">{children}</div>
    </div>
  );
}

function Chip({
  pressed,
  onClick,
  title,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <button type="button" className="chip" aria-pressed={pressed} onClick={onClick} title={title}>
      {children}
    </button>
  );
}
