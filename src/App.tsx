import { useCallback, useMemo, useState } from 'react';
import { EpicCard } from './components/EpicCard';
import { DetailPanel } from './components/DetailPanel';
import { FilterBar } from './components/FilterBar';
import { TeamModal } from './components/TeamModal';
import { TopBar } from './components/TopBar';
import { QuickAdd } from './components/QuickAdd';
import { buildTree, flatten } from './lib/hierarchy';
import { EMPTY_FILTERS, filterTree, isFilterActive, statsOf, type FilterState } from './lib/filters';
import { useBoard } from './state/boardStore';

export function App(): JSX.Element {
  const { board, dispatch, ready, mode, saveStatus, notice, dismissNotice, acceptRemote } = useBoard();

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [teamOpen, setTeamOpen] = useState(false);

  const tree = useMemo(() => buildTree(board.items), [board.items]);
  const visible = useMemo(() => filterTree(tree, filters, board), [tree, filters, board]);
  const stats = useMemo(() => statsOf(tree), [tree]);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpanded(new Set(flatten(tree).map((node) => node.item.id)));
  }, [tree]);

  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  const addEpic = useCallback(() => {
    dispatch({
      type: 'item/add',
      draft: { type: 'epic', title: 'Yeni Epic', parentId: null },
      atStart: true,
    });
    // Yeni epic en uste eklenir; kullanicinin hemen duzenlemesi icin acilir.
    setExpanded((current) => new Set(current));
  }, [dispatch]);

  if (!ready) {
    return (
      <div className="app">
        <div className="app__body">
          <p className="faint">Yükleniyor…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <TopBar onOpenTeam={() => setTeamOpen(true)} onAddEpic={addEpic} />

      <main className="app__body stack">
        {notice && (
          <div className="notice notice--warn">
            <span aria-hidden="true">⚠</span>
            <span>{notice}</span>
            <span className="spacer" />
            <button type="button" className="btn btn--sm btn--ghost" onClick={dismissNotice}>
              Kapat
            </button>
          </div>
        )}

        {saveStatus === 'conflict' && (
          <div className="notice notice--danger">
            <span aria-hidden="true">⚠</span>
            <span>
              Ortak dosya bu arada başka biri tarafından güncellendi. Kendi değişikliklerinizi
              kaybetmemek için önce dışa aktarın, sonra güncel sürümü alın.
            </span>
            <span className="spacer" />
            <button type="button" className="btn btn--sm" onClick={acceptRemote}>
              Güncel sürümü al
            </button>
          </div>
        )}

        <div className="stats">
          <div className="stat">
            <div className="stat__value">{stats.total}</div>
            <div className="stat__label">Toplam öğe</div>
          </div>
          <div className="stat">
            <div className="stat__value" style={{ color: 'var(--state-active)' }}>
              {stats.active}
            </div>
            <div className="stat__label">Devam eden</div>
          </div>
          <div className="stat">
            <div className="stat__value" style={{ color: 'var(--state-blocked)' }}>
              {stats.blocked}
            </div>
            <div className="stat__label">Engellenen</div>
          </div>
          <div className="stat">
            <div className="stat__value" style={{ color: 'var(--state-done)' }}>
              {stats.done}
            </div>
            <div className="stat__label">Tamamlanan</div>
          </div>
          <div className="stat">
            <div className="stat__value">%{stats.percent}</div>
            <div className="stat__label">İlerleme</div>
          </div>
        </div>

        <FilterBar filters={filters} onChange={setFilters} />

        <div className="row row--wrap">
          <span className="section-title">
            {isFilterActive(filters) ? `Filtrelenmiş · ${visible.length} kutu` : 'Panolar'}
          </span>
          <span className="spacer" />
          <button type="button" className="btn btn--sm btn--ghost" onClick={expandAll}>
            Tümünü aç
          </button>
          <button type="button" className="btn btn--sm btn--ghost" onClick={collapseAll}>
            Tümünü kapat
          </button>
          <span className="faint" style={{ fontSize: 11.5 }}>
            {mode === 'shared-file' ? 'Ortak dosya' : 'Yerel kopya'}
          </span>
        </div>

        {visible.length === 0 ? (
          <div className="empty">
            <div className="empty__icon" aria-hidden="true">
              🗂️
            </div>
            <h2 className="empty__title">
              {isFilterActive(filters) ? 'Filtreye uyan öğe yok' : 'Henüz epic yok'}
            </h2>
            <p className="empty__text">
              {isFilterActive(filters)
                ? 'Filtreleri gevşetip tekrar deneyin.'
                : 'Bir epic açın; altına feature, user story ve task ekleyerek işi parçalayın.'}
            </p>
            {isFilterActive(filters) ? (
              <button type="button" className="btn" onClick={() => setFilters(EMPTY_FILTERS)}>
                Filtreleri temizle
              </button>
            ) : (
              <button type="button" className="btn btn--primary" onClick={addEpic}>
                ＋ İlk epic’i oluştur
              </button>
            )}
          </div>
        ) : (
          <div className="stack" style={{ gap: 11 }}>
            {visible.map((node) => (
              <EpicCard
                key={node.item.id}
                node={node}
                expanded={expanded}
                onToggleExpand={toggleExpand}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            ))}
          </div>
        )}

        <QuickAdd parentId={null} types={['epic', 'feature', 'story']} triggerLabel="Kök seviyeye öğe ekle" />
      </main>

      {selectedId && (
        <DetailPanel
          itemId={selectedId}
          onClose={() => setSelectedId(null)}
          onSelect={setSelectedId}
        />
      )}

      {teamOpen && <TeamModal onClose={() => setTeamOpen(false)} />}
    </div>
  );
}
