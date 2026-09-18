import { useMemo, useState } from 'react';
import { PERSON_COLORS } from '../lib/constants';
import { useBoard } from '../state/boardStore';
import { Avatar } from './Avatar';

const MAX_NAME = 60;
const MAX_ROLE = 40;

/** Ekip uyelerini ekleme / duzenleme / cikarma. */
export function TeamModal({ onClose }: { onClose: () => void }): JSX.Element {
  const { board, dispatch } = useBoard();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);

  const workload = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of board.items) {
      for (const personId of item.assignees) {
        counts.set(personId, (counts.get(personId) ?? 0) + 1);
      }
    }
    return counts;
  }, [board.items]);

  const submit = (): void => {
    if (name.trim() === '') return;
    dispatch({ type: 'person/add', name: name.slice(0, MAX_NAME), role: role.slice(0, MAX_ROLE) });
    setName('');
    setRole('');
  };

  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Ekip">
        <header className="modal__header">
          <h2 className="modal__title">Ekip ({board.people.length})</h2>
          <span className="spacer" />
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Kapat">
            ×
          </button>
        </header>

        <div className="modal__content">
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <label className="field" style={{ flex: 2 }}>
              <span className="field__label">Ad soyad</span>
              <input
                className="input"
                value={name}
                maxLength={MAX_NAME}
                placeholder="Ayşe Yılmaz"
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    submit();
                  }
                }}
              />
            </label>
            <label className="field" style={{ flex: 1.4 }}>
              <span className="field__label">Rol</span>
              <input
                className="input"
                value={role}
                maxLength={MAX_ROLE}
                placeholder="Backend"
                onChange={(event) => setRole(event.target.value)}
              />
            </label>
            <button type="button" className="btn btn--primary" onClick={submit} disabled={name.trim() === ''}>
              Ekle
            </button>
          </div>

          {board.people.length === 0 && (
            <p className="faint" style={{ margin: 0, fontSize: 12.5 }}>
              Henüz ekip üyesi yok. Kişi ekledikçe iş öğelerine etiketleyebilirsiniz.
            </p>
          )}

          <div className="stack" style={{ gap: 7 }}>
            {board.people.map((person) => {
              const count = workload.get(person.id) ?? 0;
              return (
                <div key={person.id} className="person-row">
                  <Avatar person={person} size="lg" />

                  <div className="person-row__name stack" style={{ gap: 4 }}>
                    <input
                      className="input"
                      value={person.name}
                      maxLength={MAX_NAME}
                      onChange={(event) =>
                        dispatch({ type: 'person/patch', id: person.id, patch: { name: event.target.value } })
                      }
                      aria-label="Ad soyad"
                    />
                    <input
                      className="input"
                      value={person.role ?? ''}
                      maxLength={MAX_ROLE}
                      placeholder="Rol"
                      onChange={(event) =>
                        dispatch({
                          type: 'person/patch',
                          id: person.id,
                          patch: { role: event.target.value || undefined },
                        })
                      }
                      aria-label="Rol"
                    />
                  </div>

                  <div className="stack" style={{ gap: 6, alignItems: 'flex-end' }}>
                    <span className="person-row__count">{count} öğe</span>
                    <div className="row" style={{ gap: 4 }}>
                      <select
                        className="select"
                        style={{ width: 'auto', padding: '4px 22px 4px 8px' }}
                        value={person.color}
                        onChange={(event) =>
                          dispatch({
                            type: 'person/patch',
                            id: person.id,
                            patch: { color: event.target.value },
                          })
                        }
                        aria-label="Renk"
                      >
                        {(PERSON_COLORS.includes(person.color)
                          ? PERSON_COLORS
                          : [person.color, ...PERSON_COLORS]
                        ).map((color) => (
                          <option key={color} value={color}>
                            {color}
                          </option>
                        ))}
                      </select>

                      {pendingRemoval === person.id ? (
                        <>
                          <button
                            type="button"
                            className="btn btn--sm"
                            onClick={() => setPendingRemoval(null)}
                          >
                            Vazgeç
                          </button>
                          <button
                            type="button"
                            className="btn btn--sm btn--danger"
                            onClick={() => {
                              dispatch({ type: 'person/remove', id: person.id });
                              setPendingRemoval(null);
                            }}
                          >
                            Çıkar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn btn--sm btn--danger"
                          onClick={() => setPendingRemoval(person.id)}
                          title={count > 0 ? `${count} öğedeki etiketi de kaldırılır` : undefined}
                        >
                          Çıkar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
