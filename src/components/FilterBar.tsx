import { PRIORITY_ORDER, STATE_META, STATE_ORDER, TYPE_META, TYPE_ORDER } from '../lib/constants';
import { EMPTY_FILTERS, isFilterActive, type FilterState } from '../lib/filters';
import { useBoard } from '../state/boardStore';
import { Avatar } from './Avatar';
import type { Priority, WorkItemState, WorkItemType } from '../types';

interface Props {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

export function FilterBar({ filters, onChange }: Props): JSX.Element {
  const { board } = useBoard();

  return (
    <div className="filters">
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

      <div className="row row--wrap" style={{ gap: 6 }}>
        {TYPE_ORDER.map((type: WorkItemType) => (
          <button
            key={type}
            type="button"
            className="chip"
            aria-pressed={filters.types.includes(type)}
            onClick={() => onChange({ ...filters, types: toggle(filters.types, type) })}
          >
            <span aria-hidden="true" style={{ color: TYPE_META[type].color }}>
              {TYPE_META[type].icon}
            </span>
            {TYPE_META[type].label}
          </button>
        ))}
      </div>

      <div className="row row--wrap" style={{ gap: 6 }}>
        {STATE_ORDER.map((state: WorkItemState) => (
          <button
            key={state}
            type="button"
            className="chip"
            aria-pressed={filters.states.includes(state)}
            onClick={() => onChange({ ...filters, states: toggle(filters.states, state) })}
          >
            <span
              className="badge__dot"
              aria-hidden="true"
              style={{ background: STATE_META[state].color }}
            />
            {STATE_META[state].label}
          </button>
        ))}
      </div>

      <div className="row row--wrap" style={{ gap: 6 }}>
        {PRIORITY_ORDER.map((priority: Priority) => (
          <button
            key={priority}
            type="button"
            className="chip"
            aria-pressed={filters.priorities.includes(priority)}
            onClick={() => onChange({ ...filters, priorities: toggle(filters.priorities, priority) })}
          >
            P{priority}
          </button>
        ))}
      </div>

      {board.people.length > 0 && (
        <div className="row row--wrap" style={{ gap: 6 }}>
          {board.people.map((person) => (
            <button
              key={person.id}
              type="button"
              className="chip"
              aria-pressed={filters.assignees.includes(person.id)}
              onClick={() => onChange({ ...filters, assignees: toggle(filters.assignees, person.id) })}
              title={person.name}
            >
              <Avatar person={person} size="sm" />
              {person.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        className="chip"
        aria-pressed={filters.hideDone}
        onClick={() => onChange({ ...filters, hideDone: !filters.hideDone })}
        title="Tamamlanmış epic kutularını listeden çıkarır"
      >
        Tamamlanan epic’leri gizle
      </button>

      {isFilterActive(filters) && (
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => onChange(EMPTY_FILTERS)}>
          Filtreleri temizle
        </button>
      )}
    </div>
  );
}
