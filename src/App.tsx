import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppearanceModal } from './components/AppearanceModal';
import { Dashboard } from './components/Dashboard';
import { EpicCard } from './components/EpicCard';
import { LoginScreen } from './components/LoginScreen';
import { DetailPanel } from './components/DetailPanel';
import { FilterBar } from './components/FilterBar';
import { KanbanBoard } from './components/KanbanBoard';
import { TeamModal } from './components/TeamModal';
import { TopBar } from './components/TopBar';
import { QuickAdd } from './components/QuickAdd';
import {
  DEFAULT_APPEARANCE,
  applyAppearance,
  resolveTheme,
  loadAppearance,
  saveAppearance,
  type Appearance,
} from './lib/appearance';
import { buildTree, flatten } from './lib/hierarchy';
import { clearSessionUserId, loadSessionUserId, saveSessionUserId } from './lib/session';
import { EMPTY_FILTERS, filterTree, isFilterActive, statsOf, type FilterState } from './lib/filters';
import { useBoard } from './state/boardStore';
import { DndProvider } from './state/dnd';
import { StarredProvider, useStarredState } from './state/starred';

export function App(): JSX.Element {
  const { board, dispatch, ready, mode, saveStatus, notice, dismissNotice, acceptRemote } = useBoard();

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [teamOpen, setTeamOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [view, setView] = useState<'tree' | 'kanban' | 'dash'>('tree');

  const [userId, setUserId] = useState<string | null>(() => loadSessionUserId());

  // Kisisel takip listesi; filtreleme burada kullanildigi icin durum App'te.
  const starredState = useStarredState(userId);
  const { starred } = starredState;

  // Ilk deger dogrudan kayitli tercihten okunur; boylece varsayilan degerlerin
  // bir an uygulanip uzerine yazilmasi soz konusu olmaz.
  const [appearance, setAppearanceState] = useState<Appearance>(() => {
    const id = loadSessionUserId();
    return id ? loadAppearance(id) : DEFAULT_APPEARANCE;
  });

  // Kayit yalnizca kullanici bir sey degistirdiginde yapilir. Kaydetmeyi bir
  // efekte baglamak, yuklenen tercihin uzerine varsayilanlarin yazilmasina yol
  // aciyordu; bu yuzden kasitli olarak burada duruyor.
  const updateAppearance = useCallback(
    (next: Appearance) => {
      setAppearanceState(next);
      if (userId) saveAppearance(userId, next);
    },
    [userId],
  );

  // Kullanici degisince (giris / cikis) o kisinin tercihleri yuklenir.
  useEffect(() => {
    setAppearanceState(userId ? loadAppearance(userId) : DEFAULT_APPEARANCE);
  }, [userId]);

  // Uygulanan tema ayrica durumda tutulur: ust bardaki dugmenin simgesi ve
  // etiketi, "Sistem" secilmisken isletim sistemi degistiginde de guncellensin.
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    resolveTheme(DEFAULT_APPEARANCE.theme),
  );

  useEffect(() => {
    setResolvedTheme(applyAppearance(appearance));
  }, [appearance]);

  // "Sistem" secildiginde isletim sisteminin temasini takip eder.
  useEffect(() => {
    if (appearance.theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (): void => {
      setResolvedTheme(applyAppearance(appearance));
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [appearance]);

  /**
   * Ust bardaki tek tikla tema degistirme. "Sistem" secilmisken tiklanirsa o
   * anda gecerli olan temanin tersine sabitlenir; uc secenekli tam ayar
   * Gorunum penceresinde durmaya devam eder.
   */
  const toggleTheme = useCallback(() => {
    setAppearanceState((current) => {
      const next: Appearance = {
        ...current,
        theme: resolveTheme(current.theme) === 'dark' ? 'light' : 'dark',
      };
      if (userId) saveAppearance(userId, next);
      return next;
    });
  }, [userId]);

  const signIn = useCallback((personId: string) => {
    saveSessionUserId(personId);
    setUserId(personId);
  }, []);

  const signOut = useCallback(() => {
    clearSessionUserId();
    setUserId(null);
  }, []);

  const tree = useMemo(() => buildTree(board.items), [board.items]);
  const visible = useMemo(
    () => filterTree(tree, filters, board, { starred }),
    [tree, filters, board, starred],
  );
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

  const currentUser = board.people.find((person) => person.id === userId) ?? null;

  // Oturum yoksa ya da kayitli kisi ekipten cikarilmissa giris ekranina doneriz.
  if (!currentUser) {
    return <LoginScreen onSignIn={signIn} />;
  }

  return (
    <StarredProvider value={starredState}>
    <div className="app">
      <TopBar
        currentUser={currentUser}
        onOpenTeam={() => setTeamOpen(true)}
        onOpenAppearance={() => setAppearanceOpen(true)}
        theme={resolvedTheme}
        onToggleTheme={toggleTheme}
        onSignOut={signOut}
        onAddEpic={addEpic}
      />

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

        {view !== 'dash' && (
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
        )}

        <FilterBar filters={filters} onChange={setFilters} currentUserId={currentUser.id} />

        <div className="row row--wrap">
          <div className="viewswitch" role="group" aria-label="Görünüm">
            <button
              type="button"
              className="viewswitch__option"
              aria-pressed={view === 'tree'}
              onClick={() => setView('tree')}
            >
              Ağaç
            </button>
            <button
              type="button"
              className="viewswitch__option"
              aria-pressed={view === 'kanban'}
              onClick={() => setView('kanban')}
            >
              Pano
            </button>
            <button
              type="button"
              className="viewswitch__option"
              aria-pressed={view === 'dash'}
              onClick={() => setView('dash')}
            >
              Özet
            </button>
          </div>

          <span className="section-title">
            {isFilterActive(filters) ? `Filtrelenmiş · ${stats.total} öğe` : `${stats.total} öğe`}
          </span>

          <span className="spacer" />

          {view === 'tree' && (
            <>
              <button type="button" className="btn btn--sm btn--ghost" onClick={expandAll}>
                Tümünü aç
              </button>
              <button type="button" className="btn btn--sm btn--ghost" onClick={collapseAll}>
                Tümünü kapat
              </button>
            </>
          )}

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
        ) : view === 'dash' ? (
          <Dashboard nodes={visible} onSelect={setSelectedId} />
        ) : view === 'kanban' ? (
          <KanbanBoard
            nodes={visible}
            selectedId={selectedId}
            onSelect={setSelectedId}
            colorBy={appearance.colorBy}
          />
        ) : (
          <DndProvider>
            <div className="stack" style={{ gap: 11 }}>
              {visible.map((node) => (
                <EpicCard
                  key={node.item.id}
                  node={node}
                  expanded={expanded}
                  onToggleExpand={toggleExpand}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  colorBy={appearance.colorBy}
                />
              ))}
            </div>
          </DndProvider>
        )}

        {view === 'tree' && (
          <QuickAdd
            parentId={null}
            types={['epic', 'feature', 'story']}
            triggerLabel="Kök seviyeye öğe ekle"
          />
        )}
      </main>

      {selectedId && (
        <DetailPanel
          itemId={selectedId}
          onClose={() => setSelectedId(null)}
          onSelect={setSelectedId}
        />
      )}

      {teamOpen && <TeamModal onClose={() => setTeamOpen(false)} />}

      {appearanceOpen && (
        <AppearanceModal
          appearance={appearance}
          onChange={updateAppearance}
          onClose={() => setAppearanceOpen(false)}
          userName={currentUser.name}
        />
      )}
    </div>
    </StarredProvider>
  );
}
