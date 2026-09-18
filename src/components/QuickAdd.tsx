import { useState, type KeyboardEvent } from 'react';
import { TYPE_META } from '../lib/constants';
import { useBoard } from '../state/boardStore';
import type { WorkItemType } from '../types';

interface Props {
  parentId: string | null;
  types: WorkItemType[];
  /** Kapali haldeki dugme metni; verilmezse "+ <Tür>" kullanilir. */
  triggerLabel?: string;
}

const MAX_TITLE = 160;

/** Satir ici hizli ekleme: baslik yaz, Enter'a bas. */
export function QuickAdd({ parentId, types, triggerLabel }: Props): JSX.Element | null {
  const { dispatch } = useBoard();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<WorkItemType>(types[0]);
  const [title, setTitle] = useState('');

  if (types.length === 0) return null;

  const submit = (keepOpen: boolean): void => {
    const value = title.trim();
    if (value === '') {
      setOpen(false);
      return;
    }
    dispatch({ type: 'item/add', draft: { type, title: value.slice(0, MAX_TITLE), parentId } });
    setTitle('');
    if (!keepOpen) setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit(true);
    }
    if (event.key === 'Escape') {
      setTitle('');
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <div className="quickadd">
        <button type="button" className="quickadd__trigger" onClick={() => setOpen(true)}>
          <span aria-hidden="true">＋</span>
          {triggerLabel ?? `${TYPE_META[types[0]].label} ekle`}
        </button>
      </div>
    );
  }

  return (
    <div className="quickadd">
      <div className="quickadd__row">
        {types.length > 1 ? (
          <select
            className="select"
            style={{ width: 'auto' }}
            value={type}
            onChange={(event) => setType(event.target.value as WorkItemType)}
            aria-label="Tür"
          >
            {types.map((entry) => (
              <option key={entry} value={entry}>
                {TYPE_META[entry].label}
              </option>
            ))}
          </select>
        ) : (
          <span className="type-chip" style={{ background: TYPE_META[type].color }}>
            {TYPE_META[type].short}
          </span>
        )}

        <input
          className="quickadd__input"
          value={title}
          maxLength={MAX_TITLE}
          placeholder="Başlık yazın, Enter ile ekleyin…"
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={onKeyDown}
          autoFocus
        />

        <button type="button" className="btn btn--sm btn--primary" onClick={() => submit(false)}>
          Ekle
        </button>
        <button
          type="button"
          className="btn btn--sm btn--ghost btn--icon"
          onClick={() => {
            setTitle('');
            setOpen(false);
          }}
          aria-label="Vazgeç"
        >
          ×
        </button>
      </div>
    </div>
  );
}
