// Single source of truth for the Spotted palette. Web reads these as CSS variables, mobile reads them directly.
export const colors = {
  forest: "#14442F",
  deep: "#06402A",
  mid: "#2F6B4F",
  sage: "#CFE0D2",
  sage2: "#DCE7D5",
  mist: "#EAF0E4",
  cream: "#FAF5E9",
  cream2: "#F5F0E4",
  line: "#E8E2D3",
  ink: "#17231C",
  muted: "#5B6B62",
  soft: "#9AA59E",
  orange: "#C84B05", // text/button orange (passes contrast on cream)
  bright: "#F5480F", // pin orange, accents on dark
  sand: "#FDE3BD",
  gold: "#F2B134",
  white: "#FFFFFF",
  red: "#B3261E",
  redbg: "#FBE4E1",
} as const;

export type ColorName = keyof typeof colors;

// Meaning-based aliases so screens never hard-code a colour.
export const semantic = {
  background: colors.cream,
  surface: colors.white,
  surfaceAlt: colors.mist,
  border: colors.line,
  text: colors.ink,
  textMuted: colors.muted,
  textOnDark: colors.cream,
  primary: colors.forest,
  primaryText: colors.cream,
  accent: colors.orange,
  accentBright: colors.bright,
  danger: colors.red,
  dangerBg: colors.redbg,
  included: colors.forest,
  includedBg: colors.mist,
  paid: colors.orange,
  paidBg: colors.sand,
  notOffered: colors.muted,
  notOfferedBg: colors.cream2,
} as const;
