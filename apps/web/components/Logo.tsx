import { PIN_PATH, WORDMARK, logoColors, type LogoTone } from "@spotted/tokens";

/** The real Spotted logo: "sp" + the pin as the "o" + "tted", drawn as paths so it is identical everywhere. */
export function Logo({ height = 32, tone = "forest", className }: { height?: number; tone?: LogoTone; className?: string }) {
  const c = logoColors[tone];
  const w = (WORDMARK.width / WORDMARK.height) * height;
  const p = WORDMARK.pin;
  return (
    <svg className={className} width={w} height={height} viewBox={`0 0 ${WORDMARK.width} ${WORDMARK.height}`} role="img" aria-label="Spotted">
      <path d={WORDMARK.sp} fill={c.text} />
      <path d={WORDMARK.tted} fill={c.text} />
      <g transform={`translate(${p.x} ${p.y}) scale(${p.scale})`}>
        <path d={PIN_PATH} fill={c.pin} fillRule="evenodd" />
      </g>
    </svg>
  );
}

export function PinMark({ size = 24, color = "#F5480F" }: { size?: number; color?: string }) {
  return (
    <svg width={(size * 42) / 58} height={size} viewBox="0 0 42 58" aria-hidden="true">
      <path d={PIN_PATH} fill={color} fillRule="evenodd" />
    </svg>
  );
}
