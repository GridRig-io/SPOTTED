import { PIN_PATH, PIN_VIEWBOX, WORDMARK } from "./logo-paths";
export { PIN_PATH, PIN_VIEWBOX, WORDMARK };

export type LogoTone = "forest" | "cream" | "mono-forest" | "mono-white";
export const logoColors: Record<LogoTone, { text: string; pin: string }> = {
  forest: { text: "#14442F", pin: "#F5480F" },
  cream: { text: "#FAF5E9", pin: "#F5480F" },
  "mono-forest": { text: "#14442F", pin: "#14442F" },
  "mono-white": { text: "#FFFFFF", pin: "#FFFFFF" },
};

/** Full logo as a standalone SVG string (web, emails, og:image). */
export function logoSvg(tone: LogoTone = "forest", height = 40): string {
  const col = logoColors[tone];
  const w = (WORDMARK.width / WORDMARK.height) * height;
  const pin = WORDMARK.pin;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WORDMARK.width} ${WORDMARK.height}" width="${w.toFixed(1)}" height="${height}" role="img" aria-label="Spotted">` +
    `<path d="${WORDMARK.sp}" fill="${col.text}"/><path d="${WORDMARK.tted}" fill="${col.text}"/>` +
    `<g transform="translate(${pin.x} ${pin.y}) scale(${pin.scale})"><path d="${PIN_PATH}" fill="${col.pin}" fill-rule="evenodd"/></g></svg>`
  );
}
