/** Phone sign in uses a 6-digit code by SMS. Numbers are normalised to +234. */
export function normalizeNgPhone(input: string): string | null {
  const d = input.replace(/[\s()-]/g, "");
  if (/^\+234[789]\d{9}$/.test(d)) return d;
  if (/^234[789]\d{9}$/.test(d)) return "+" + d;
  if (/^0[789]\d{9}$/.test(d)) return "+234" + d.slice(1);
  if (/^[789]\d{9}$/.test(d)) return "+234" + d;
  return null;
}

