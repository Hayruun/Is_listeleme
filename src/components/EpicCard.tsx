import { PRIORITY_META, TYPE_META } from '../lib/constants';
import { allowedChildTypes, progressOf, type TreeNode } from '../lib/hierarchy';
import { useBoard } from '../state/boardStore';
import { dropClass, useDnd } from '../state/dnd';
import type { ColorBy } from '../lib/appearance';
import { AvatarStack } from './Avatar';
import { PriorityBadge, ProgressBar, StateBadge, TypeChip } from './Badges';
import { QuickAdd } from './QuickAdd';
import { StaleBadge, StepBadge } from './ItemMarks';
import { StarButton } from './ItemMarks';
import { WorkItemNode } from './WorkItemNode';

interface Props {
  node: TreeNode;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  colorBy: ColorBy;
}

/**
 * Kok seviyedeki oge icin "kutu" gorunumu. Basligina tiklayinca altindaki
 * feature / user story / task agaci acilir.
 */
export function EpicCard({
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
  const progress = progressOf(node);
  const assignees = board.people.filter((person) => item.assignees.includes(person.id));
  const childTypes = allowedChildTypes(item.type);
  const accent =
    colorBy === 'priority' ? PRIORITY_META[item.priority].color : TYPE_META[item.type].color;

  return (
    <section className={`epic${isOpen ? ' epic--open' : ''}${dropClass(dnd, item.id)}`}>
      <div className="epic__accent" style={{ background: accent }} />

      <div
        className="epic__header"
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        draggable
        onDragStart={(event) => dnd.startDrag(event, item.id)}
        onDragEnd={dnd.endDrag}
        onDragOver={(event) => dnd.dragOver(event, item.id)}
        onDragLeave={() => dnd.dragLeave(item.id)}
        onDrop={(event) => dnd.drop(event, item.id)}
        onClick={() => onToggleExpand(item.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggleExpand(item.id);
          }
        }}
      >
        <span className="epic__chevron" aria-hidden="true">
          ▶
        </span>

        <div className="epic__main">
          <div className="epic__titlerow">
            <TypeChip type={item.type} />
            <h2 className="epic__title">{item.title}</h2>
            <StateBadge state={item.state} />
            <PriorityBadge priority={item.priority} withLabel />
            <StepBadge item={item} />
            <StaleBadge item={item} />
            {item.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>

          {item.description && <p className="epic__desc">{item.description}</p>}

          <div className="epic__meta">
            <ProgressBar percent={progress.percent} />
            <span
              className="progress-label"
              title={
                `${progress.done}/${progress.total} iş tamamlandı. ` +
                'Yüzde, tamamlanmamış işlerin işaretli adımlarını da kısmi olarak sayar; ' +
                'bu yüzden iki sayı birebir örtüşmeyebilir.'
              }
            >
              %{progress.percent} · {progress.done}/{progress.total}
            </span>
            {progress.effort > 0 && (
              <span className="progress-label faint">
                {progress.effortDone}/{progress.effort} sp
              </span>
            )}
            {item.dueDate && (
              <span className="progress-label faint">
                Bitiş: {new Date(item.dueDate).toLocaleDateString('tr-TR')}
              </span>
            )}
          </div>
        </div>

        <div className="epic__side">
          <StarButton itemId={item.id} />
          <AvatarStack people={assignees} size="md" max={4} ownerIds={item.owners} />
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(item.id);
            }}
          >
            Detay
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="epic__body">
          {children.length === 0 && (
            <p className="faint" style={{ margin: '4px 0 0', fontSize: 12.5 }}>
              Bu {TYPE_META[item.type].label.toLocaleLowerCase('tr-TR')} altında henüz öğe yok.
            </p>
          )}

          <div className={children.length > 0 ? 'branch' : ''}>
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

          <QuickAdd parentId={item.id} types={childTypes} />
        </div>
      )}
    </section>
  );
}
