import { useState, type KeyboardEvent } from 'react';

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
}

const MAX_TAG_LENGTH = 32;
const MAX_TAGS = 12;

/** Etiket girisi: Enter veya virgul ile ekler, Backspace ile sonuncuyu siler. */
export function TagInput({ tags, onChange }: Props): JSX.Element {
  const [draft, setDraft] = useState('');

  const commit = (): void => {
    const value = draft.trim().replace(/,/g, '').slice(0, MAX_TAG_LENGTH);
    if (value === '' || tags.includes(value) || tags.length >= MAX_TAGS) {
      setDraft('');
      return;
    }
    onChange([...tags, value]);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit();
      return;
    }
    if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="stack" style={{ gap: 7 }}>
      <div className="row row--wrap" style={{ gap: 6 }}>
        {tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
            <button
              type="button"
              className="tag__remove"
              onClick={() => onChange(tags.filter((entry) => entry !== tag))}
              aria-label={`${tag} etiketini kaldır`}
            >
              ×
            </button>
          </span>
        ))}
        {tags.length === 0 && <span className="faint" style={{ fontSize: 12 }}>Etiket yok</span>}
      </div>
      <input
        className="input"
        value={draft}
        placeholder={tags.length >= MAX_TAGS ? 'Etiket sınırına ulaşıldı' : 'Etiket yazıp Enter’a basın'}
        maxLength={MAX_TAG_LENGTH}
        disabled={tags.length >= MAX_TAGS}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
      />
    </div>
  );
}
