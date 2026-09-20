import { useMemo, useState, type DragEvent } from 'react';
import { PRIORITY_META, STATE_META, STATE_ORDER, TYPE_META } from '../lib/constants';
import { ancestorsOf, flatten, type TreeNode } from '../lib/hierarchy';
import { useBoard } from '../state/boardStore';
import type { ColorBy } from '../lib/appearance';
import { AvatarStack } from './Avatar';
import { PriorityBadge, TypeChip } from './Badges';
import { StaleBadge, StarButton, StepBadge } from './ItemMarks';
import type { WorkItem, WorkItemState } from '../types';

interface Props {
  /** Filtreden gecmis agac; kartlar bunun duzlestirilmisinden uretilir. */
  nodes: TreeNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  colorBy: ColorBy;
}

/**
 * Durum sutunlarina gore pano gorunumu.
 *
 * Agac gorunumunden farkli olarak hiyerarsi burada kart uzerindeki kirinti
 * (breadcrumb) ile temsil edilir; kart bir sutundan digerine suruklenince
 * ogenin durumu degisir.
 */
export function KanbanBoard({ nodes, selectedId, onSelect, colorBy }: Props): JSX.Element {
  const { board, dispatch } = useBoard();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overState, setOverState] = useState<WorkItemState | null>(null);

  const items = useMemo(() => flatten(nodes).map((node) => node.item), [nodes]);

  const columns = useMemo(() => {
    const grouped = new Map<WorkItemState, WorkItem[]>(
      STATE_ORDER.map((state) => [state, [] as WorkItem[]]),
    );
    for (const item of items) {
      grouped.get(item.state)?.push(item);
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => a.priority - b.priority || a.order - b.order);
    }
    return grouped;
  }, [items]);

  const dropOn = (event: DragEvent, state: WorkItemState): void => {
    event.preventDefault();
    if (draggingId) {
      dispatch({ type: 'item/patch', id: draggingId, patch: { state } });
    }
    setDraggingId(null);
    setOverState(null);
  };

  return (
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
                const path = ancestorsOf(board, item.id)
                  .reverse()
                  .map((entry) => entry.title);

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
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelect(item.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="kanban__card-top">
                      <TypeChip type={item.type} />
                      <PriorityBadge priority={item.priority} withLabel />
                      {item.effort !== null && <span className="tag">{item.effort} sp</span>}
                      <StepBadge item={item} />
                      <StaleBadge item={item} />
                      <span className="spacer" />
                      <StarButton itemId={item.id} />
                    </div>

                    {path.length > 0 && (
                      <p className="kanban__path" title={path.join(' › ')}>
                        {path.join(' › ')}
                      </p>
                    )}

                    <p className="kanban__card-title">{item.title}</p>

                    <div className="kanban__card-bottom">
                      <AvatarStack
                        people={assignees}
                        size="sm"
                        max={3}
                        emptyLabel="—"
                        ownerIds={item.owners}
                      />
                      <span className="spacer" />
                      {item.dueDate && (
                        <span className="faint" style={{ fontSize: 11 }}>
                          {new Date(item.dueDate).toLocaleDateString('tr-TR')}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}

              {list.length === 0 && <p className="kanban__empty">Boş</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
