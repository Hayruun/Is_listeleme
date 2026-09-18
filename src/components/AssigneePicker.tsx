import { useMemo, useRef, useState } from 'react';
import { useDismiss } from '../lib/useDismiss';
import { useBoard } from '../state/boardStore';
import { Avatar, AvatarStack } from './Avatar';
import type { Person } from '../types';

interface Props {
  selected: string[];
  onToggle: (personId: string) => void;
  /** Menu sag kenara hizalansin. */
  align?: 'left' | 'right';
  label?: string;
}

/**
 * Birden fazla kisiyi etiketlemek icin coklu secim menusu.
 * Menu icinden yeni ekip uyesi de eklenebilir.
 */
export function AssigneePicker({ selected, onToggle, align = 'left', label }: Props): JSX.Element {
  const { board, dispatch } = useBoard();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useDismiss(containerRef, open, () => {
    setOpen(false);
    setQuery('');
  });

  const selectedPeople = useMemo(
    () => board.people.filter((person) => selected.includes(person.id)),
    [board.people, selected],
  );

  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR');
    if (needle === '') return board.people;
    return board.people.filter((person) =>
      person.name.toLocaleLowerCase('tr-TR').includes(needle),
    );
  }, [board.people, query]);

  const canCreate =
    query.trim() !== '' &&
    !board.people.some(
      (person) =>
        person.name.toLocaleLowerCase('tr-TR') === query.trim().toLocaleLowerCase('tr-TR'),
    );

  const addPerson = (): void => {
    dispatch({ type: 'person/add', name: query });
    setQuery('');
  };

  return (
    <div className="picker" ref={containerRef}>
      <button
        type="button"
        className="btn btn--sm"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <AvatarStack people={selectedPeople} size="sm" max={3} emptyLabel="Kişi ekle" />
        {label && <span>{label}</span>}
      </button>

      {open && (
        <div className={`picker__menu${align === 'right' ? ' picker__menu--right' : ''}`} role="listbox">
          <input
            className="input"
            placeholder="Kişi ara veya yeni ekle…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
          <div className="picker__divider" />

          {matches.length === 0 && !canCreate && (
            <p className="picker__empty">Kişi bulunamadı.</p>
          )}

          {matches.map((person: Person) => {
            const active = selected.includes(person.id);
            return (
              <button
                key={person.id}
                type="button"
                role="option"
                aria-selected={active}
                className="picker__option"
                onClick={() => onToggle(person.id)}
              >
                <Avatar person={person} size="sm" />
                <span className="picker__option-name">
                  {person.name}
                  {person.role && <span className="picker__option-role"> · {person.role}</span>}
                </span>
                {active && (
                  <span className="picker__check" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            );
          })}

          {canCreate && (
            <>
              <div className="picker__divider" />
              <button type="button" className="picker__option" onClick={addPerson}>
                <span className="avatar avatar--sm" style={{ background: 'var(--accent)' }}>
                  +
                </span>
                <span className="picker__option-name">“{query.trim()}” kişisini ekle</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
