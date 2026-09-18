import { flatten, type TreeNode } from './hierarchy';
import type { Board, Priority, WorkItemState, WorkItemType } from '../types';

export interface FilterState {
  query: string;
  assignees: string[];
  states: WorkItemState[];
  types: WorkItemType[];
  priorities: Priority[];
  /** Tamamlanmis ogeleri gizle. */
  hideDone: boolean;
}

export const EMPTY_FILTERS: FilterState = {
  query: '',
  assignees: [],
  states: [],
  types: [],
  priorities: [],
  hideDone: false,
};

export function isFilterActive(filters: FilterState): boolean {
  return (
    filters.query.trim() !== '' ||
    filters.assignees.length > 0 ||
    filters.states.length > 0 ||
    filters.types.length > 0 ||
    filters.priorities.length > 0 ||
    filters.hideDone
  );
}

function matches(node: TreeNode, filters: FilterState, board: Board): boolean {
  const { item } = node;

  if (filters.hideDone && item.state === 'done') return false;
  if (filters.states.length > 0 && !filters.states.includes(item.state)) return false;
  if (filters.types.length > 0 && !filters.types.includes(item.type)) return false;
  if (filters.priorities.length > 0 && !filters.priorities.includes(item.priority)) return false;
  if (
    filters.assignees.length > 0 &&
    !filters.assignees.some((personId) => item.assignees.includes(personId))
  ) {
    return false;
  }

  const needle = filters.query.trim().toLocaleLowerCase('tr-TR');
  if (needle !== '') {
    const assigneeNames = board.people
      .filter((person) => item.assignees.includes(person.id))
      .map((person) => person.name)
      .join(' ');
    const haystack = [item.title, item.description, item.tags.join(' '), assigneeNames]
      .join(' ')
      .toLocaleLowerCase('tr-TR');
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

/**
 * Agaci filtreler. Bir oge eslesmese bile alt ogelerinden biri esliyorsa
 * baglami korumak icin agacta kalir.
 */
export function filterTree(nodes: TreeNode[], filters: FilterState, board: Board): TreeNode[] {
  if (!isFilterActive(filters)) return nodes;

  const walkNode = (node: TreeNode): TreeNode | null => {
    const children = node.children
      .map(walkNode)
      .filter((child): child is TreeNode => child !== null);

    if (children.length > 0) return { ...node, children };
    return matches(node, filters, board) ? { ...node, children: [] } : null;
  };

  return nodes.map(walkNode).filter((node): node is TreeNode => node !== null);
}

export interface BoardStats {
  total: number;
  done: number;
  active: number;
  blocked: number;
  percent: number;
}

export function statsOf(nodes: TreeNode[]): BoardStats {
  const items = flatten(nodes).map((node) => node.item);
  const done = items.filter((item) => item.state === 'done').length;
  return {
    total: items.length,
    done,
    active: items.filter((item) => item.state === 'active').length,
    blocked: items.filter((item) => item.state === 'blocked').length,
    percent: items.length === 0 ? 0 : Math.round((done / items.length) * 100),
  };
}
