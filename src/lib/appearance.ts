import {
  alpha,
  ensureContrast,
  hexToHsl,
  hslToHex,
  isValidHex,
  readableInk,
} from './color';
import {
  DEFAULT_PALETTE_ID,
  DEFAULT_STATES,
  TYPE_SLOTS,
  findPalette,
  type Palette,
} from './palettes';
import type { WorkItemState } from '../types';

export type ThemeMode = 'system' | 'light' | 'dark';

export const CUSTOM_PALETTE_ID = 'custom';

export interface Appearance {
  theme: ThemeMode;
  paletteId: string;
  /** "Kendi paletim" secildiginde kullanilan bes renk. */
  customColors: string[];
  customAccentIndex: number;
}

export const DEFAULT_APPEARANCE: Appearance = {
  theme: 'system',
  paletteId: DEFAULT_PALETTE_ID,
  customColors: ['#4f46e5', '#0284c7', '#0d9488', '#64748b', '#e11d48'],
  customAccentIndex: 0,
};

/* ------------------------------------------------------------------ *
 * Kullanici basina saklama
 * ------------------------------------------------------------------ */

const keyFor = (userId: string): string => `is-listeleme:appearance:${userId}`;

export function loadAppearance(userId: string): Appearance {
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return DEFAULT_APPEARANCE;
    const parsed = JSON.parse(raw) as Partial<Appearance>;

    const colors = Array.isArray(parsed.customColors)
      ? parsed.customColors.filter((entry): entry is string => typeof entry === 'string')
      : [];

    return {
      theme:
        parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system'
          ? parsed.theme
          : DEFAULT_APPEARANCE.theme,
      paletteId: typeof parsed.paletteId === 'string' ? parsed.paletteId : DEFAULT_PALETTE_ID,
      customColors: DEFAULT_APPEARANCE.customColors.map((fallback, index) =>
        isValidHex(colors[index] ?? '') ? (colors[index] as string) : fallback,
      ),
      customAccentIndex:
        typeof parsed.customAccentIndex === 'number' &&
        parsed.customAccentIndex >= 0 &&
        parsed.customAccentIndex < 5
          ? parsed.customAccentIndex
          : 0,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function saveAppearance(userId: string, appearance: Appearance): void {
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(appearance));
  } catch {
    // Depolama kapali olabilir; tercih yalnizca bu oturumda gecerli olur.
  }
}

/* ------------------------------------------------------------------ *
 * Cozumleme
 * ------------------------------------------------------------------ */

export function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return mode;
}

export function resolvePalette(appearance: Appearance): Palette {
  if (appearance.paletteId === CUSTOM_PALETTE_ID) {
    const colors = appearance.customColors;
    return {
      id: CUSTOM_PALETTE_ID,
      name: 'Kendi paletim',
      note: 'Sizin girdiğiniz renkler.',
      colors: [colors[0], colors[1], colors[2], colors[3], colors[4]],
      accentIndex: appearance.customAccentIndex,
    };
  }
  return findPalette(appearance.paletteId) ?? (findPalette(DEFAULT_PALETTE_ID) as Palette);
}

/* ------------------------------------------------------------------ *
 * Paletten CSS belirtecleri
 * ------------------------------------------------------------------ */

/** Metin olarak kullanilacak renk icin aranan en dusuk kontrast. */
const TEXT_CONTRAST = 4.0;
/**
 * Rozet zemini olarak kullanilacak renk yuzeyden en az bu kadar ayrilmali.
 * Bilerek dusuk tutuldu: kullanicinin sectigi renk mumkun oldugunca korunsun,
 * gorunurlugu ise rozetin ince ic cercevesi tamamlasin.
 */
const CHIP_CONTRAST = 1.45;

const STATE_KEYS: WorkItemState[] = ['new', 'active', 'blocked', 'review', 'done'];

/**
 * Bes marka renginden tam belirtec setini uretir.
 *
 * Zemin bilerek notr birakilir: paletin tonu yalnizca cok dusuk doygunlukta
 * sizar, boylece palet arka plani boyamak yerine vurgu ve tur renklerini
 * belirler. Metin olarak kullanilacak her renk olculebilir kontrast esigine
 * gore duzeltilir, dolayisiyla kullanici okunmaz bir renk girse bile arayuz
 * okunur kalir.
 */
export function buildTokens(palette: Palette, theme: 'light' | 'dark'): Record<string, string> {
  const accentSource = palette.colors[palette.accentIndex] ?? palette.colors[0];
  const { h, s } = hexToHsl(accentSource);
  const dark = theme === 'dark';

  const tint = (saturationCap: number, lightness: number): string =>
    hslToHex({ h, s: Math.min(s, saturationCap), l: lightness });

  const surface = dark ? tint(14, 11) : tint(8, 99.5);
  const page = dark ? tint(16, 7) : tint(10, 96.5);

  const tokens: Record<string, string> = {
    '--bg': page,
    '--bg-elevated': surface,
    '--bg-sunken': dark ? tint(16, 5) : tint(10, 93.5),
    '--bg-hover': dark ? tint(16, 16) : tint(12, 92),
    '--surface-glass': alpha(surface, dark ? 0.86 : 0.82),
    '--border': dark ? tint(14, 20) : tint(12, 88),
    '--border-strong': dark ? tint(14, 29) : tint(12, 78),
    '--text': dark ? tint(14, 96) : tint(20, 11),
    '--text-muted': dark ? tint(12, 71) : tint(12, 36),
    '--text-faint': dark ? tint(10, 54) : tint(10, 52),
  };

  const accent = ensureContrast(accentSource, surface, TEXT_CONTRAST);
  const accentHsl = hexToHsl(accent);
  tokens['--accent'] = accent;
  tokens['--accent-strong'] = hslToHex({
    ...accentHsl,
    l: dark ? Math.min(accentHsl.l + 9, 92) : Math.max(accentHsl.l - 9, 8),
  });
  tokens['--accent-soft'] = dark ? tint(38, 17) : tint(52, 93);
  tokens['--accent-contrast'] = readableInk(accent);
  tokens['--ring'] = `0 0 0 3px ${alpha(accent, dark ? 0.34 : 0.3)}`;

  // Tur renkleri rozet zemini olarak kullanilir: yuzeyden ayrilmasi yeterli,
  // uzerindeki murekkep okunabilirlige gore secilir.
  TYPE_SLOTS.forEach((type, index) => {
    const chip = ensureContrast(palette.colors[index] ?? accentSource, surface, CHIP_CONTRAST);
    tokens[`--type-${type}`] = chip;
    tokens[`--type-${type}-ink`] = readableInk(chip);
  });

  // Durum renkleri metin olarak kullanilir; semantik anlam korunsun diye
  // paletten degil, paletin kendi tanimindan ya da varsayilandan gelir.
  const states = palette.states ?? DEFAULT_STATES;
  for (const key of STATE_KEYS) {
    tokens[`--state-${key}`] = ensureContrast(states[key], surface, TEXT_CONTRAST);
  }

  tokens['--prio-1'] = tokens['--state-blocked'];
  tokens['--prio-2'] = tokens['--state-review'];
  tokens['--prio-3'] = tokens['--state-active'];
  tokens['--prio-4'] = tokens['--state-new'];

  tokens['--danger'] = tokens['--state-blocked'];
  tokens['--danger-soft'] = dark
    ? hslToHex({ ...hexToHsl(tokens['--state-blocked']), l: 14, s: 30 })
    : hslToHex({ ...hexToHsl(tokens['--state-blocked']), l: 92, s: 60 });

  const shadowBase = dark ? '#000000' : tint(30, 18);
  tokens['--shadow-sm'] = `0 1px 2px ${alpha(shadowBase, dark ? 0.45 : 0.07)}`;
  tokens['--shadow'] =
    `0 4px 14px -4px ${alpha(shadowBase, dark ? 0.55 : 0.15)}, 0 1px 3px ${alpha(shadowBase, dark ? 0.45 : 0.08)}`;
  tokens['--shadow-lg'] = `0 24px 48px -16px ${alpha(shadowBase, dark ? 0.72 : 0.3)}`;
  tokens['--scrim'] = alpha(dark ? '#000000' : tint(40, 14), dark ? 0.62 : 0.45);

  const secondary = palette.colors[(palette.accentIndex + 2) % palette.colors.length];
  tokens['--brand-from'] = palette.colors[0];
  tokens['--brand-to'] = accentSource;
  tokens['--brand-ink'] = readableInk(palette.colors[0]);
  tokens['--progress-from'] = accent;
  tokens['--progress-to'] = ensureContrast(secondary, surface, CHIP_CONTRAST);

  return tokens;
}

/** Belirtecleri <html> uzerine yazar. */
export function applyAppearance(appearance: Appearance): 'light' | 'dark' {
  const theme = resolveTheme(appearance.theme);
  const palette = resolvePalette(appearance);
  const root = document.documentElement;

  root.dataset.theme = theme;
  for (const [name, value] of Object.entries(buildTokens(palette, theme))) {
    root.style.setProperty(name, value);
  }
  return theme;
}
