import { readableInk } from '../lib/color';
import { initialsOf } from '../lib/id';
import type { Person } from '../types';

type Size = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<Size, string> = {
  sm: 'avatar avatar--sm',
  md: 'avatar',
  lg: 'avatar avatar--lg',
};

export function Avatar({
  person,
  size = 'md',
  owner = false,
}: {
  person: Person;
  size?: Size;
  owner?: boolean;
}): JSX.Element {
  return (
    <span
      className={`${SIZE_CLASS[size]}${owner ? ' avatar--owner' : ''}`}
      // Murekkep, kisinin rengine gore secilir: acik bir avatar renginde de
      // bas harfler okunur kalir.
      style={{ background: person.color, color: readableInk(person.color) }}
      title={[person.name, person.role, owner ? 'sorumlu' : null].filter(Boolean).join(' · ')}
    >
      {initialsOf(person.name)}
    </span>
  );
}

/** Ust uste binmis avatarlar; fazlasi "+N" olarak ozetlenir. */
export function AvatarStack({
  people,
  max = 4,
  size = 'sm',
  emptyLabel = 'Atanmamış',
  ownerIds = [],
}: {
  people: Person[];
  max?: number;
  size?: Size;
  emptyLabel?: string;
  /** Halkayla isaretlenecek sorumlular. */
  ownerIds?: string[];
}): JSX.Element {
  if (people.length === 0) {
    return <span className="avatar-stack__empty">{emptyLabel}</span>;
  }

  // Sorumlular one alinir; kalabalik listede gorunur kalsinlar.
  const sorted = [...people].sort(
    (a, b) => Number(ownerIds.includes(b.id)) - Number(ownerIds.includes(a.id)),
  );
  const shown = sorted.slice(0, max);
  const rest = sorted.length - shown.length;

  const label = sorted
    .map((person) => (ownerIds.includes(person.id) ? `${person.name} (sorumlu)` : person.name))
    .join(', ');

  return (
    <span className="avatar-stack" title={label}>
      {shown.map((person) => (
        <Avatar
          key={person.id}
          person={person}
          size={size}
          owner={ownerIds.includes(person.id)}
        />
      ))}
      {rest > 0 && (
        <span className={`${SIZE_CLASS[size]} avatar-stack__more`}>+{rest}</span>
      )}
    </span>
  );
}
