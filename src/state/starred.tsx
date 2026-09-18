import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadStarred, saveStarred } from '../lib/starred';

export interface StarredValue {
  starred: Set<string>;
  isStarred: (itemId: string) => boolean;
  toggleStar: (itemId: string) => void;
}

const StarredContext = createContext<StarredValue | null>(null);

/**
 * Takip listesini yoneten kanca. App bunu kendisi cagirir (filtreleme icin
 * listeye ihtiyaci var), sonucu alt bilesenlere saglayici uzerinden verir.
 */
export function useStarredState(userId: string | null): StarredValue {
  const [ids, setIds] = useState<string[]>(() => (userId ? loadStarred(userId) : []));

  // Kullanici degisince o kisinin listesi yuklenir.
  useEffect(() => {
    setIds(userId ? loadStarred(userId) : []);
  }, [userId]);

  const toggleStar = useCallback(
    (itemId: string) => {
      if (!userId) return;
      setIds((current) => {
        const next = current.includes(itemId)
          ? current.filter((id) => id !== itemId)
          : [...current, itemId];
        saveStarred(userId, next);
        return next;
      });
    },
    [userId],
  );

  return useMemo(() => {
    const starred = new Set(ids);
    return { starred, isStarred: (itemId: string) => starred.has(itemId), toggleStar };
  }, [ids, toggleStar]);
}

export function StarredProvider({
  value,
  children,
}: {
  value: StarredValue;
  children: ReactNode;
}): JSX.Element {
  return <StarredContext.Provider value={value}>{children}</StarredContext.Provider>;
}

export function useStarred(): StarredValue {
  const context = useContext(StarredContext);
  if (!context) throw new Error('useStarred yalnızca StarredProvider içinde kullanılabilir.');
  return context;
}
