import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { loadBoard, saveBoard } from '../lib/boardApi';
import { PERSON_COLORS } from '../lib/constants';
import { canPlace, descendantIds } from '../lib/hierarchy';
import { createId } from '../lib/id';
import { normalizeBoard } from '../lib/normalize';
import type { Board, Person, StorageMode, WorkItem, WorkItemType } from '../types';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'local' | 'conflict';

/** Surukle-birak hedefi: ogenin ustune, altina ya da icine. */
export type DropMode = 'before' | 'after' | 'inside';

type Action =
  | { type: 'replace'; board: Board }
  | { type: 'project/patch'; patch: Partial<Board['project']> }
  | { type: 'person/add'; name: string; role?: string; id?: string }
  | { type: 'person/patch'; id: string; patch: Partial<Omit<Person, 'id'>> }
  | { type: 'person/remove'; id: string }
  | { type: 'item/add'; draft: NewItem; atStart?: boolean }
  | { type: 'item/patch'; id: string; patch: Partial<Omit<WorkItem, 'id' | 'createdAt'>> }
  | { type: 'item/remove'; id: string }
  | { type: 'item/toggleAssignee'; id: string; personId: string }
  | { type: 'item/toggleOwner'; id: string; personId: string }
  | { type: 'step/add'; id: string; text: string }
  | { type: 'step/toggle'; id: string; stepId: string }
  | { type: 'step/patch'; id: string; stepId: string; text: string }
  | { type: 'step/remove'; id: string; stepId: string }
  | { type: 'step/move'; id: string; stepId: string; direction: -1 | 1 }
  | { type: 'item/move'; id: string; direction: -1 | 1 }
  | { type: 'item/drop'; dragId: string; targetId: string; mode: DropMode };

export interface NewItem {
  type: WorkItemType;
  title: string;
  parentId: string | null;
  description?: string;
  assignees?: string[];
}

const nowIso = (): string => new Date().toISOString();

/** Adim listesi sinirlari; normalize.ts ile ayni degerler. */
const MAX_STEPS = 50;
const MAX_STEP_TEXT = 200;

function touch(board: Board, items?: WorkItem[], people?: Person[]): Board {
  return {
    ...board,
    items: items ?? board.items,
    people: people ?? board.people,
    updatedAt: nowIso(),
  };
}

function patchItem(
  board: Board,
  id: string,
  patch: (item: WorkItem) => WorkItem,
): Board {
  return touch(
    board,
    board.items.map((item) => (item.id === id ? patch(item) : item)),
  );
}

export function boardReducer(board: Board, action: Action): Board {
  switch (action.type) {
    case 'replace':
      return action.board;

    case 'project/patch':
      return touch({ ...board, project: { ...board.project, ...action.patch } });

    case 'person/add': {
      const name = action.name.trim();
      if (name === '') return board;
      const person: Person = {
        // Cagiran taraf kimligi onceden uretebilir (ornegin oturum acarken
        // kendini ekleyen kisi, eklendikten hemen sonra girebilsin diye).
        id: action.id ?? createId('usr'),
        name,
        role: action.role?.trim() || undefined,
        color: PERSON_COLORS[board.people.length % PERSON_COLORS.length],
      };
      return touch(board, undefined, [...board.people, person]);
    }

    case 'person/patch':
      return touch(
        board,
        undefined,
        board.people.map((person) =>
          person.id === action.id ? { ...person, ...action.patch } : person,
        ),
      );

    case 'person/remove': {
      const people = board.people.filter((person) => person.id !== action.id);
      // Kisi silinince tum etiketlerden de dusurulur.
      const items = board.items.map((item) =>
        item.assignees.includes(action.id) || item.owners.includes(action.id)
          ? {
              ...item,
              assignees: item.assignees.filter((id) => id !== action.id),
              owners: item.owners.filter((id) => id !== action.id),
              updatedAt: nowIso(),
            }
          : item,
      );
      return touch(board, items, people);
    }

    case 'item/add': {
      const title = action.draft.title.trim();
      if (title === '') return board;

      const siblings = board.items.filter((item) => item.parentId === action.draft.parentId);
      const orders = siblings.map((item) => item.order);
      const order = action.atStart
        ? Math.min(0, ...orders) - 1
        : Math.max(-1, ...orders) + 1;

      const stamp = nowIso();
      const item: WorkItem = {
        id: createId('wi'),
        type: action.draft.type,
        title,
        description: action.draft.description ?? '',
        state: 'new',
        priority: 3,
        assignees: action.draft.assignees ?? [],
        owners: [],
        tags: [],
        steps: [],
        parentId: action.draft.parentId,
        effort: null,
        startDate: null,
        dueDate: null,
        createdAt: stamp,
        updatedAt: stamp,
        order,
      };
      return touch(board, [...board.items, item]);
    }

    case 'item/patch':
      return patchItem(board, action.id, (item) => ({
        ...item,
        ...action.patch,
        updatedAt: nowIso(),
      }));

    case 'item/remove': {
      const doomed = new Set([action.id, ...descendantIds(board.items, action.id)]);
      return touch(
        board,
        board.items.filter((item) => !doomed.has(item.id)),
      );
    }

    case 'item/toggleAssignee':
      return patchItem(board, action.id, (item) => {
        const removing = item.assignees.includes(action.personId);
        return {
          ...item,
          assignees: removing
            ? item.assignees.filter((id) => id !== action.personId)
            : [...item.assignees, action.personId],
          // Atamadan cikarilan kisi sorumlu da kalamaz.
          owners: removing ? item.owners.filter((id) => id !== action.personId) : item.owners,
          updatedAt: nowIso(),
        };
      });

    case 'item/toggleOwner':
      return patchItem(board, action.id, (item) => {
        const removing = item.owners.includes(action.personId);
        return {
          ...item,
          owners: removing
            ? item.owners.filter((id) => id !== action.personId)
            : [...item.owners, action.personId],
          // Sorumlu yapilan kisi ayni zamanda ise atanmis sayilir.
          assignees:
            !removing && !item.assignees.includes(action.personId)
              ? [...item.assignees, action.personId]
              : item.assignees,
          updatedAt: nowIso(),
        };
      });

    case 'item/move': {
      const current = board.items.find((item) => item.id === action.id);
      if (!current) return board;

      const siblings = board.items
        .filter((item) => item.parentId === current.parentId)
        .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));

      const index = siblings.findIndex((item) => item.id === action.id);
      const target = index + action.direction;
      if (target < 0 || target >= siblings.length) return board;

      const reordered = [...siblings];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

      const orderById = new Map(reordered.map((item, position) => [item.id, position]));
      return touch(
        board,
        board.items.map((item) =>
          orderById.has(item.id) ? { ...item, order: orderById.get(item.id) as number } : item,
        ),
      );
    }

    case 'step/add': {
      const text = action.text.trim().slice(0, MAX_STEP_TEXT);
      if (text === '') return board;
      return patchItem(board, action.id, (item) =>
        item.steps.length >= MAX_STEPS
          ? item
          : {
              ...item,
              steps: [...item.steps, { id: createId('stp'), text, done: false }],
              updatedAt: nowIso(),
            },
      );
    }

    case 'step/toggle':
      return patchItem(board, action.id, (item) => ({
        ...item,
        steps: item.steps.map((step) =>
          step.id === action.stepId ? { ...step, done: !step.done } : step,
        ),
        updatedAt: nowIso(),
      }));

    case 'step/patch': {
      const text = action.text.slice(0, MAX_STEP_TEXT);
      return patchItem(board, action.id, (item) => ({
        ...item,
        steps: item.steps.map((step) => (step.id === action.stepId ? { ...step, text } : step)),
        updatedAt: nowIso(),
      }));
    }

    case 'step/remove':
      return patchItem(board, action.id, (item) => ({
        ...item,
        steps: item.steps.filter((step) => step.id !== action.stepId),
        updatedAt: nowIso(),
      }));

    case 'step/move':
      return patchItem(board, action.id, (item) => {
        const index = item.steps.findIndex((step) => step.id === action.stepId);
        const target = index + action.direction;
        if (index === -1 || target < 0 || target >= item.steps.length) return item;
        const steps = [...item.steps];
        [steps[index], steps[target]] = [steps[target], steps[index]];
        return { ...item, steps, updatedAt: nowIso() };
      });

    case 'item/drop': {
      const { dragId, targetId, mode } = action;
      if (dragId === targetId) return board;

      const dragged = board.items.find((item) => item.id === dragId);
      const target = board.items.find((item) => item.id === targetId);
      if (!dragged || !target) return board;

      // Bir oge kendi alt agacinin icine tasinamaz; aksi halde dongu olusur.
      if (descendantIds(board.items, dragId).includes(targetId)) return board;

      const parentId = mode === 'inside' ? targetId : target.parentId;
      const parent = parentId === null ? null : board.items.find((item) => item.id === parentId);
      if (parentId !== null && !parent) return board;
      if (!canPlace(dragged.type, parent ? parent.type : null)) return board;

      const siblings = board.items
        .filter((item) => item.parentId === parentId && item.id !== dragId)
        .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));

      let insertAt: number;
      if (mode === 'inside') {
        insertAt = siblings.length;
      } else {
        const index = siblings.findIndex((item) => item.id === targetId);
        if (index === -1) return board;
        insertAt = mode === 'before' ? index : index + 1;
      }

      const ordered = [...siblings];
      ordered.splice(insertAt, 0, dragged);

      // Tum kardes listesi 0..n olarak yeniden numaralanir.
      const orderById = new Map(ordered.map((item, position) => [item.id, position]));
      const stamp = nowIso();

      return touch(
        board,
        board.items.map((item) => {
          if (item.id === dragId) {
            return {
              ...item,
              parentId,
              order: orderById.get(item.id) as number,
              updatedAt: stamp,
            };
          }
          if (orderById.has(item.id)) {
            return { ...item, order: orderById.get(item.id) as number };
          }
          return item;
        }),
      );
    }

    default:
      return board;
  }
}

interface BoardContextValue {
  board: Board;
  dispatch: (action: Action) => void;
  ready: boolean;
  mode: StorageMode;
  saveStatus: SaveStatus;
  notice: string | null;
  dismissNotice: () => void;
  /** Catisma halinde ortak dosyadaki surumu alir. */
  acceptRemote: () => void;
  replaceBoard: (board: Board) => void;
}

const BoardContext = createContext<BoardContextValue | null>(null);

const EMPTY_BOARD = normalizeBoard(null);

export function BoardProvider({ children }: { children: ReactNode }): JSX.Element {
  const [board, dispatch] = useReducer(boardReducer, EMPTY_BOARD);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<StorageMode>('shared-file');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [notice, setNotice] = useState<string | null>(null);
  const [remoteBoard, setRemoteBoard] = useState<Board | null>(null);

  /** Ortak dosyada en son gordugumuz damga; catisma tespiti icin. */
  const baseStamp = useRef<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadBoard().then((result) => {
      if (cancelled) return;
      dispatch({ type: 'replace', board: result.board });
      baseStamp.current = result.board.updatedAt;
      setMode(result.mode);
      setNotice(result.notice);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Degisiklikleri toplu halde (debounce) ortak dosyaya yazar.
  useEffect(() => {
    if (!ready) return;
    if (board.updatedAt === baseStamp.current) return;

    setSaveStatus('saving');
    if (timer.current !== null) window.clearTimeout(timer.current);

    timer.current = window.setTimeout(() => {
      void saveBoard(board, baseStamp.current).then((outcome) => {
        if (outcome.status === 'saved') {
          baseStamp.current = board.updatedAt;
          setMode('shared-file');
          setSaveStatus('saved');
          return;
        }
        if (outcome.status === 'conflict') {
          setRemoteBoard(outcome.remote);
          setSaveStatus('conflict');
          return;
        }
        setMode('local-only');
        setSaveStatus('local');
      });
    }, 600);

    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [board, ready]);

  const replaceBoard = useCallback((next: Board) => {
    dispatch({ type: 'replace', board: { ...next, updatedAt: nowIso() } });
  }, []);

  const acceptRemote = useCallback(() => {
    if (!remoteBoard) return;
    baseStamp.current = remoteBoard.updatedAt;
    dispatch({ type: 'replace', board: remoteBoard });
    setRemoteBoard(null);
    setSaveStatus('idle');
  }, [remoteBoard]);

  const value = useMemo<BoardContextValue>(
    () => ({
      board,
      dispatch,
      ready,
      mode,
      saveStatus,
      notice,
      dismissNotice: () => setNotice(null),
      acceptRemote,
      replaceBoard,
    }),
    [board, ready, mode, saveStatus, notice, acceptRemote, replaceBoard],
  );

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

export function useBoard(): BoardContextValue {
  const context = useContext(BoardContext);
  if (!context) throw new Error('useBoard yalnızca BoardProvider içinde kullanılabilir.');
  return context;
}
