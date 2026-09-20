import { PRIORITY_META, STATE_META, TYPE_META } from '../lib/constants';
import { allowedChildTypes, progressOf, type TreeNode } from '../lib/hierarchy';
import { useBoard } from '../state/boardStore';
import { dropClass, useDnd } from '../state/dnd';
import type { ColorBy } from '../lib/appearance';
import { AvatarStack } from './Avatar';
import { PriorityBadge, StateBadge, TypeChip } from './Badges';
import { QuickAdd } from './QuickAdd';
import { StaleBadge, StarButton, StepBadge } from './ItemMarks';

interface Props {
  node: TreeNode;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Kenar rengi turu mu onceligi mi anlatsin. */
  colorBy: ColorBy;
}

/** Epic altindaki her kademe icin ic ice gecen satir karti. */
export function WorkItemNode({
  node,
  expanded,
  onToggleExpand,
  selectedId,
  onSelect,
  colorBy,
}: Props): JSX.Element {
  const { board } = useBoard();
  const dnd = useDnd();
  const { item, children } = node;

  const isOpen = expanded.has(item.id);
  const childTypes = allowedChildTypes(item.type);
  const hasChildren = children.length > 0;
  const progress = progressOf(node);
  const assignees = board.people.filter((person) => item.assignees.includes(person.id));
  const isDone = STATE_META[item.state].completed;

  return (
    <div className="node">
      <div
        className={`node__card${selectedId === item.id ? ' node__card--selected' : ''}${dropClass(dnd, item.id)}`}
        onClick={() => onSelect(item.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(item.id);
          }
        }}
        role="button"
        tabIndex={0}
        draggable
        onDragStart={(event) => dnd.startDrag(event, item.id)}
        onDragEnd={dnd.endDrag}
        onDragOver={(event) => dnd.dragOver(event, item.id)}
        onDragLeave={() => dnd.dragLeave(item.id)}
        onDrop={(event) => dnd.drop(event, item.id)}
        style={{
          borderLeft: `3px solid ${
            colorBy === 'priority' ? PRIORITY_META[item.priority].color : TYPE_META[item.type].color
          }`,
        }}
      >
        <span className="node__grip" aria-hidden="true" title="Sürükleyerek taşıyın">
          ⠿
        </span>

        <button
          type="button"
          className={`node__toggle${isOpen ? ' node__toggle--open' : ''}${
            hasChildren ? '' : ' node__toggle--leaf'
          }`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleExpand(item.id);
          }}
          aria-label={isOpen ? 'Daralt' : 'Genişlet'}
          aria-expanded={hasChildren ? isOpen : undefined}
          tabIndex={hasChildren ? 0 : -1}
        >
          ▶
        </button>

        <TypeChip type={item.type} />

        <span className={`node__title${isDone ? ' node__title--done' : ''}`}>{item.title}</span>

        <span className="node__side">
          <StepBadge item={item} />
          <StaleBadge item={item} />
          {hasChildren && (
            <span className="progress-label" title={`${progress.done}/${progress.total} tamamlandı`}>
              {progress.done}/{progress.total}
            </span>
          )}
          {item.effort !== null && (
            <span className="tag" title="Efor / story point">
              {item.effort} sp
            </span>
          )}
          <PriorityBadge priority={item.priority} />
          <StateBadge state={item.state} />
          <AvatarStack
            people={assignees}
            size="sm"
            max={3}
            emptyLabel="—"
            ownerIds={item.owners}
          />
          <StarButton itemId={item.id} />
        </span>
      </div>

      {isOpen && hasChildren && (
        <div className="node__children">
          {children.map((child) => (
            <WorkItemNode
              key={child.item.id}
              node={child}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              selectedId={selectedId}
              onSelect={onSelect}
              colorBy={colorBy}
            />
          ))}
        </div>
      )}

      {isOpen && childTypes.length > 0 && (
        <div className="node__children">
          <QuickAdd parentId={item.id} types={childTypes} />
        </div>
      )}
    </div>
  );
}
