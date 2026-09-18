import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PRIORITY_META,
  PRIORITY_ORDER,
  STATE_META,
  STATE_ORDER,
  TYPE_META,
} from '../lib/constants';
import { allowedChildTypes, ancestorsOf, buildTree, descendantIds } from '../lib/hierarchy';
import { useEscapeLayer } from '../lib/escapeStack';
import { useBoard } from '../state/boardStore';
import { AssigneePicker } from './AssigneePicker';
import { Avatar } from './Avatar';
import { StepList } from './StepList';
import { TagInput } from './TagInput';
import { TypeChip } from './Badges';
import type { Priority, WorkItem, WorkItemState, WorkItemType } from '../types';

const MAX_TITLE = 160;
const MAX_DESCRIPTION = 4000;

interface Props {
  itemId: string;
  onClose: () => void;
  onSelect: (id: string) => void;
}

/** Secili is ogesinin tum alanlarini duzenleyen yan panel. */
export function DetailPanel({ itemId, onClose, onSelect }: Props): JSX.Element | null {
  const { board, dispatch } = useBoard();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const item = board.items.find((entry) => entry.id === itemId) ?? null;

  useEffect(() => {
    setConfirmDelete(false);
  }, [itemId]);

  // Panel, Esc yigininin en altindaki katman: ustunde acik bir secici varsa
  // Esc once onu kapatir.
  useEscapeLayer(true, onClose);

  const ancestors = useMemo(
    () => (item ? ancestorsOf(board, item.id).reverse() : []),
    [board, item],
  );

  const childNodes = useMemo(() => {
    if (!item) return [];
    const subset = board.items.filter((entry) => entry.parentId === item.id);
    return buildTree(subset);
  }, [board.items, item]);

  if (!item) return null;

  const assignees = board.people.filter((person) => item.assignees.includes(person.id));
  const owners = board.people.filter((person) => item.owners.includes(person.id));
  const childTypes = allowedChildTypes(item.type);
  const doomedCount = descendantIds(board.items, item.id).length;

  const patch = (changes: Partial<Omit<WorkItem, 'id' | 'createdAt'>>): void => {
    dispatch({ type: 'item/patch', id: item.id, patch: changes });
  };

  /** Turu degistirmek hiyerarsiyi bozabilecegi icin yalnizca uyumlu turler sunulur. */
  const parent = board.items.find((entry) => entry.id === item.parentId) ?? null;
  const typeOptions: WorkItemType[] = parent ? allowedChildTypes(parent.type) : ['epic', 'feature', 'story'];
  const typeChoices = typeOptions.includes(item.type) ? typeOptions : [item.type, ...typeOptions];

  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <aside className="panel" ref={panelRef} role="dialog" aria-modal="true" aria-label="Öğe detayı">
        <header className="panel__header">
          <TypeChip type={item.type} />
          <span className="panel__breadcrumb">
            {ancestors.length > 0
              ? ancestors.map((entry) => entry.title).join(' › ')
              : 'Kök seviye'}
          </span>
          <span className="spacer" />
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Kapat">
            ×
          </button>
        </header>

        <div className="panel__content">
          <input
            className="panel__title-input"
            value={item.title}
            maxLength={MAX_TITLE}
            onChange={(event) => patch({ title: event.target.value })}
            aria-label="Başlık"
          />

          <div className="grid-2">
            <label className="field">
              <span className="field__label">Durum</span>
              <select
                className="select"
                value={item.state}
                onChange={(event) => patch({ state: event.target.value as WorkItemState })}
              >
                {STATE_ORDER.map((state) => (
                  <option key={state} value={state}>
                    {STATE_META[state].label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">Öncelik</span>
              <select
                className="select"
                value={item.priority}
                onChange={(event) => patch({ priority: Number(event.target.value) as Priority })}
              >
                {PRIORITY_ORDER.map((priority) => (
                  <option key={priority} value={priority}>
                    {PRIORITY_META[priority].label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">Tür</span>
              <select
                className="select"
                value={item.type}
                onChange={(event) => patch({ type: event.target.value as WorkItemType })}
              >
                {typeChoices.map((type) => (
                  <option key={type} value={type}>
                    {TYPE_META[type].label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">Efor (sp)</span>
              <input
                className="input"
                type="number"
                min={0}
                max={999}
                step={1}
                value={item.effort ?? ''}
                placeholder="—"
                onChange={(event) => {
                  const raw = event.target.value;
                  if (raw === '') return patch({ effort: null });
                  const value = Number(raw);
                  patch({ effort: Number.isFinite(value) ? Math.max(0, Math.min(999, value)) : null });
                }}
              />
            </label>

            <label className="field">
              <span className="field__label">Başlangıç</span>
              <input
                className="input"
                type="date"
                value={item.startDate ?? ''}
                onChange={(event) => patch({ startDate: event.target.value || null })}
              />
            </label>

            <label className="field">
              <span className="field__label">Bitiş</span>
              <input
                className="input"
                type="date"
                value={item.dueDate ?? ''}
                onChange={(event) => patch({ dueDate: event.target.value || null })}
              />
            </label>
          </div>

          <div className="field">
            <span className="field__label">Sorumlular ({owners.length})</span>
            <div className="row row--wrap">
              {owners.map((person) => (
                <span key={person.id} className="tag" style={{ paddingLeft: 3, height: 26 }}>
                  <Avatar person={person} size="sm" owner />
                  {person.name}
                  <button
                    type="button"
                    className="tag__remove"
                    onClick={() =>
                      dispatch({ type: 'item/toggleOwner', id: item.id, personId: person.id })
                    }
                    aria-label={`${person.name} sorumluluğunu kaldır`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <AssigneePicker
                selected={item.owners}
                onToggle={(personId) =>
                  dispatch({ type: 'item/toggleOwner', id: item.id, personId })
                }
                label="Sorumlu ekle"
              />
            </div>
            <p className="faint" style={{ fontSize: 11, margin: '5px 0 0', lineHeight: 1.5 }}>
              İşin hesap verebilir sahibi. Birden fazla olabilir; sorumlu yapılan kişi
              atananlara da eklenir.
            </p>
          </div>

          <div className="field">
            <span className="field__label">Atananlar ({assignees.length})</span>
            <div className="row row--wrap">
              {assignees.map((person) => (
                <span key={person.id} className="tag" style={{ paddingLeft: 3, height: 26 }}>
                  <Avatar person={person} size="sm" owner={item.owners.includes(person.id)} />
                  {person.name}
                  <button
                    type="button"
                    className="tag__remove"
                    onClick={() =>
                      dispatch({ type: 'item/toggleAssignee', id: item.id, personId: person.id })
                    }
                    aria-label={`${person.name} etiketini kaldır`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <AssigneePicker
                selected={item.assignees}
                onToggle={(personId) =>
                  dispatch({ type: 'item/toggleAssignee', id: item.id, personId })
                }
                label="Kişi ekle"
              />
            </div>
          </div>

          <div className="field">
            <span className="field__label">Etiketler</span>
            <TagInput tags={item.tags} onChange={(tags) => patch({ tags })} />
          </div>

          <div className="field">
            <span className="field__label">Adımlar / kabul kriterleri</span>
            <StepList itemId={item.id} steps={item.steps} />
          </div>

          <label className="field">
            <span className="field__label">Açıklama</span>
            <textarea
              className="textarea"
              value={item.description}
              maxLength={MAX_DESCRIPTION}
              placeholder="Kabul kriterleri, notlar, bağımlılıklar…"
              onChange={(event) => patch({ description: event.target.value })}
            />
          </label>

          {childNodes.length > 0 && (
            <div className="field">
              <span className="field__label">Alt öğeler ({childNodes.length})</span>
              <div className="stack" style={{ gap: 6 }}>
                {childNodes.map((child) => (
                  <button
                    key={child.item.id}
                    type="button"
                    className="picker__option"
                    style={{ border: '1px solid var(--border)' }}
                    onClick={() => onSelect(child.item.id)}
                  >
                    <TypeChip type={child.item.type} compact />
                    <span className="picker__option-name">{child.item.title}</span>
                    <span className="picker__option-role">
                      {STATE_META[child.item.state].label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="faint mono" style={{ margin: 0 }}>
            {item.id} · Güncelleme: {new Date(item.updatedAt).toLocaleString('tr-TR')}
          </p>
        </div>

        <footer className="panel__footer">
          {childTypes.length > 0 && (
            <button
              type="button"
              className="btn btn--sm"
              onClick={() =>
                dispatch({
                  type: 'item/add',
                  draft: {
                    type: childTypes[0],
                    title: `Yeni ${TYPE_META[childTypes[0]].label}`,
                    parentId: item.id,
                  },
                })
              }
            >
              ＋ {TYPE_META[childTypes[0]].label}
            </button>
          )}

          <span className="spacer" />

          {confirmDelete ? (
            <>
              <span className="faint" style={{ fontSize: 12 }}>
                {doomedCount > 0 ? `${doomedCount} alt öğeyle birlikte silinsin mi?` : 'Silinsin mi?'}
              </span>
              <button type="button" className="btn btn--sm" onClick={() => setConfirmDelete(false)}>
                Vazgeç
              </button>
              <button
                type="button"
                className="btn btn--sm btn--danger"
                onClick={() => {
                  dispatch({ type: 'item/remove', id: item.id });
                  onClose();
                }}
              >
                Sil
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn--sm btn--danger"
              onClick={() => setConfirmDelete(true)}
            >
              Sil
            </button>
          )}
        </footer>
      </aside>
    </>
  );
}
