/** Valid `data-theme` values + localStorage helpers for palette switching. */

export const MN_THEME_STORAGE_KEY = "movieNight.theme";

export const MN_THEME_IDS = [
  "wisteria-glow",
  "aura-green",
  "aqua-lounge",
  "lavender-dream",
  "party-mode",
] as const;

export type MnThemeId = (typeof MN_THEME_IDS)[number];

export const DEFAULT_MN_THEME: MnThemeId = "wisteria-glow";

export function isValidMnThemeId(value: string): value is MnThemeId {
  return (MN_THEME_IDS as readonly string[]).includes(value);
}

export function normalizeStoredTheme(value: string | null | undefined): MnThemeId {
  if (value && isValidMnThemeId(value)) return value;
  return DEFAULT_MN_THEME;
}

export const MN_THEME_LABELS: Record<MnThemeId, string> = {
  "wisteria-glow": "Wisteria Glow",
  "aura-green": "Aura Green",
  "aqua-lounge": "Aqua Lounge",
  "lavender-dream": "Lavender Dream",
  "party-mode": "Party Mode",
};

/** Five-stripe preview hex per theme (for swatch UI). */
export const MN_THEME_SWATCHES: Record<
  MnThemeId,
  readonly [string, string, string, string, string]
> = {
  "wisteria-glow": ["#0A0A12", "#BD93D8", "#B47AEA", "#9799CA", "#7BCDBA"],
  "aura-green": ["#0A0A12", "#61E294", "#7BCDBA", "#9799CA", "#BD93D8"],
  "aqua-lounge": ["#0A0A12", "#7BCDBA", "#9799CA", "#BD93D8", "#B47AEA"],
  "lavender-dream": ["#0A0A12", "#9799CA", "#BD93D8", "#B47AEA", "#61E294"],
  "party-mode": ["#61E294", "#7BCDBA", "#9799CA", "#BD93D8", "#B47AEA"],
};
