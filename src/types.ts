/** Azure Boards hiyerarsisine denk gelen is ogesi turleri. */
export type WorkItemType = 'epic' | 'feature' | 'story' | 'task' | 'bug';

export type WorkItemState = 'new' | 'active' | 'blocked' | 'review' | 'done';

/** 1 = en yuksek oncelik. */
export type Priority = 1 | 2 | 3 | 4;

export interface Person {
  id: string;
  name: string;
  /** Avatarda gosterilen renk (CSS hsl/hex). */
  color: string;
  role?: string;
  email?: string;
}

export interface WorkItem {
  id: string;
  type: WorkItemType;
  title: string;
  description: string;
  state: WorkItemState;
  priority: Priority;
  /** Ise atanan kisiler; birden fazla olabilir. */
  assignees: string[];
  /**
   * Isin sahibi / hesap verebilir kisiler. assignees'in bir alt kumesidir:
   * bir kisi sorumlu yapildiginda atananlara da eklenir. Birden fazla olabilir.
   */
  owners: string[];
  tags: string[];
  parentId: string | null;
  /** Efor / story point. */
  effort: number | null;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  /** Ayni ebeveyn altindaki siralama. */
  order: number;
}

export interface Board {
  version: number;
  project: {
    name: string;
    description: string;
  };
  people: Person[];
  items: WorkItem[];
  updatedAt: string;
}

/** Verinin nereden okundugu / nereye yazildigi. */
export type StorageMode = 'shared-file' | 'local-only';

export interface LoadResult {
  board: Board;
  mode: StorageMode;
  /** Ortak dosya okunamadiysa sebebi. */
  notice: string | null;
}
