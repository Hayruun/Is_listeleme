/**
 * Kisisel takip listesi.
 *
 * Panonun ortak dosyasina yazilmaz: bir kisinin yildizladigi isler baskasini
 * ilgilendirmez. Gorunum tercihleri gibi kullanici kimligine gore saklanir.
 */
const keyFor = (userId: string): string => `is-listeleme:starred:${userId}`;

export function loadStarred(userId: string): string[] {
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return [];
  }
}

export function saveStarred(userId: string, ids: string[]): void {
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(ids));
  } catch {
    // Depolama kapali: liste yalnizca bu oturumda gecerli olur.
  }
}
