import { useState, type KeyboardEvent } from 'react';
import { useBoard } from '../state/boardStore';
import type { Step } from '../types';

interface Props {
  itemId: string;
  steps: Step[];
}

const MAX_STEPS = 50;
const MAX_TEXT = 200;

/**
 * Isaretlenebilir adim listesi (kabul kriterleri).
 * Isaretli adimlar, ogenin kendi ilerlemesine ve ustundeki kutunun yuzdesine
 * kismi katki verir.
 */
export function StepList({ itemId, steps }: Props): JSX.Element {
  const { dispatch } = useBoard();
  const [draft, setDraft] = useState('');

  const doneCount = steps.filter((step) => step.done).length;

  const add = (): void => {
    const text = draft.trim();
    if (text === '') return;
    dispatch({ type: 'step/add', id: itemId, text });
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      add();
    }
  };

  return (
    <div className="steps">
      {steps.length > 0 && (
        <div className="steps__summary">
          <span className="progress" aria-hidden="true">
            <span
              className="progress__fill"
              style={{ width: `${Math.round((doneCount / steps.length) * 100)}%` }}
            />
          </span>
          <span className="progress-label">
            {doneCount}/{steps.length} adım
          </span>
        </div>
      )}

      <ul className="steps__list">
        {steps.map((step, index) => (
          <li key={step.id} className={`steps__item${step.done ? ' steps__item--done' : ''}`}>
            <input
              type="checkbox"
              className="steps__check"
              checked={step.done}
              onChange={() => dispatch({ type: 'step/toggle', id: itemId, stepId: step.id })}
              aria-label={step.text}
            />

            <input
              className="steps__text"
              value={step.text}
              maxLength={MAX_TEXT}
              onChange={(event) =>
                dispatch({ type: 'step/patch', id: itemId, stepId: step.id, text: event.target.value })
              }
              aria-label={`Adım ${index + 1}`}
            />

            <span className="steps__tools">
              <button
                type="button"
                className="btn btn--sm btn--ghost btn--icon"
                onClick={() =>
                  dispatch({ type: 'step/move', id: itemId, stepId: step.id, direction: -1 })
                }
                disabled={index === 0}
                aria-label="Yukarı taşı"
              >
                ↑
              </button>
              <button
                type="button"
                className="btn btn--sm btn--ghost btn--icon"
                onClick={() =>
                  dispatch({ type: 'step/move', id: itemId, stepId: step.id, direction: 1 })
                }
                disabled={index === steps.length - 1}
                aria-label="Aşağı taşı"
              >
                ↓
              </button>
              <button
                type="button"
                className="btn btn--sm btn--danger btn--icon"
                onClick={() => dispatch({ type: 'step/remove', id: itemId, stepId: step.id })}
                aria-label="Adımı sil"
              >
                ×
              </button>
            </span>
          </li>
        ))}
      </ul>

      <input
        className="input"
        value={draft}
        maxLength={MAX_TEXT}
        placeholder={
          steps.length >= MAX_STEPS ? 'Adım sınırına ulaşıldı' : 'Adım yazıp Enter’a basın…'
        }
        disabled={steps.length >= MAX_STEPS}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
      />
    </div>
  );
}
