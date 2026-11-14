import { colors } from "./colors";
import { radii, motion } from "./layout";
import { type, fonts } from "./typography";

/** CSS custom properties for the website, generated from the same tokens the app uses. */
export function cssVariables(): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(colors)) lines.push(`  --c-${k}: ${v};`);
  for (const [k, v] of Object.entries(radii)) lines.push(`  --r-${k}: ${v}px;`);
  lines.push(`  --ease: ${motion.easing};`);
  lines.push(`  --t-fast: ${motion.fast}ms; --t-base: ${motion.base}ms; --t-slow: ${motion.slow}ms;`);
  for (const [k, t] of Object.entries(type)) {
    lines.push(`  --fs-${k}: ${t.size}px; --lh-${k}: ${t.line}px; --fw-${k}: ${t.weight};`);
  }
  lines.push(`  --font-heading: "${fonts.heading}", system-ui, sans-serif;`);
  lines.push(`  --font-body: "${fonts.body}", system-ui, sans-serif;`);
  return `:root {\n${lines.join("\n")}\n}`;
}
