import { useRef, useState } from 'react';
import { exportBoard, importBoardFile } from '../lib/boardApi';
import { useTheme } from '../lib/useTheme';
import { useBoard, type SaveStatus } from '../state/boardStore';

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
  onOpenTeam: () => void;
  onAddEpic: () => void;
}

export function TopBar({ onOpenTeam, onAddEpic }: Props): JSX.Element {
  const { board, dispatch, saveStatus, replaceBoard } = useBoard();
  const [theme, toggleTheme] = useTheme();
  const [editingName, setEditingName] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

          <button
            type="button"
            className="btn btn--sm"
            onClick={() => exportBoard(board)}
            title="Panoyu JSON olarak indir"
          >
            Dışa aktar
          </button>

          <button
            type="button"
            className="btn btn--sm"
            onClick={() => fileRef.current?.click()}
            title="JSON dosyasından yükle"
          >
            İçe aktar
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => void onImport(event.target.files?.[0])}
          />

          <button
            type="button"
            className="btn btn--sm btn--icon"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
            title={theme === 'dark' ? 'Açık tema' : 'Koyu tema'}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>

          <button type="button" className="btn btn--sm btn--primary" onClick={onAddEpic}>
            ＋ Epic
          </button>
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
