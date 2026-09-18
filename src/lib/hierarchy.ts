import { STATE_META, TYPE_META } from './constants';
import type { Board, WorkItem, WorkItemType } from '../types';

export interface TreeNode {
  item: WorkItem;
  children: TreeNode[];
  depth: number;
}

export interface Progress {
  /** Kendisi dahil tum alt ogeler. */
  total: number;
  done: number;
  percent: number;
  effort: number;
  effortDone: number;
}

/** parentId iliskisinden agac kurar; sahipsiz kalan ogeler koke tasinir. */
export function buildTree(items: WorkItem[]): TreeNode[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const childrenOf = new Map<string, WorkItem[]>();
  const roots: WorkItem[] = [];

  for (const item of items) {
    const parentExists = item.parentId !== null && byId.has(item.parentId);
    if (!parentExists) {
      roots.push(item);
      continue;
    }
    const bucket = childrenOf.get(item.parentId as string);
    if (bucket) bucket.push(item);
    else childrenOf.set(item.parentId as string, [item]);
  }

  const sortItems = (list: WorkItem[]): WorkItem[] =>
    [...list].sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));

  const toNode = (item: WorkItem, depth: number): TreeNode => ({
    item,
    depth,
    children: sortItems(childrenOf.get(item.id) ?? []).map((child) => toNode(child, depth + 1)),
  });

  return sortItems(roots).map((item) => toNode(item, 0));
}

/** Agacta gezinip her dugume fonksiyonu uygular. */
export function walk(nodes: TreeNode[], visit: (node: TreeNode) => void): void {
  for (const node of nodes) {
    visit(node);
    walk(node.children, visit);
  }
}

export function flatten(nodes: TreeNode[]): TreeNode[] {
  const out: TreeNode[] = [];
  walk(nodes, (node) => out.push(node));
  return out;
}

/** Bir dugumun kendisi + tum alt ogeleri uzerinden ilerleme hesaplar. */
export function progressOf(node: TreeNode): Progress {
  let total = 0;
  let done = 0;
  let effort = 0;
  let effortDone = 0;

  walk([node], ({ item }) => {
    total += 1;
    const isDone = STATE_META[item.state].completed;
    if (isDone) done += 1;
    if (typeof item.effort === 'number') {
      effort += item.effort;
      if (isDone) effortDone += item.effort;
    }
  });

  return {
    total,
    done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    effort,
    effortDone,
  };
}

/** Bir turun altina hangi turler eklenebilir. */
export function allowedChildTypes(type: WorkItemType): WorkItemType[] {
  return TYPE_META[type].children;
}

/** Ogeden koke dogru ebeveyn zinciri (en yakin ebeveyn basta). */
export function ancestorsOf(board: Board, itemId: string): WorkItem[] {
  const byId = new Map(board.items.map((item) => [item.id, item]));
  const chain: WorkItem[] = [];
  let current = byId.get(itemId);
  const seen = new Set<string>([itemId]);

  while (current?.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent || seen.has(parent.id)) break;
    seen.add(parent.id);
    chain.push(parent);
    current = parent;
  }
  return chain;
}

/** Bir ogenin tum alt ogelerinin kimlikleri (silmede kullanilir). */
export function descendantIds(items: WorkItem[], rootId: string): string[] {
  const childrenOf = new Map<string, string[]>();
  for (const item of items) {
    if (!item.parentId) continue;
    const bucket = childrenOf.get(item.parentId);
    if (bucket) bucket.push(item.id);
    else childrenOf.set(item.parentId, [item.id]);
  }

  const out: string[] = [];
  const queue = [...(childrenOf.get(rootId) ?? [])];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (out.includes(id)) continue;
    out.push(id);
    queue.push(...(childrenOf.get(id) ?? []));
  }
  return out;
}
