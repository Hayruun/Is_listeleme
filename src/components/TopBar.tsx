import { useRef, useState } from 'react';
import { exportBoard, importBoardFile } from '../lib/boardApi';
import { useDismiss } from '../lib/useDismiss';
import { useBoard, type SaveStatus } from '../state/boardStore';
import { Avatar } from './Avatar';
import type { Person } from '../types';

const SAVE_LABEL: Record<SaveStatus, string> = {
  idle: 'Hazır',
  saving: 'Kaydediliyor…',
  saved: 'Ortak dosyaya kaydedildi',
  local: 'Yalnızca bu tarayıcıda',
  conflict: 'Çakışma var',
};

const SAVE_CLASS: Record<SaveStatus, string> = {
  idle: '',
  saving: ' savestate--saving',
  saved: ' savestate--saved',
  local: ' savestate--local',
  conflict: ' savestate--local',
};

interface Props {
  currentUser: Person;
  onOpenTeam: () => void;
  onOpenAppearance: () => void;
  onSignOut: () => void;
  onAddEpic: () => void;
}

export function TopBar({
  currentUser,
  onOpenTeam,
  onOpenAppearance,
  onSignOut,
  onAddEpic,
}: Props): JSX.Element {
  const { board, dispatch, saveStatus, replaceBoard } = useBoard();
  const [editingName, setEditingName] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useDismiss(menuRef, menuOpen, () => setMenuOpen(false));

  const onImport = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    setImportError(null);
    try {
      replaceBoard(await importBoardFile(file));
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Dosya okunamadı.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            ◆
          </span>
          <div style={{ minWidth: 0 }}>
            {editingName ? (
              <input
                className="input"
                style={{ height: 28, fontWeight: 650 }}
                value={board.project.name}
                maxLength={80}
                autoFocus
                onChange={(event) =>
                  dispatch({ type: 'project/patch', patch: { name: event.target.value } })
                }
                onBlur={() => setEditingName(false)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === 'Escape') setEditingName(false);
                }}
                aria-label="Proje adı"
              />
            ) : (
              <h1
                className="brand__title"
                onDoubleClick={() => setEditingName(true)}
                title="Adı değiştirmek için çift tıklayın"
              >
                {board.project.name}
              </h1>
            )}
            <p className="brand__subtitle">
              {board.items.length} öğe · {board.people.length} kişi
            </p>
          </div>
        </div>

        <span className="spacer" />

        <span className={`savestate${SAVE_CLASS[saveStatus]}`}>
          <span className="savestate__dot" aria-hidden="true" />
          {SAVE_LABEL[saveStatus]}
        </span>

        <div className="row" style={{ gap: 6 }}>
          <button type="button" className="btn btn--sm" onClick={onOpenTeam}>
            Ekip
          </button>

          <button type="button" className="btn btn--sm btn--primary" onClick={onAddEpic}>
            ＋ Epic
          </button>

          <div className="picker" ref={menuRef}>
            <button
              type="button"
              className="user-menu__trigger"
              onClick={() => setMenuOpen((value) => !value)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <Avatar person={currentUser} size="sm" />
              {currentUser.name.split(' ')[0]}
              <span aria-hidden="true" style={{ fontSize: 9 }}>
                ▼
              </span>
            </button>

            {menuOpen && (
              <div className="picker__menu picker__menu--right" role="menu">
                <div style={{ padding: '6px 8px 8px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{currentUser.name}</div>
                  {currentUser.role && (
                    <div className="picker__option-role">{currentUser.role}</div>
                  )}
                </div>
                <div className="picker__divider" />

                <button
                  type="button"
                  className="picker__option"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenAppearance();
                  }}
                >
                  <span aria-hidden="true">◑</span>
                  <span className="picker__option-name">Görünüm ve renk paleti</span>
                </button>

                <button
                  type="button"
                  className="picker__option"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    exportBoard(board);
                  }}
                >
                  <span aria-hidden="true">↓</span>
                  <span className="picker__option-name">Panoyu dışa aktar</span>
                </button>

                <button
                  type="button"
                  className="picker__option"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    fileRef.current?.click();
                  }}
                >
                  <span aria-hidden="true">↑</span>
                  <span className="picker__option-name">JSON’dan içe aktar</span>
                </button>

                <div className="picker__divider" />

                <button
                  type="button"
                  className="picker__option"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onSignOut();
                  }}
                >
                  <span aria-hidden="true">⎋</span>
                  <span className="picker__option-name">Oturumu kapat</span>
                </button>
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => void onImport(event.target.files?.[0])}
          />
        </div>
      </div>

      {importError && (
        <div className="topbar__inner" style={{ paddingTop: 0 }}>
          <div className="notice notice--danger" style={{ width: '100%' }}>
            <span aria-hidden="true">⚠</span>
            <span>{importError}</span>
            <span className="spacer" />
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => setImportError(null)}>
              Kapat
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
