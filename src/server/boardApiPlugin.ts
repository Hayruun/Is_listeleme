import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Connect, Plugin, ViteDevServer, PreviewServer } from 'vite';

/**
 * Ekibin ortak veri dosyasi: public/data/board.json
 *
 * Bu dosya hem statik olarak servis edilir (tarayici ilk acilista okur) hem de
 * asagidaki /api/board ucu araciligiyla guncellenir. Boylece "herkesin
 * ulasabilecegi tek bir dosya" hem uygulamanin kaynagi hem de git'e
 * commit'lenen paylasim bicimi olur.
 */
const BOARD_PATH = resolve(process.cwd(), 'public/data/board.json');

/** Govde boyutu ust siniri (8 MB). */
const MAX_BODY_BYTES = 8 * 1024 * 1024;

type Json = Record<string, unknown>;

async function readBoard(): Promise<Json | null> {
  if (!existsSync(BOARD_PATH)) return null;
  const raw = await readFile(BOARD_PATH, 'utf8');
  if (!raw.trim()) return null;
  return JSON.parse(raw) as Json;
}

/** Yarim yazilmis dosya kalmasin diye once gecici dosyaya yazip yer degistiriyoruz. */
async function writeBoard(board: Json): Promise<void> {
  await mkdir(dirname(BOARD_PATH), { recursive: true });
  const tmp = `${BOARD_PATH}.${process.pid}.tmp`;
  await writeFile(tmp, `${JSON.stringify(board, null, 2)}\n`, 'utf8');
  await rename(tmp, BOARD_PATH);
}

function send(res: Parameters<Connect.NextHandleFunction>[1], status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  // Guvenlik baslikari: icerik turu tahmini ve cerceveleme kapali.
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.end(payload);
}

/**
 * CSRF korumasi: durum degistiren istekleri yalnizca uygulamanin kendi
 * sayfasindan kabul ediyoruz. Baska bir sitenin tarayici uzerinden bu uca
 * yazmasini engeller. (CORS basligi hic verilmedigi icin capraz kaynakli
 * okuma da mumkun degil.)
 */
function isSameOrigin(req: Parameters<Connect.NextHandleFunction>[0]): boolean {
  const fetchSite = req.headers['sec-fetch-site'];
  if (typeof fetchSite === 'string' && fetchSite !== 'same-origin') return false;

  const origin = req.headers.origin;
  if (typeof origin !== 'string' || origin === '') return true;

  const host = req.headers.host;
  if (typeof host !== 'string' || host === '') return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function collectBody(req: Parameters<Connect.NextHandleFunction>[0]): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.from(chunk as Buffer);
    size += buf.length;
    // Kaynak tuketimini sinirlamak icin govde boyutu kati bir limite tabi.
    if (size > MAX_BODY_BYTES) throw new Error('Gövde çok büyük.');
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * Guvenlik basliklari (CSP, HSTS disi olanlar). Gelistirme sunucusunda HMR
 * inline script ve websocket kullandigi icin politika gevsetilir; uretim
 * derlemesinde (preview / statik barindirma) sikilastirilir.
 */
function securityHeaders(dev: boolean): Connect.NextHandleFunction {
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'none'",
    "img-src 'self' data:",
    // Satir ici stil React'in style prop'u icin gerekli.
    "style-src 'self' 'unsafe-inline'",
    dev ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'",
    dev ? "connect-src 'self' ws: wss:" : "connect-src 'self'",
  ].join('; ');

  return (_req, res, next) => {
    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  };
}

const middleware: Connect.NextHandleFunction = (req, res, next) => {
  const url = req.url?.split('?')[0];
  if (url !== '/api/board') return next();

  void (async () => {
    try {
      if (req.method === 'GET') {
        const board = await readBoard();
        return send(res, 200, { board });
      }

      if (req.method === 'PUT') {
        if (!isSameOrigin(req)) {
          return send(res, 403, { error: 'İstek reddedildi.' });
        }
        const raw = await collectBody(req);

        let payload: { board?: Json; baseUpdatedAt?: string | null };
        try {
          payload = JSON.parse(raw) as typeof payload;
        } catch {
          return send(res, 400, { error: 'Gövde geçerli bir JSON değil.' });
        }

        if (!payload.board || typeof payload.board !== 'object' || Array.isArray(payload.board)) {
          return send(res, 400, { error: 'Geçersiz gövde: board alanı gerekli.' });
        }

        // Ayni dosya uzerinde calisan bir baskasinin degisikligini ezmeyelim.
        const current = await readBoard();
        const currentStamp = current && typeof current.updatedAt === 'string' ? current.updatedAt : null;
        if (currentStamp && payload.baseUpdatedAt && currentStamp !== payload.baseUpdatedAt) {
          return send(res, 409, {
            error: 'Dosya bu arada başka biri tarafından güncellenmiş.',
            board: current,
          });
        }

        await writeBoard(payload.board);
        return send(res, 200, { ok: true, updatedAt: payload.board.updatedAt ?? null });
      }

      res.setHeader('Allow', 'GET, PUT');
      return send(res, 405, { error: 'Desteklenmeyen yöntem.' });
    } catch (error) {
      // Istemciye ic detay (dosya yolu, stack) yansitmiyoruz; ayrinti sunucu
      // gunlugunde kalir.
      console.error('[board-api] istek islenemedi:', error);
      return send(res, 500, { error: 'İşlem başarısız.' });
    }
  })();
};

export function boardApiPlugin(): Plugin {
  return {
    name: 'board-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(securityHeaders(true));
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(securityHeaders(false));
      server.middlewares.use(middleware);
    },
  };
}
