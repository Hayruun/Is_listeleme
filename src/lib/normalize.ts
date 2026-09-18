import { PERSON_COLORS, PRIORITY_ORDER, STATE_ORDER, TYPE_ORDER } from './constants';
import { createId } from './id';
import type { Board, Person, Priority, WorkItem, WorkItemState, WorkItemType } from '../types';

const nowIso = (): string => new Date().toISOString();

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '');
}

function asNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

function asDateOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function asType(value: unknown): WorkItemType {
  return TYPE_ORDER.includes(value as WorkItemType) ? (value as WorkItemType) : 'task';
}

function asState(value: unknown): WorkItemState {
  return STATE_ORDER.includes(value as WorkItemState) ? (value as WorkItemState) : 'new';
}

function asPriority(value: unknown): Priority {
  return PRIORITY_ORDER.includes(value as Priority) ? (value as Priority) : 3;
}

function normalizePerson(raw: unknown, index: number): Person | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const source = raw as Record<string, unknown>;
  const name = asString(source.name).trim();
  if (name === '') return null;
  return {
    id: asString(source.id) || createId('usr'),
    name,
    color: asString(source.color) || PERSON_COLORS[index % PERSON_COLORS.length],
    role: asString(source.role) || undefined,
    email: asString(source.email) || undefined,
  };
}

function normalizeItem(raw: unknown, index: number, createdAt: string): WorkItem | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const source = raw as Record<string, unknown>;
  const title = asString(source.title).trim();
  if (title === '') return null;

  return {
    id: asString(source.id) || createId('wi'),
    type: asType(source.type),
    title,
    description: asString(source.description),
    state: asState(source.state),
    priority: asPriority(source.priority),
    assignees: asStringArray(source.assignees),
    owners: asStringArray(source.owners),
    tags: asStringArray(source.tags),
    parentId: asString(source.parentId) || null,
    effort: asNumberOrNull(source.effort),
    startDate: asDateOrNull(source.startDate),
    dueDate: asDateOrNull(source.dueDate),
    createdAt: asString(source.createdAt) || createdAt,
    updatedAt: asString(source.updatedAt) || asString(source.createdAt) || createdAt,
    order: typeof source.order === 'number' ? source.order : index,
  };
}

/**
 * Elle duzenlenmis ya da eski surumden gelen JSON'u guvenli hale getirir:
 * eksik alanlari tamamlar, bozuk kayitlari atar, kopuk ebeveyn baglarini temizler.
 */
export function normalizeBoard(raw: unknown): Board {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const createdAt = nowIso();

  const projectSource = (
    typeof source.project === 'object' && source.project !== null ? source.project : {}
  ) as Record<string, unknown>;

  const people = Array.isArray(source.people)
    ? source.people
        .map((entry, index) => normalizePerson(entry, index))
        .filter((person): person is Person => person !== null)
    : [];

  const peopleIds = new Set(people.map((person) => person.id));

  const items = Array.isArray(source.items)
    ? source.items
        .map((entry, index) => normalizeItem(entry, index, createdAt))
        .filter((item): item is WorkItem => item !== null)
    : [];

  const itemIds = new Set(items.map((item) => item.id));

  for (const item of items) {
    // Var olmayan ebeveyn ya da kendine referans -> koke tasi.
    if (item.parentId && (!itemIds.has(item.parentId) || item.parentId === item.id)) {
      item.parentId = null;
    }
    // Ekipten cikarilmis kisileri etiketlerden dusur.
    item.assignees = item.assignees.filter((id) => peopleIds.has(id));
    // Sorumlu her zaman atananlarin arasindadir; eksikse tamamlanir.
    item.owners = item.owners.filter((id) => peopleIds.has(id));
    for (const ownerId of item.owners) {
      if (!item.assignees.includes(ownerId)) item.assignees.push(ownerId);
    }
  }

  breakCycles(items);

  return {
    version: typeof source.version === 'number' ? source.version : 1,
    project: {
      name: asString(projectSource.name) || 'İş Listesi',
      description: asString(projectSource.description),
    },
    people,
    items,
    updatedAt: asString(source.updatedAt) || createdAt,
  };
}

/** Elle duzenlemede olusabilecek dongusel ebeveyn zincirlerini koparir. */
function breakCycles(items: WorkItem[]): void {
  const byId = new Map(items.map((item) => [item.id, item]));
  for (const item of items) {
    const seen = new Set<string>([item.id]);
    let current: WorkItem | undefined = item;
    while (current?.parentId) {
      if (seen.has(current.parentId)) {
        current.parentId = null;
        break;
      }
      seen.add(current.parentId);
      current = byId.get(current.parentId);
    }
  }
}
