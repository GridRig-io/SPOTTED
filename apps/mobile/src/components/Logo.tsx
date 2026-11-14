import Svg, { G, Path } from "react-native-svg";
import { PIN_PATH, WORDMARK, logoColors, type LogoTone } from "@spotted/tokens";

/** The real Spotted logo, drawn from the same outlined paths as the website, so it never depends on a font. */
export function Logo({ height = 32, tone = "forest" }: { height?: number; tone?: LogoTone }) {
  const c = logoColors[tone];
  const w = (WORDMARK.width / WORDMARK.height) * height;
  const p = WORDMARK.pin;
  return (
    <Svg width={w} height={height} viewBox={`0 0 ${WORDMARK.width} ${WORDMARK.height}`} accessibilityLabel="Spotted">
      <Path d={WORDMARK.sp} fill={c.text} />
      <Path d={WORDMARK.tted} fill={c.text} />
      <G transform={`translate(${p.x} ${p.y}) scale(${p.scale})`}>
        <Path d={PIN_PATH} fill={c.pin} fillRule="evenodd" />
      </G>
    </Svg>
  );
}

export function PinMark({ size = 24, color = "#F5480F" }: { size?: number; color?: string }) {
  return (
    <Svg width={(size * 42) / 58} height={size} viewBox="0 0 42 58">
      <Path d={PIN_PATH} fill={color} fillRule="evenodd" />
    </Svg>
  );
}
