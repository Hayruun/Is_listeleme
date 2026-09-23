import { offerFile } from './download';
import { normalizeBoard } from './normalize';
import type { Board, LoadResult } from '../types';

/**
 * Veri erisiminin TEK noktasi.
 *
 * Bugun ekibin ortak dosyasi (public/data/board.json) ile konusuyor. Yarin bu
 * dosyanin yerini bir ASP.NET Core Web API alacaksa yalnizca bu modulun icini
 * degistirmek yeterli; uygulamanin geri kalani bu sozlesmeyi kullanir.
 */
const API_ENDPOINT = 'api/board';
const STATIC_FALLBACK = 'data/board.json';
const LOCAL_KEY = 'is-listeleme:board';

/** Ortak dosyaya yazma denemesinin sonucu. */
export type SaveOutcome =
  | { status: 'saved' }
  | { status: 'conflict'; remote: Board }
  | { status: 'offline'; reason: string };

/**
 * claude.ai Artifact olarak yayinlandiginda sayfa, platformun paylasimli
 * belge deposunu (db) kullanir: pano tek bir belgede tutulur, degisiklikler
 * herkes icin kalici olur. Yerel gelistirmede `window.claude` yoktur ve bu
 * yol hic devreye girmez.
 */
interface ArtifactDoc {
  get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
  set(data: Record<string, unknown>): Promise<void>;
}

const ARTIFACT_DOC_PATH = 'boards/main';
let artifactDocPromise: Promise<ArtifactDoc | null> | null = null;

function artifactDoc(): Promise<ArtifactDoc | null> {
  if (!artifactDocPromise) {
    const host = (window as { claude?: { use?: (name: string) => Promise<unknown> } }).claude;
    artifactDocPromise =
      typeof host?.use === 'function'
        ? host
            .use('db')
            .then((db) =>
              db ? ((db as { doc(path: string): ArtifactDoc }).doc(ARTIFACT_DOC_PATH)) : null,
            )
            .catch(() => null)
        : Promise.resolve(null);
  }
  return artifactDocPromise;
}

function absolute(path: string): string {
  return new URL(path, document.baseURI).toString();
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim() === '') return null;
  return JSON.parse(text) as unknown;
}

/** Ortak dosyayi okur; ulasilamazsa yerel kopyaya duser. */
export async function loadBoard(): Promise<LoadResult> {
  const doc = await artifactDoc();
  if (doc) {
    try {
      const snap = await doc.get();
      const stored = snap.exists ? snap.data()?.board : undefined;
      if (stored) return { board: normalizeBoard(stored), mode: 'shared-file', notice: null };
      // Depo henuz bos: yayinla birlikte gelen dosyayla baslanir, ilk kayitta depoya yazilir.
      const response = await fetch(absolute(STATIC_FALLBACK), { cache: 'no-store' });
      if (response.ok) {
        return { board: normalizeBoard(await readJson(response)), mode: 'shared-file', notice: null };
      }
    } catch {
      // Depo okunamadi: asagidaki olagan yola dusulur.
    }
  }

  try {
    const response = await fetch(absolute(API_ENDPOINT), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (response.ok) {
      const payload = (await readJson(response)) as { board?: unknown } | null;
      if (payload?.board) {
        return { board: normalizeBoard(payload.board), mode: 'shared-file', notice: null };
      }
      // Dosya henuz yok: bos ama yazilabilir bir pano.
      return { board: normalizeBoard(null), mode: 'shared-file', notice: null };
    }
  } catch {
    // API ucu yok (ornegin salt statik barindirma) - asagida devam.
  }

  try {
    const response = await fetch(absolute(STATIC_FALLBACK), { cache: 'no-store' });
    if (response.ok) {
      const board = normalizeBoard(await readJson(response));
      const local = readLocal();
      if (local && local.updatedAt > board.updatedAt) {
        return {
          board: local,
          mode: 'local-only',
          notice:
            'Ortak dosyaya yazılamıyor. Değişiklikleriniz yalnızca bu tarayıcıda tutuluyor; ' +
            'paylaşmak için JSON olarak dışa aktarın.',
        };
      }
      return {
        board,
        mode: 'local-only',
        notice:
          'Ortak dosya salt okunur açıldı. Değişiklikleriniz yalnızca bu tarayıcıda tutulur; ' +
          'paylaşmak için JSON olarak dışa aktarın.',
      };
    }
  } catch {
    // Statik dosyaya da ulasilamadi.
  }

  const local = readLocal();
  return {
    board: local ?? normalizeBoard(null),
    mode: 'local-only',
    notice: 'Ortak veri dosyası okunamadı. Yerel kopya ile çalışılıyor.',
  };
}

/** Panoyu ortak dosyaya yazar. Basarisiz olursa yerel kopyaya duser. */
export async function saveBoard(board: Board, baseUpdatedAt: string | null): Promise<SaveOutcome> {
  writeLocal(board);

  const doc = await artifactDoc();
  if (doc) {
    try {
      const snap = await doc.get();
      const remote = snap.exists ? snap.data()?.board : undefined;
      const remoteStamp =
        remote && typeof (remote as { updatedAt?: unknown }).updatedAt === 'string'
          ? (remote as { updatedAt: string }).updatedAt
          : null;
      if (remote && remoteStamp && baseUpdatedAt && remoteStamp !== baseUpdatedAt) {
        return { status: 'conflict', remote: normalizeBoard(remote) };
      }
      await doc.set({ board: JSON.parse(JSON.stringify(board)) as Record<string, unknown> });
      return { status: 'saved' };
    } catch {
      return { status: 'offline', reason: 'Paylaşımlı depoya yazılamadı.' };
    }
  }

  let response: Response;
  try {
    response = await fetch(absolute(API_ENDPOINT), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board, baseUpdatedAt }),
    });
  } catch {
    return { status: 'offline', reason: 'Ortak dosya sunucusuna ulaşılamadı.' };
  }

  if (response.ok) return { status: 'saved' };

  if (response.status === 409) {
    const payload = (await readJson(response).catch(() => null)) as { board?: unknown } | null;
    if (payload?.board) {
      return { status: 'conflict', remote: normalizeBoard(payload.board) };
    }
  }

  return { status: 'offline', reason: 'Ortak dosya güncellenemedi.' };
}

export function readLocal(): Board | null {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return normalizeBoard(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeLocal(board: Board): void {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(board));
  } catch {
    // Kota dolu ya da depolama kapali: yoksayilir.
  }
}

/** Panoyu JSON dosyasi olarak indirir (ekiple paylasma / yedek). */
export function exportBoard(board: Board): void {
  const blob = new Blob([`${JSON.stringify(board, null, 2)}\n`], {
    type: 'application/json',
  });
  void offerFile(`board-${new Date().toISOString().slice(0, 10)}.json`, blob);
}

/** Disaridan gelen JSON dosyasi: boyut siniri + sema dogrulamasindan gecirilir. */
export async function importBoardFile(file: File): Promise<Board> {
  const MAX_BYTES = 8 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    throw new Error('Dosya çok büyük (en fazla 8 MB).');
  }
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Dosya geçerli bir JSON değil.');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Beklenen biçimde bir pano dosyası değil.');
  }
  return normalizeBoard(parsed);
}
