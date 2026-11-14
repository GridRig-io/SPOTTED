// Headings: Plus Jakarta Sans. Body and UI: Inter. Same on web and mobile.
export const fonts = {
  heading: "Plus Jakarta Sans",
  body: "Inter",
} as const;

// Mobile font family names (as registered by expo-font / @expo-google-fonts).
export const fontFiles = {
  heading: { medium: "PlusJakartaSans_600SemiBold", bold: "PlusJakartaSans_700Bold", extra: "PlusJakartaSans_800ExtraBold" },
  body: { regular: "Inter_400Regular", medium: "Inter_500Medium", semibold: "Inter_600SemiBold", bold: "Inter_700Bold" },
} as const;

// size / line height / weight, matching the Figma type scale.
export const type = {
  display: { size: 40, line: 48, weight: 800, family: "heading" },
  h1: { size: 32, line: 40, weight: 800, family: "heading" },
  h2: { size: 24, line: 32, weight: 800, family: "heading" },
  h3: { size: 20, line: 26, weight: 800, family: "heading" },
  h4: { size: 16, line: 22, weight: 700, family: "heading" },
  body: { size: 16, line: 24, weight: 400, family: "body" },
  bodyStrong: { size: 16, line: 24, weight: 600, family: "body" },
  small: { size: 14, line: 20, weight: 400, family: "body" },
  smallStrong: { size: 14, line: 20, weight: 600, family: "body" },
  caption: { size: 12, line: 16, weight: 500, family: "body" },
  label: { size: 12, line: 16, weight: 700, family: "body" },
} as const;
export type TypeName = keyof typeof type;
