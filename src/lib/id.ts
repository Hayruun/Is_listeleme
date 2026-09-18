/**
 * Kimlik uretimi.
 *
 * Guvenlik politikasi geregi rastgelelik `Math.random()` ile degil, Web Crypto
 * API (CSPRNG) ile uretilir. Bu kimlikler bir yetki/oturum jetonu degildir;
 * yine de tahmin edilebilir kimlik uretmemek icin ayni kural uygulanir.
 */
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function randomSuffix(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const byte of bytes) {
    out += ALPHABET[byte % ALPHABET.length];
  }
  return out;
}

/** Kisa, okunabilir ve carpismasi pratikte imkansiz kimlik uretir. */
export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).slice(-5)}${randomSuffix(8)}`;
}

/** Ada gore baş harfler: "Ayşe Yılmaz" -> "AY" */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase('tr-TR');
  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase('tr-TR');
}
