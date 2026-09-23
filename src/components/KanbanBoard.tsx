import { useMemo, useState, type DragEvent } from 'react';
import { PRIORITY_META, STATE_META, STATE_ORDER, TYPE_META } from '../lib/constants';
import type { FilterState } from '../lib/filters';
import { ancestorsOf, flatten, type TreeNode } from '../lib/hierarchy';
import { useBoard } from '../state/boardStore';
import type { ColorBy } from '../lib/appearance';
import { Avatar, AvatarStack } from './Avatar';
import { PriorityBadge } from './Badges';
import { StaleBadge, StarButton, StepBadge } from './ItemMarks';
import type { WorkItem, WorkItemState } from '../types';

interface Props {
  /** Filtreden gecmis agac; kartlar bunun icindeki user story'lerden uretilir. */
  nodes: TreeNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  colorBy: ColorBy;
  filters: FilterState;
  onFiltersChange: (next: FilterState) => void;
  currentUserId: string;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

/**
 * Durum sutunlarina gore pano gorunumu.
 *
 * Panoda yalnizca user story'ler kart olur: sprint'te takip edilen birim
 * odur. Kartin ustunde bagli oldugu epic yazar; story'nin task'lari kartin
 * icinde acilip kapanan bir listede durur. Kart baska sutuna suruklenince
 * story'nin durumu degisir.
 */
export function KanbanBoard({
  nodes,
  selectedId,
  onSelect,
  colorBy,
  filters,
  onFiltersChange,
  currentUserId,
}: Props): JSX.Element {
  const { board, dispatch } = useBoard();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overState, setOverState] = useState<WorkItemState | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  // Kisi filtresinde story, kendisi ya da task'larindan biri eslesirse
  // agacta kalir (filterTree baglami korur); bu yuzden duzlestirmek yeterli.
  const stories = useMemo(
    () =>
      flatten(nodes)
        .map((node) => node.item)
        .filter((item) => item.type === 'story'),
    [nodes],
  );

  const tasksOf = useMemo(() => {
    const map = new Map<string, WorkItem[]>();
    for (const item of board.items) {
      if (!item.parentId || (item.type !== 'task' && item.type !== 'bug')) continue;
      const list = map.get(item.parentId);
      if (list) list.push(item);
      else map.set(item.parentId, [item]);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return map;
  }, [board.items]);

  const columns = useMemo(() => {
    const grouped = new Map<WorkItemState, WorkItem[]>(
      STATE_ORDER.map((state) => [state, [] as WorkItem[]]),
    );
    for (const item of stories) {
      grouped.get(item.state)?.push(item);
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => a.priority - b.priority || a.order - b.order);
    }
    return grouped;
  }, [stories]);

  const dropOn = (event: DragEvent, state: WorkItemState): void => {
    event.preventDefault();
    if (draggingId) {
      dispatch({ type: 'item/patch', id: draggingId, patch: { state } });
    }
    setDraggingId(null);
    setOverState(null);
  };

  const toggleOpen = (id: string): void => {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const personFilter = filters.assignees;
  // Kisi secildiyse kartlar o kisinin isini one cikarir, digerleri soluk kalir.
  const isHighlighted = (task: WorkItem): boolean =>
    personFilter.length === 0 || personFilter.some((id) => task.assignees.includes(id));

  const people = [...board.people].sort(
    (a, b) =>
      Number(b.id === currentUserId) - Number(a.id === currentUserId) ||
      a.name.localeCompare(b.name, 'tr-TR'),
  );

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="kanban__toolbar">
        <div className="kanban__people" role="group" aria-label="Kişiye göre süz">
          <span className="kanban__people-label">Kişi</span>
          <button
            type="button"
            className="chip"
            aria-pressed={personFilter.length === 0}
            onClick={() => onFiltersChange({ ...filters, assignees: [] })}
          >
            Herkes
          </button>
          {people.map((person) => (
            <button
              key={person.id}
              type="button"
              className="chip"
              aria-pressed={personFilter.includes(person.id)}
              onClick={() =>
                onFiltersChange({ ...filters, assignees: toggle(personFilter, person.id) })
              }
            >
              <Avatar person={person} size="sm" />
              {person.id === currentUserId ? `${person.name} (ben)` : person.name}
            </button>
          ))}
        </div>
        <span className="spacer" />
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          onClick={() =>
            setOpenIds(new Set(stories.filter((s) => tasksOf.has(s.id)).map((s) => s.id)))
          }
        >
          Taskları aç
        </button>
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => setOpenIds(new Set())}>
          Taskları kapat
        </button>
      </div>

      <div className="kanban">
        {STATE_ORDER.map((state) => {
          const list = columns.get(state) ?? [];
          const meta = STATE_META[state];
          return (
            <section
              key={state}
              className={`kanban__col${overState === state ? ' kanban__col--over' : ''}`}
              onDragOver={(event) => {
                if (!draggingId) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setOverState(state);
              }}
              onDragLeave={() => setOverState((current) => (current === state ? null : current))}
              onDrop={(event) => dropOn(event, state)}
            >
              <header className="kanban__head">
                <span className="badge__dot" aria-hidden="true" style={{ background: meta.color }} />
                <span className="kanban__title">{meta.label}</span>
                <span className="kanban__count">{list.length}</span>
              </header>

              <div className="kanban__list">
                {list.map((item) => {
                  const assignees = board.people.filter((person) =>
                    item.assignees.includes(person.id),
                  );
                  const chain = ancestorsOf(board, item.id).reverse();
                  const epic = chain.find((entry) => entry.type === 'epic') ?? null;
                  const between = chain.filter((entry) => entry !== epic).map((entry) => entry.title);
                  const tasks = tasksOf.get(item.id) ?? [];
                  const doneCount = tasks.filter((task) => task.state === 'done').length;
                  const open = openIds.has(item.id);

                  return (
                    <article
                      key={item.id}
                      className={`kanban__card${selectedId === item.id ? ' kanban__card--selected' : ''}${
                        draggingId === item.id ? ' is-dragging' : ''
                      }`}
                      style={{
                        borderLeft: `3px solid ${
                          colorBy === 'priority'
                            ? PRIORITY_META[item.priority].color
                            : TYPE_META[item.type].color
                        }`,
                      }}
                      draggable
                      onDragStart={(event) => {
                        setDraggingId(item.id);
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', item.id);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setOverState(null);
                      }}
                      onClick={() => onSelect(item.id)}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onSelect(item.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="kanban__card-top">
                        {epic ? (
                          <span className="kanban__epic" title={`Epic: ${epic.title}`}>
                            <span aria-hidden="true">{TYPE_META.epic.icon}</span>
                            <span className="kanban__epic-name">{epic.title}</span>
                          </span>
                        ) : (
                          <span className="kanban__epic kanban__epic--none">Epic’e bağlı değil</span>
                        )}
                        <span className="spacer" />
                        <StarButton itemId={item.id} />
                      </div>

                      {between.length > 0 && (
                        <p className="kanban__path" title={between.join(' › ')}>
                          {between.join(' › ')}
                        </p>
                      )}

                      <p className="kanban__card-title">{item.title}</p>

                      <div className="kanban__card-bottom">
                        <PriorityBadge priority={item.priority} />
                        {item.effort !== null && <span className="tag">{item.effort} sp</span>}
                        <StepBadge item={item} />
                        <StaleBadge item={item} />
                        <span className="spacer" />
                        {item.dueDate && (
                          <span className="faint" style={{ fontSize: 11 }}>
                            {new Date(item.dueDate).toLocaleDateString('tr-TR')}
                          </span>
                        )}
                        <AvatarStack
                          people={assignees}
                          size="sm"
                          max={3}
                          emptyLabel="—"
                          ownerIds={item.owners}
                        />
                      </div>

                      {tasks.length > 0 ? (
                        <button
                          type="button"
                          className="kanban__tasks-toggle"
                          aria-expanded={open}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleOpen(item.id);
                          }}
                        >
                          <span className="kanban__caret" aria-hidden="true">
                            ▶
                          </span>
                          Tasklar
                          <span className="kanban__tasks-count">
                            {doneCount}/{tasks.length}
                          </span>
                        </button>
                      ) : (
                        <p className="kanban__tasks-none">Task yok</p>
                      )}

                      {open && tasks.length > 0 && (
                        <ul className="kanban__tasks" onClick={(event) => event.stopPropagation()}>
                          {tasks.map((task) => {
                            const taskPeople = board.people.filter((person) =>
                              task.assignees.includes(person.id),
                            );
                            const done = task.state === 'done';
                            return (
                              <li
                                key={task.id}
                                className={`kanban__task${done ? ' is-done' : ''}${
                                  isHighlighted(task) ? '' : ' is-dim'
                                }${selectedId === task.id ? ' is-selected' : ''}`}
                              >
                                <input
                                  id={`task-done-${task.id}`}
                                  type="checkbox"
                                  checked={done}
                                  aria-label={done ? 'Tamamlanmadı yap' : 'Tamamlandı yap'}
                                  onChange={() =>
                                    dispatch({
                                      type: 'item/patch',
                                      id: task.id,
                                      patch: { state: done ? 'new' : 'done' },
                                    })
                                  }
                                />
                                {task.state !== 'new' && !done && (
                                  <span
                                    className="badge__dot"
                                    title={STATE_META[task.state].label}
                                    style={{ background: STATE_META[task.state].color }}
                                  />
                                )}
                                <button
                                  type="button"
                                  className="kanban__task-title"
                                  onClick={() => onSelect(task.id)}
                                >
                                  {task.title}
                                </button>
                                <AvatarStack
                                  people={taskPeople}
                                  size="sm"
                                  max={2}
                                  emptyLabel=""
                                  ownerIds={task.owners}
                                />
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </article>
                  );
                })}

                {list.length === 0 && <p className="kanban__empty">Boş</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
