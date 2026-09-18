import { useMemo, useState } from 'react';
import { PRIORITY_META, PRIORITY_ORDER, STATE_META, STATE_ORDER } from '../lib/constants';
import { flatten, progressOf, type TreeNode } from '../lib/hierarchy';
import { useBoard } from '../state/boardStore';
import { Avatar } from './Avatar';
import { TypeChip } from './Badges';
import type { Person, Priority, WorkItem, WorkItemState } from '../types';

interface Props {
  /** Filtreden gecmis agac. */
  nodes: TreeNode[];
  onSelect: (id: string) => void;
}

interface Tip {
  x: number;
  y: number;
  label: string;
  value: string;
}

const percent = (part: number, whole: number): number =>
  whole === 0 ? 0 : Math.round((part / whole) * 100);

/** Bugunun tarihi, gun hassasiyetinde. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function Dashboard({ nodes, onSelect }: Props): JSX.Element {
  const { board } = useBoard();
  const [tip, setTip] = useState<Tip | null>(null);
  const [showTable, setShowTable] = useState(false);

  const items = useMemo(() => flatten(nodes).map((node) => node.item), [nodes]);

  const byState = useMemo(() => {
    const counts = new Map<WorkItemState, number>(STATE_ORDER.map((state) => [state, 0]));
    for (const item of items) counts.set(item.state, (counts.get(item.state) ?? 0) + 1);
    return counts;
  }, [items]);

  const byPriority = useMemo(() => {
    const counts = new Map<Priority, number>(PRIORITY_ORDER.map((priority) => [priority, 0]));
    for (const item of items) counts.set(item.priority, (counts.get(item.priority) ?? 0) + 1);
    return counts;
  }, [items]);

  const done = byState.get('done') ?? 0;
  const blocked = byState.get('blocked') ?? 0;
  const active = byState.get('active') ?? 0;

  const effort = useMemo(() => {
    let total = 0;
    let completed = 0;
    for (const item of items) {
      if (typeof item.effort !== 'number') continue;
      total += item.effort;
      if (item.state === 'done') completed += item.effort;
    }
    return { total, completed };
  }, [items]);

  /** Bitis tarihi gecmis ve hala tamamlanmamis isler. */
  const overdue = useMemo(() => {
    const limit = today();
    return items
      .filter((item) => item.dueDate !== null && item.dueDate < limit && item.state !== 'done')
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
  }, [items]);

  const blockedItems = useMemo(() => items.filter((item) => item.state === 'blocked'), [items]);

  /** Kok kutularin ilerlemesi. */
  const epics = useMemo(
    () =>
      nodes
        .map((node) => ({ item: node.item, progress: progressOf(node) }))
        .sort((a, b) => b.progress.total - a.progress.total),
    [nodes],
  );

  /** Kisi basina, duruma gore is dagilimi. */
  const workload = useMemo(() => {
    const rows = board.people.map((person) => {
      const owned = items.filter((item) => item.assignees.includes(person.id));
      const counts = new Map<WorkItemState, number>(STATE_ORDER.map((state) => [state, 0]));
      for (const item of owned) counts.set(item.state, (counts.get(item.state) ?? 0) + 1);
      return {
        person,
        total: owned.length,
        counts,
        owning: items.filter((item) => item.owners.includes(person.id)).length,
      };
    });
    return rows.filter((row) => row.total > 0).sort((a, b) => b.total - a.total);
  }, [board.people, items]);

  const maxWorkload = Math.max(1, ...workload.map((row) => row.total));

  const showTip = (event: { clientX: number; clientY: number }, label: string, value: string): void =>
    setTip({ x: event.clientX, y: event.clientY, label, value });

  return (
    <div className="dash" onMouseLeave={() => setTip(null)}>
      {/* --- Baslik sayisi + KPI seridi ---------------------------------- */}
      <section className="dash__hero">
        <div>
          <p className="dash__hero-label">Genel ilerleme</p>
          <p className="dash__hero-value">%{percent(done, items.length)}</p>
          <p className="dash__hero-sub">
            {items.length} işin {done} tanesi tamamlandı
          </p>
        </div>

        <div className="dash__kpis">
          <Kpi label="Devam eden" value={active} tone="var(--state-active)" />
          <Kpi label="Engellenen" value={blocked} tone="var(--state-blocked)" />
          <Kpi label="Gecikmiş" value={overdue.length} tone="var(--state-blocked)" />
          <Kpi
            label="Story point"
            value={`${effort.completed}/${effort.total}`}
            tone="var(--text)"
          />
        </div>
      </section>

      {/* --- Durum dagilimi: tek yigilmis cubuk -------------------------- */}
      <section className="card">
        <h3 className="card__title">Durum dağılımı</h3>
        <p className="card__sub">Filtredeki {items.length} iş kaleminin durumu</p>

        <div className="stackbar">
          {STATE_ORDER.map((state, index) => {
            const count = byState.get(state) ?? 0;
            if (count === 0) return null;
            const meta = STATE_META[state];
            const last = STATE_ORDER.slice(index + 1).every((rest) => (byState.get(rest) ?? 0) === 0);
            return (
              <span
                key={state}
                className="stackbar__seg"
                style={{
                  flexGrow: count,
                  // "Yeni" baslanmamis isi temsil eder: rakip bir renk yerine
                  // geri planda duran notr ton kullanilir.
                  background: state === 'new' ? 'var(--border-strong)' : meta.color,
                  borderTopRightRadius: last ? 4 : 0,
                  borderBottomRightRadius: last ? 4 : 0,
                }}
                onMouseMove={(event) =>
                  showTip(event, meta.label, `${count} iş · %${percent(count, items.length)}`)
                }
                onMouseLeave={() => setTip(null)}
              />
            );
          })}
        </div>

        <div className="legend">
          {STATE_ORDER.map((state) => (
            <span key={state} className="legend__item">
              <span
                className="legend__swatch"
                style={{
                  background: state === 'new' ? 'var(--border-strong)' : STATE_META[state].color,
                }}
                aria-hidden="true"
              />
              {STATE_META[state].label}
              <span className="legend__value">{byState.get(state) ?? 0}</span>
            </span>
          ))}
        </div>
      </section>

      <div className="dash__grid">
        {/* --- Epic ilerlemesi: tek serili yatay cubuk ------------------- */}
        <section className="card">
          <h3 className="card__title">Kutu bazlı ilerleme</h3>
          <p className="card__sub">Her kutunun tamamlanma oranı</p>

          <div className="barlist">
            {epics.map(({ item, progress }) => (
              <button
                key={item.id}
                type="button"
                className="barlist__row"
                onClick={() => onSelect(item.id)}
                onMouseMove={(event) =>
                  showTip(
                    event,
                    item.title,
                    `${progress.done}/${progress.total} tamam · %${progress.percent}`,
                  )
                }
                onMouseLeave={() => setTip(null)}
              >
                <span className="barlist__label" title={item.title}>
                  {item.title}
                </span>
                <span className="barlist__track">
                  <span
                    className="barlist__fill"
                    style={{ width: `${Math.max(progress.percent, 1.5)}%` }}
                  />
                </span>
                <span className="barlist__value">%{progress.percent}</span>
              </button>
            ))}
            {epics.length === 0 && <p className="card__empty">Gösterilecek kutu yok.</p>}
          </div>
        </section>

        {/* --- Oncelik dagilimi ----------------------------------------- */}
        <section className="card">
          <h3 className="card__title">Öncelik dağılımı</h3>
          <p className="card__sub">Aciliyet sırasına göre</p>

          <div className="barlist">
            {PRIORITY_ORDER.map((priority) => {
              const count = byPriority.get(priority) ?? 0;
              const meta = PRIORITY_META[priority];
              return (
                <div
                  key={priority}
                  className="barlist__row"
                  onMouseMove={(event) =>
                    showTip(event, meta.label, `${count} iş · %${percent(count, items.length)}`)
                  }
                  onMouseLeave={() => setTip(null)}
                >
                  <span className="barlist__label">{meta.label}</span>
                  <span className="barlist__track">
                    <span
                      className="barlist__fill"
                      style={{
                        width: `${Math.max(percent(count, items.length), count > 0 ? 1.5 : 0)}%`,
                        background: meta.color,
                      }}
                    />
                  </span>
                  <span className="barlist__value">{count}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* --- Kisi bazli is yuku ----------------------------------------- */}
      <section className="card">
        <div className="row">
          <div>
            <h3 className="card__title">Kişi bazlı iş yükü</h3>
            <p className="card__sub">
              Her kişinin üstündeki işler, durumlarına göre. Halkalı avatar, o kişinin
              sorumlu olduğu işleri olduğunu gösterir.
            </p>
          </div>
          <span className="spacer" />
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={() => setShowTable((value) => !value)}
          >
            {showTable ? 'Grafiği göster' : 'Tabloyu göster'}
          </button>
        </div>

        {showTable ? (
          <WorkloadTable rows={workload} />
        ) : (
          <div className="workload">
            {workload.map((row) => (
              <div className="workload__row" key={row.person.id}>
                <span className="workload__who">
                  <Avatar person={row.person} size="sm" owner={row.owning > 0} />
                  <span className="workload__name">{row.person.name}</span>
                </span>

                <span
                  className="stackbar stackbar--slim"
                  style={{ width: `${(row.total / maxWorkload) * 100}%` }}
                >
                  {STATE_ORDER.map((state, index) => {
                    const count = row.counts.get(state) ?? 0;
                    if (count === 0) return null;
                    const last = STATE_ORDER.slice(index + 1).every(
                      (rest) => (row.counts.get(rest) ?? 0) === 0,
                    );
                    return (
                      <span
                        key={state}
                        className="stackbar__seg"
                        style={{
                          flexGrow: count,
                          background:
                            state === 'new' ? 'var(--border-strong)' : STATE_META[state].color,
                          borderTopRightRadius: last ? 4 : 0,
                          borderBottomRightRadius: last ? 4 : 0,
                        }}
                        onMouseMove={(event) =>
                          showTip(
                            event,
                            `${row.person.name} · ${STATE_META[state].label}`,
                            `${count} iş`,
                          )
                        }
                        onMouseLeave={() => setTip(null)}
                      />
                    );
                  })}
                </span>

                <span className="workload__total">
                  {row.total}
                  {row.owning > 0 && (
                    <span className="workload__owning"> · {row.owning} sorumluluk</span>
                  )}
                </span>
              </div>
            ))}
            {workload.length === 0 && <p className="card__empty">Atanmış iş yok.</p>}
          </div>
        )}
      </section>

      {/* --- Dikkat gerektirenler --------------------------------------- */}
      <div className="dash__grid">
        <RiskList
          title="Gecikmiş işler"
          subtitle="Bitiş tarihi geçmiş ve hâlâ tamamlanmamış"
          items={overdue}
          board={board}
          onSelect={onSelect}
          empty="Gecikmiş iş yok."
          showDue
        />
        <RiskList
          title="Engellenen işler"
          subtitle="İlerlemesi durmuş kalemler"
          items={blockedItems}
          board={board}
          onSelect={onSelect}
          empty="Engellenen iş yok."
        />
      </div>

      {tip && (
        <div className="charttip" style={{ left: tip.x + 14, top: tip.y + 14 }} role="status">
          <span className="charttip__label">{tip.label}</span>
          <span className="charttip__value">{tip.value}</span>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: string;
}): JSX.Element {
  return (
    <div className="kpi">
      <span className="kpi__value" style={{ color: tone }}>
        {value}
      </span>
      <span className="kpi__label">{label}</span>
    </div>
  );
}

interface WorkloadRow {
  person: Person;
  total: number;
  counts: Map<WorkItemState, number>;
  owning: number;
}

/** Grafikteki her degerin metin olarak da okunabildigi tablo gorunumu. */
function WorkloadTable({ rows }: { rows: WorkloadRow[] }): JSX.Element {
  return (
    <div className="tablewrap">
      <table className="datatable">
        <thead>
          <tr>
            <th>Kişi</th>
            {STATE_ORDER.map((state) => (
              <th key={state}>{STATE_META[state].label}</th>
            ))}
            <th>Toplam</th>
            <th>Sorumluluk</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.person.id}>
              <td>{row.person.name}</td>
              {STATE_ORDER.map((state) => (
                <td key={state}>{row.counts.get(state) ?? 0}</td>
              ))}
              <td>
                <strong>{row.total}</strong>
              </td>
              <td>{row.owning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RiskList({
  title,
  subtitle,
  items,
  board,
  onSelect,
  empty,
  showDue = false,
}: {
  title: string;
  subtitle: string;
  items: WorkItem[];
  board: ReturnType<typeof useBoard>['board'];
  onSelect: (id: string) => void;
  empty: string;
  showDue?: boolean;
}): JSX.Element {
  return (
    <section className="card">
      <h3 className="card__title">
        {title}
        {items.length > 0 && <span className="card__count">{items.length}</span>}
      </h3>
      <p className="card__sub">{subtitle}</p>

      <div className="risklist">
        {items.slice(0, 8).map((item) => {
          const owners = board.people.filter((person) => item.owners.includes(person.id));
          return (
            <button
              key={item.id}
              type="button"
              className="risklist__row"
              onClick={() => onSelect(item.id)}
            >
              <TypeChip type={item.type} compact />
              <span className="risklist__title">{item.title}</span>
              {showDue && item.dueDate && (
                <span className="risklist__due">
                  {new Date(item.dueDate).toLocaleDateString('tr-TR')}
                </span>
              )}
              {owners.map((person) => (
                <Avatar key={person.id} person={person} size="sm" owner />
              ))}
            </button>
          );
        })}
        {items.length > 8 && (
          <p className="card__empty">ve {items.length - 8} kalem daha…</p>
        )}
        {items.length === 0 && <p className="card__empty">{empty}</p>}
      </div>
    </section>
  );
}
