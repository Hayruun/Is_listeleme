import { offerFile } from './download';
import { buildTree, type TreeNode } from './hierarchy';
import type { Board, Person, WorkItem, WorkItemState, WorkItemType } from '../types';

/**
 * Azure Boards "Import Work Items" (CSV) bicimi.
 *
 * Hiyerarsi "Title 1 / Title 2 / ..." sutunlariyla kurulur: bir satirin
 * basligi hangi sutundaysa o derinliktedir, ebeveyni ustteki en yakin bir
 * seviye sigdaki satirdir. ID sutunu yeni kayitlar icin bos birakilir.
 * Sutun adlari Azure'daki alan adlarinin Ingilizce karsiliklaridir.
 */
const AZURE_TYPE: Record<WorkItemType, string> = {
  epic: 'Epic',
  feature: 'Feature',
  story: 'User Story',
  task: 'Task',
  bug: 'Bug',
};

/** Agile surecinin durumlari; Task'ta "Resolved" yoktur. */
function azureState(state: WorkItemState, type: WorkItemType): string {
  switch (state) {
    case 'new':
      return 'New';
    case 'active':
    case 'blocked':
      return 'Active';
    case 'review':
      return type === 'task' ? 'Active' : 'Resolved';
    case 'done':
      return 'Closed';
  }
}

/** Start Date / Target Date alanlari varsayilan olarak yalnizca bu turlerde var. */
const HAS_DATES: ReadonlySet<WorkItemType> = new Set(['epic', 'feature']);

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}.${month}.${year}`;
}

/** Azure'un Description alani HTML'dir; adimlar ve tarih araligi da buraya yazilir. */
function descriptionHtml(item: WorkItem): string {
  const parts: string[] = [];
  if (item.description.trim()) {
    parts.push(
      ...item.description
        .split(/\r?\n/)
        .filter((line) => line.trim())
        .map((line) => `<p>${escapeHtml(line)}</p>`),
    );
  }
  if (!HAS_DATES.has(item.type) && (item.startDate || item.dueDate)) {
    const range = [item.startDate, item.dueDate].filter(Boolean).map((d) => formatDate(d as string));
    parts.push(`<p><b>Planlanan tarih:</b> ${range.join(' – ')}</p>`);
  }
  if (item.steps.length > 0) {
    const list = item.steps
      .map((step) => `<li>${step.done ? '☑' : '☐'} ${escapeHtml(step.text)}</li>`)
      .join('');
    parts.push(`<p><b>Adımlar</b></p><ul>${list}</ul>`);
  }
  return parts.join('');
}

function tagsOf(item: WorkItem): string {
  const tags = [...item.tags];
  if (item.state === 'blocked' && !tags.includes('Engellendi')) tags.push('Engellendi');
  // Azure etiketleri noktali virgulle ayirir; etiketin icinde gecmemeli.
  return tags.map((tag) => tag.replace(/;/g, ',').trim()).filter(Boolean).join('; ');
}

/** Azure tek kisi atar; sorumlu varsa o, yoksa ilk atanan. E-postasi olmayan atlanir. */
function assigneeOf(item: WorkItem, people: Map<string, Person>): string {
  const id = item.owners[0] ?? item.assignees[0];
  return (id && people.get(id)?.email) || '';
}

export function buildAzureCsv(board: Board): string {
  const people = new Map(board.people.map((person) => [person.id, person]));
  const rows: { depth: number; item: WorkItem }[] = [];
  const walk = (nodes: TreeNode[]): void => {
    for (const node of nodes) {
      rows.push({ depth: node.depth, item: node.item });
      walk(node.children);
    }
  };
  walk(buildTree(board.items));

  const levels = Math.max(1, ...rows.map((row) => row.depth + 1));
  const titleColumns = Array.from({ length: levels }, (_, i) => `Title ${i + 1}`);
  const header = [
    'ID',
    'Work Item Type',
    ...titleColumns,
    'State',
    'Priority',
    'Assigned To',
    'Story Points',
    'Start Date',
    'Target Date',
    'Tags',
    'Description',
  ];

  const body: string[][] = [];
  for (const { depth, item } of rows) {
    const titles = titleColumns.map((_, i) => (i === depth ? item.title : ''));
    const dated = HAS_DATES.has(item.type);
    const cells = [
      '',
      AZURE_TYPE[item.type],
      ...titles,
      azureState(item.state, item.type),
      String(item.priority),
      assigneeOf(item, people),
      item.type === 'story' && item.effort !== null ? String(item.effort) : '',
      dated && item.startDate ? item.startDate : '',
      dated && item.dueDate ? item.dueDate : '',
      tagsOf(item),
      descriptionHtml(item),
    ];
    body.push(cells);
  }

  // Tamamen bos kalan istege bagli sutunlar atilir; Azure'daki eslestirme ekrani sadelesir.
  const optional = new Set(['Assigned To', 'Story Points', 'Start Date', 'Target Date', 'Tags']);
  const keep = header.map(
    (name, col) => !optional.has(name) || body.some((cells) => cells[col] !== ''),
  );
  const pick = (cells: string[]): string =>
    cells.filter((_, col) => keep[col]).map(csvCell).join(',');
  const lines = [pick(header), ...body.map(pick)];
  // BOM: Excel'de acildiginda Turkce karakterler bozulmasin.
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

/** Panoyu Azure Boards'a ice aktarilabilecek CSV olarak indirir. */
export function exportAzureCsv(board: Board): void {
  const blob = new Blob([buildAzureCsv(board)], { type: 'text/csv;charset=utf-8' });
  void offerFile(`azure-boards-${new Date().toISOString().slice(0, 10)}.csv`, blob);
}
