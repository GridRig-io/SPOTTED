import type { TextStyle } from "react-native";
import { colors, fontFiles, radii, semantic, space, type as typeScale, type TypeName } from "@spotted/tokens";

export { colors, semantic, radii, space };

/** Maps a weight from the shared type scale to the font file that Expo loaded for it. */
function family(kind: "heading" | "body", weight: number): string {
  if (kind === "heading") return weight >= 800 ? fontFiles.heading.extra : weight >= 700 ? fontFiles.heading.bold : fontFiles.heading.medium;
  return weight >= 700 ? fontFiles.body.bold : weight >= 600 ? fontFiles.body.semibold : weight >= 500 ? fontFiles.body.medium : fontFiles.body.regular;
}

export function textStyle(name: TypeName): TextStyle {
  const t = typeScale[name];
  return { fontFamily: family(t.family, t.weight), fontSize: t.size, lineHeight: t.line };
}

export const shadow = {
  card: { shadowColor: "#17231C", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
} as const;
