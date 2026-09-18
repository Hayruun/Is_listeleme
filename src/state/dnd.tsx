import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react';
import { canPlace, descendantIds } from '../lib/hierarchy';
import { useBoard, type DropMode } from './boardStore';

interface DropTarget {
  id: string;
  mode: DropMode;
}

interface DndValue {
  draggingId: string | null;
  over: DropTarget | null;
  startDrag: (event: DragEvent, itemId: string) => void;
  endDrag: () => void;
  /** Bir ogenin uzerine gelindiginde hedefi hesaplar; gecersizse birakmayi engeller. */
  dragOver: (event: DragEvent, targetId: string) => void;
  dragLeave: (targetId: string) => void;
  drop: (event: DragEvent, targetId: string) => void;
}

const DndContext = createContext<DndValue | null>(null);

/** Kartin ust/alt seridine gelindiginde kardes, ortasinda alt oge olarak birakilir. */
const EDGE = 0.32;

export function DndProvider({ children }: { children: ReactNode }): JSX.Element {
  const { board, dispatch } = useBoard();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [over, setOver] = useState<DropTarget | null>(null);

  /** Verilen hedefin gecerli olup olmadigini hiyerarsi kurallarina gore soyler. */
  const isAllowed = useCallback(
    (dragId: string, targetId: string, mode: DropMode): boolean => {
      if (dragId === targetId) return false;

      const dragged = board.items.find((item) => item.id === dragId);
      const target = board.items.find((item) => item.id === targetId);
      if (!dragged || !target) return false;

      // Kendi alt agacinin icine birakilamaz.
      if (descendantIds(board.items, dragId).includes(targetId)) return false;

      const parentId = mode === 'inside' ? targetId : target.parentId;
      const parent = parentId === null ? null : board.items.find((item) => item.id === parentId);
      if (parentId !== null && !parent) return false;

      return canPlace(dragged.type, parent ? parent.type : null);
    },
    [board.items],
  );

  const startDrag = useCallback((event: DragEvent, itemId: string) => {
    setDraggingId(itemId);
    event.dataTransfer.effectAllowed = 'move';
    // Bazi tarayicilar bos veri aktariminda surukleme baslatmaz.
    event.dataTransfer.setData('text/plain', itemId);
  }, []);

  const endDrag = useCallback(() => {
    setDraggingId(null);
    setOver(null);
  }, []);

  const dragOver = useCallback(
    (event: DragEvent, targetId: string) => {
      if (!draggingId) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const ratio = rect.height === 0 ? 0.5 : (event.clientY - rect.top) / rect.height;

      // Once imlecin bulundugu bolgeye gore dene, olmazsa diger secenege dus.
      const preferred: DropMode = ratio < EDGE ? 'before' : ratio > 1 - EDGE ? 'after' : 'inside';
      const fallback: DropMode = ratio < 0.5 ? 'before' : 'after';

      const mode = isAllowed(draggingId, targetId, preferred)
        ? preferred
        : isAllowed(draggingId, targetId, fallback)
          ? fallback
          : null;

      if (mode === null) {
        setOver((current) => (current?.id === targetId ? null : current));
        return;
      }

      // preventDefault cagrilmazsa tarayici birakmaya izin vermez.
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setOver((current) =>
        current?.id === targetId && current.mode === mode ? current : { id: targetId, mode },
      );
    },
    [draggingId, isAllowed],
  );

  const dragLeave = useCallback((targetId: string) => {
    setOver((current) => (current?.id === targetId ? null : current));
  }, []);

  const drop = useCallback(
    (event: DragEvent, targetId: string) => {
      event.preventDefault();
      event.stopPropagation();
      const mode = over?.id === targetId ? over.mode : null;
      if (draggingId && mode && isAllowed(draggingId, targetId, mode)) {
        dispatch({ type: 'item/drop', dragId: draggingId, targetId, mode });
      }
      endDrag();
    },
    [draggingId, over, isAllowed, dispatch, endDrag],
  );

  const value = useMemo<DndValue>(
    () => ({ draggingId, over, startDrag, endDrag, dragOver, dragLeave, drop }),
    [draggingId, over, startDrag, endDrag, dragOver, dragLeave, drop],
  );

  return <DndContext.Provider value={value}>{children}</DndContext.Provider>;
}

export function useDnd(): DndValue {
  const context = useContext(DndContext);
  if (!context) throw new Error('useDnd yalnızca DndProvider içinde kullanılabilir.');
  return context;
}

/** Bir kartin surukleme durumuna gore alacagi ek sinif adlari. */
export function dropClass(dnd: DndValue, itemId: string): string {
  const parts: string[] = [];
  if (dnd.draggingId === itemId) parts.push('is-dragging');
  if (dnd.over?.id === itemId) parts.push(`drop-${dnd.over.mode}`);
  return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}
