import { useState } from 'react';
import {
  CUSTOM_PALETTE_ID,
  resolvePalette,
  type Appearance,
  type ThemeMode,
} from '../lib/appearance';
import { isValidHex, readableInk } from '../lib/color';
import { PALETTES, SLOT_LABELS } from '../lib/palettes';
import type { Palette } from '../lib/palettes';

interface Props {
  appearance: Appearance;
  onChange: (appearance: Appearance) => void;
  onClose: () => void;
  /** Tercihlerin kime ait oldugunu gostermek icin. */
  userName: string;
}

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'Sistem' },
  { value: 'light', label: 'Açık' },
  { value: 'dark', label: 'Koyu' },
];

function Swatches({ palette }: { palette: Palette }): JSX.Element {
  return (
    <span className="palette-card__swatches" aria-hidden="true">
      {palette.colors.map((color, index) => (
        <span key={`${color}-${index}`} style={{ background: color }} />
      ))}
    </span>
  );
}

/**
 * Gorunum tercihleri: tema, hazir paletler ve kendi renklerinizi girme.
 * Degisiklikler aninda uygulanir ve kullanici basina kaydedilir.
 */
export function AppearanceModal({ appearance, onChange, onClose, userName }: Props): JSX.Element {
  // Hex kutusuna yazarken her tus vurusunda gecerli olmayabilir; ara metni
  // ayri tutuyoruz ki kullanici rahatca duzenleyebilsin.
  const [drafts, setDrafts] = useState<string[]>(appearance.customColors);

  const isCustom = appearance.paletteId === CUSTOM_PALETTE_ID;

  const setCustomColor = (index: number, value: string): void => {
    const next = [...drafts];
    next[index] = value;
    setDrafts(next);

    if (!isValidHex(value)) return;
    const colors = [...appearance.customColors];
    colors[index] = value.startsWith('#') ? value : `#${value}`;
    onChange({ ...appearance, paletteId: CUSTOM_PALETTE_ID, customColors: colors });
  };

  const startCustom = (): void => {
    onChange({ ...appearance, paletteId: CUSTOM_PALETTE_ID });
  };

  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Görünüm">
        <header className="modal__header">
          <h2 className="modal__title">Görünüm</h2>
          <span className="spacer" />
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Kapat">
            ×
          </button>
        </header>

        <div className="modal__content">
          <p className="faint" style={{ margin: 0, fontSize: 12.5 }}>
            Bu ayarlar yalnızca <strong>{userName}</strong> için geçerli ve bu tarayıcıda saklanır;
            ekip arkadaşlarınızın görünümünü değiştirmez.
          </p>

          <div className="field">
            <span className="field__label">Tema</span>
            <div className="theme-choice">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="theme-choice__option"
                  aria-pressed={appearance.theme === option.value}
                  onClick={() => onChange({ ...appearance, theme: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="field__label">Renk paleti</span>
            <div className="palette-grid">
              {PALETTES.map((palette) => (
                <button
                  key={palette.id}
                  type="button"
                  className="palette-card"
                  aria-pressed={appearance.paletteId === palette.id}
                  onClick={() => onChange({ ...appearance, paletteId: palette.id })}
                >
                  <Swatches palette={palette} />
                  <span className="palette-card__name">
                    {palette.name}
                    {palette.accessible && (
                      <span className="palette-card__badge">RENK KÖRÜ DOSTU</span>
                    )}
                  </span>
                  <p className="palette-card__note">{palette.note}</p>
                </button>
              ))}

              <button
                type="button"
                className="palette-card"
                aria-pressed={isCustom}
                onClick={startCustom}
              >
                <span className="palette-card__swatches" aria-hidden="true">
                  {appearance.customColors.map((color, index) => (
                    <span key={`${color}-${index}`} style={{ background: color }} />
                  ))}
                </span>
                <span className="palette-card__name">Kendi paletim</span>
                <p className="palette-card__note">Beş rengi kendiniz girin.</p>
              </button>
            </div>
          </div>

          {isCustom && (
            <div className="field">
              <span className="field__label">Renkleriniz</span>
              <div className="stack" style={{ gap: 7 }}>
                {appearance.customColors.map((color, index) => {
                  const draft = drafts[index] ?? color;
                  const invalid = !isValidHex(draft);
                  return (
                    <div className="custom-color" key={SLOT_LABELS[index]}>
                      <span className="custom-color__preview" style={{ background: color }} />
                      <span className="custom-color__label">
                        {SLOT_LABELS[index]}
                        <span className="custom-color__slot">
                          {index === appearance.customAccentIndex ? 'vurgu rengi' : 'öğe rengi'}
                        </span>
                      </span>
                      <input
                        type="color"
                        className="custom-color__native"
                        value={isValidHex(color) ? color : '#000000'}
                        onChange={(event) => setCustomColor(index, event.target.value)}
                        aria-label={`${SLOT_LABELS[index]} rengi seç`}
                      />
                      <input
                        className={`input custom-color__input${invalid ? ' custom-color__input--invalid' : ''}`}
                        value={draft}
                        maxLength={7}
                        spellCheck={false}
                        onChange={(event) => setCustomColor(index, event.target.value)}
                        aria-label={`${SLOT_LABELS[index]} hex kodu`}
                        aria-invalid={invalid}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="field" style={{ marginTop: 11 }}>
                <span className="field__label">Vurgu rengi</span>
                <div className="accent-pick">
                  {appearance.customColors.map((color, index) => (
                    <button
                      key={`accent-${index}`}
                      type="button"
                      className="accent-pick__option"
                      aria-pressed={appearance.customAccentIndex === index}
                      onClick={() => onChange({ ...appearance, customAccentIndex: index })}
                    >
                      <span className="accent-pick__dot" style={{ background: color }} />
                      {SLOT_LABELS[index]}
                    </button>
                  ))}
                </div>
              </div>

              <p className="faint" style={{ fontSize: 11.5, margin: '10px 0 0', lineHeight: 1.6 }}>
                Girdiğiniz renkler zemine göre okunur hale getirilir: çok açık ya da çok koyu bir
                renk, tonu korunarak yeterli kontrasta taşınır. Yani okunmayan bir arayüz
                oluşturamazsınız.
              </p>
            </div>
          )}

          <div className="field">
            <span className="field__label">Önizleme</span>
            <div className="preview-strip">
              {SLOT_LABELS.map((label, index) => {
                const source = resolvePalette(appearance).colors[index];
                return (
                  <span
                    key={label}
                    className="type-chip"
                    style={{ background: source, color: readableInk(source) }}
                  >
                    {label}
                  </span>
                );
              })}
              <span className="spacer" />
              <button type="button" className="btn btn--sm btn--primary">
                Örnek düğme
              </button>
            </div>
          </div>
        </div>

        <footer className="panel__footer">
          <span className="faint" style={{ fontSize: 11.5 }}>
            Değişiklikler anında kaydedilir.
          </span>
          <span className="spacer" />
          <button type="button" className="btn btn--sm" onClick={onClose}>
            Kapat
          </button>
        </footer>
      </div>
    </>
  );
}
