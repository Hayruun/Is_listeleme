/**
 * Renk yardimcilari.
 *
 * Kullanici kendi paletini girebildigi icin hicbir rengin okunabilir oldugunu
 * varsayamayiz: tum ton uretimi burada, olculebilir kontrast uzerinden yapilir.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** "#abc" ve "#aabbcc" bicimlerini kabul eder; gecersizse null doner. */
export function parseHex(input: string): Rgb | null {
  const value = input.trim().replace(/^#/, '');
  const expanded =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;

  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

export function isValidHex(input: string): boolean {
  return parseHex(input) !== null;
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (value: number): string =>
    Math.round(clamp(value, 0, 255))
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) return { h: 0, s: 0, l: l * 100 };

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / delta) % 6;
  else if (max === gn) h = (bn - rn) / delta + 2;
  else h = (rn - gn) / delta + 4;

  h *= 60;
  if (h < 0) h += 360;

  return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));

  let rgb: [number, number, number];
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  const m = ln - c / 2;
  return {
    r: (rgb[0] + m) * 255,
    g: (rgb[1] + m) * 255,
    b: (rgb[2] + m) * 255,
  };
}

export function hexToHsl(hex: string): Hsl {
  const rgb = parseHex(hex);
  return rgb ? rgbToHsl(rgb) : { h: 0, s: 0, l: 50 };
}

export function hslToHex(hsl: Hsl): string {
  return toHex(hslToRgb(hsl));
}

/** WCAG bagil parlaklik. */
export function luminance(rgb: Rgb): number {
  const channel = (value: number): number => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** WCAG kontrast orani (1 ile 21 arasi). */
export function contrast(a: string, b: string): number {
  const rgbA = parseHex(a);
  const rgbB = parseHex(b);
  if (!rgbA || !rgbB) return 1;
  const lumA = luminance(rgbA);
  const lumB = luminance(rgbB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Bir rengin uzerine yazilacak metin rengini secer: hangisi daha okunakliysa
 * koyu murekkep ya da beyaz.
 */
export function readableInk(background: string, dark = '#12161b', light = '#ffffff'): string {
  return contrast(background, dark) >= contrast(background, light) ? dark : light;
}

/**
 * Rengi, hedef zemine karsi istenen kontrast oranina ulasana kadar koyulastirir
 * ya da acar. Ton (hue) korunur, yalnizca parlaklik degisir.
 *
 * Kullanicinin girdigi acik bir sari, beyaz zeminde okunamaz; bu fonksiyon onu
 * tonunu bozmadan okunur bir hardala cevirir.
 */
export function ensureContrast(hex: string, against: string, ratio: number): string {
  if (contrast(hex, against) >= ratio) return hex;

  const hsl = hexToHsl(hex);
  const goDarker = luminance(parseHex(against) as Rgb) > 0.4;
  const step = goDarker ? -2 : 2;

  let { l } = hsl;
  for (let i = 0; i < 50; i += 1) {
    l = clamp(l + step, 0, 100);
    const candidate = hslToHex({ ...hsl, l });
    if (contrast(candidate, against) >= ratio) return candidate;
    if (l === 0 || l === 100) break;
  }
  return hslToHex({ ...hsl, l });
}

/** Tonu koruyarak belirli bir parlakliga tasir. */
export function withLightness(hex: string, lightness: number, saturationCap?: number): string {
  const hsl = hexToHsl(hex);
  return hslToHex({
    h: hsl.h,
    s: saturationCap === undefined ? hsl.s : Math.min(hsl.s, saturationCap),
    l: clamp(lightness, 0, 100),
  });
}

/** İki rengi t oraninda karistirir (0 = a, 1 = b). */
export function mix(a: string, b: string, t: number): string {
  const rgbA = parseHex(a);
  const rgbB = parseHex(b);
  if (!rgbA || !rgbB) return a;
  const amount = clamp(t, 0, 1);
  return toHex({
    r: rgbA.r + (rgbB.r - rgbA.r) * amount,
    g: rgbA.g + (rgbB.g - rgbA.g) * amount,
    b: rgbA.b + (rgbB.b - rgbA.b) * amount,
  });
}

/** CSS rgba() dizesi. */
export function alpha(hex: string, value: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const round = (n: number): number => Math.round(n);
  return `rgba(${round(rgb.r)}, ${round(rgb.g)}, ${round(rgb.b)}, ${clamp(value, 0, 1)})`;
}
