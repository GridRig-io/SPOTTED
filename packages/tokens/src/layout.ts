export const radii = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;
export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;
export const breakpoints = { tablet: 768, laptop: 1100, wide: 1440 } as const;
export const motion = {
  fast: 120,
  base: 200,
  slow: 320,
  // Loading rules from the design review: skeleton after 300 ms, never show a spinner under 1 s.
  skeletonAfter: 300,
  timeoutHint: 8000,
  easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
} as const;
export const touch = { minTarget: 44 } as const;
