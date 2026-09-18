import { readableInk } from '../lib/color';
import { initialsOf } from '../lib/id';
import type { Person } from '../types';

type Size = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<Size, string> = {
  sm: 'avatar avatar--sm',
  md: 'avatar',
  lg: 'avatar avatar--lg',
};

export function Avatar({ person, size = 'md' }: { person: Person; size?: Size }): JSX.Element {
  return (
    <span
      className={SIZE_CLASS[size]}
      // Murekkep, kisinin rengine gore secilir: acik bir avatar renginde de
      // bas harfler okunur kalir.
      style={{ background: person.color, color: readableInk(person.color) }}
      title={person.role ? `${person.name} · ${person.role}` : person.name}
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
}: {
  people: Person[];
  max?: number;
  size?: Size;
  emptyLabel?: string;
}): JSX.Element {
  if (people.length === 0) {
    return <span className="avatar-stack__empty">{emptyLabel}</span>;
  }

  const shown = people.slice(0, max);
  const rest = people.length - shown.length;

  return (
    <span className="avatar-stack" title={people.map((person) => person.name).join(', ')}>
      {shown.map((person) => (
        <Avatar key={person.id} person={person} size={size} />
      ))}
      {rest > 0 && (
        <span className={`${SIZE_CLASS[size]} avatar-stack__more`}>+{rest}</span>
      )}
    </span>
  );
}
