// Illustrated stand-ins used whenever a room has no photo yet. Defined as plain shapes so web (SVG) and
// mobile (react-native-svg) draw exactly the same picture. Real photos always win when a URL exists.
export type Shape =
  | { t: "rect"; x: number; y: number; w: number; h: number; fill: string; rx?: number; o?: number }
  | { t: "circle"; cx: number; cy: number; r: number; fill: string; o?: number }
  | { t: "path"; d: string; fill: string; o?: number };

export interface Scene {
  id: SceneId;
  label: string;
  width: 400;
  height: 300;
  shapes: Shape[];
}
export type SceneId = "living" | "bedroom" | "kitchen" | "bathroom" | "compound" | "balcony" | "workspace" | "building";

const W = 400, H = 300;
const r = (x: number, y: number, w: number, h: number, fill: string, rx = 0, o = 1): Shape => ({ t: "rect", x, y, w, h, fill, rx, o });
const c = (cx: number, cy: number, rad: number, fill: string, o = 1): Shape => ({ t: "circle", cx, cy, r: rad, fill, o });
const p = (d: string, fill: string, o = 1): Shape => ({ t: "path", d, fill, o });

const wall = (a: string, b: string): Shape[] => [r(0, 0, W, 210, a), r(0, 210, W, 90, b)];

export const SCENES: Record<SceneId, Scene> = {
  living: {
    id: "living", label: "Living room", width: 400, height: 300,
    shapes: [
      ...wall("#EAF0E4", "#D9C9A8"),
      r(40, 40, 90, 110, "#BFD8E4", 6), r(46, 46, 78, 98, "#E3F1F7", 4), r(84, 46, 2, 98, "#BFD8E4"),
      r(150, 150, 220, 70, "#14442F", 18), r(150, 120, 220, 50, "#2F6B4F", 16), r(162, 170, 48, 36, "#C84B05", 10), r(310, 168, 48, 36, "#F2B134", 10),
      r(160, 220, 12, 20, "#8A6B3F"), r(348, 220, 12, 20, "#8A6B3F"),
      r(60, 230, 120, 14, "#A88A5C", 6), r(70, 244, 8, 22, "#8A6B3F"), r(162, 244, 8, 22, "#8A6B3F"),
      r(300, 60, 70, 46, "#17231C", 4), r(304, 64, 62, 38, "#2F6B4F", 2),
      c(25, 215, 20, "#2F6B4F"), r(21, 225, 8, 28, "#8A6B3F"),
    ],
  },
  bedroom: {
    id: "bedroom", label: "Bedroom", width: 400, height: 300,
    shapes: [
      ...wall("#FDE3BD", "#C9B58F"),
      r(250, 40, 110, 90, "#BFD8E4", 6), r(256, 46, 98, 78, "#E3F1F7", 4),
      r(70, 120, 250, 110, "#FAF5E9", 16), r(70, 120, 250, 36, "#14442F", 14), r(90, 160, 210, 60, "#CFE0D2", 12),
      r(90, 168, 90, 34, "#FFFFFF", 10), r(200, 168, 90, 34, "#FFFFFF", 10), r(70, 230, 250, 12, "#8A6B3F", 4),
      r(330, 170, 50, 60, "#8A6B3F", 6), c(355, 160, 12, "#F5480F"), r(351, 168, 8, 10, "#F5480F"),
      r(30, 60, 8, 150, "#17231C", 3), c(34, 56, 14, "#F2B134"),
    ],
  },
  kitchen: {
    id: "kitchen", label: "Kitchen", width: 400, height: 300,
    shapes: [
      ...wall("#F5F0E4", "#CDBB96"),
      r(20, 60, 360, 40, "#14442F", 6), r(30, 110, 340, 20, "#2F6B4F", 4),
      r(20, 140, 360, 90, "#FAF5E9", 6), r(20, 140, 360, 14, "#A88A5C"),
      r(40, 160, 70, 60, "#EAF0E4", 6), r(120, 160, 70, 60, "#EAF0E4", 6),
      r(220, 120, 60, 22, "#17231C", 4), c(236, 130, 6, "#C84B05"), c(264, 130, 6, "#C84B05"),
      r(300, 100, 60, 40, "#9AA59E", 6), r(306, 106, 36, 28, "#17231C", 3),
      r(280, 70, 10, 30, "#F5480F", 3), r(300, 76, 10, 24, "#F2B134", 3),
    ],
  },
  bathroom: {
    id: "bathroom", label: "Bathroom", width: 400, height: 300,
    shapes: [
      ...wall("#CFE0D2", "#EAF0E4"),
      r(0, 150, W, 2, "#FAF5E9"), r(0, 190, W, 2, "#FAF5E9"),
      r(40, 130, 140, 60, "#FFFFFF", 14), r(40, 190, 140, 50, "#FAF5E9", 10),
      r(60, 40, 90, 70, "#BFD8E4", 8), r(66, 46, 78, 58, "#E3F1F7", 5),
      r(240, 60, 110, 170, "#BFD8E4", 8, 0.55), r(244, 64, 102, 162, "#FFFFFF", 6, 0.35),
      c(295, 80, 10, "#9AA59E"), r(292, 86, 6, 40, "#9AA59E"),
      r(220, 235, 150, 14, "#14442F", 6),
    ],
  },
  compound: {
    id: "compound", label: "Compound", width: 400, height: 300,
    shapes: [
      r(0, 0, W, 170, "#BFD8E4"), r(0, 170, W, 130, "#8FB89A"),
      c(330, 55, 28, "#F2B134"),
      r(90, 80, 220, 110, "#FAF5E9", 4), p("M80 84 L200 28 L320 84 Z", "#C84B05"),
      r(120, 110, 40, 40, "#14442F", 4), r(240, 110, 40, 40, "#14442F", 4), r(180, 130, 40, 60, "#8A6B3F", 4),
      r(0, 190, W, 20, "#6E9E7C"), r(0, 190, 12, 70, "#14442F"), r(388, 190, 12, 70, "#14442F"),
      r(12, 200, 376, 8, "#14442F"), r(12, 232, 376, 8, "#14442F"),
      r(150, 250, 100, 50, "#CFC6B0"), r(310, 215, 60, 26, "#C84B05", 8), c(322, 244, 8, "#17231C"), c(358, 244, 8, "#17231C"),
    ],
  },
  balcony: {
    id: "balcony",
    label: "Balcony", width: 400, height: 300,
    shapes: [
      r(0, 0, W, 190, "#BFD8E4"), c(70, 60, 26, "#F2B134"), c(310, 50, 20, "#FFFFFF", 0.85), c(335, 56, 24, "#FFFFFF", 0.85),
      p("M0 190 L60 120 L120 170 L190 100 L260 175 L330 125 L400 190 Z", "#6E9E7C"),
      r(0, 190, W, 110, "#D9C9A8"), r(0, 190, W, 10, "#14442F"),
      r(30, 190, 6, 80, "#14442F"), r(130, 190, 6, 80, "#14442F"), r(230, 190, 6, 80, "#14442F"), r(330, 190, 6, 80, "#14442F"),
      r(150, 230, 100, 14, "#C84B05", 6), r(160, 244, 8, 30, "#8A6B3F"), r(232, 244, 8, 30, "#8A6B3F"),
      c(350, 260, 22, "#2F6B4F"), r(340, 270, 20, 22, "#C84B05", 4),
    ],
  },
  workspace: {
    id: "workspace", label: "Work desk", width: 400, height: 300,
    shapes: [
      ...wall("#EAF0E4", "#CDBB96"),
      r(40, 130, 320, 12, "#8A6B3F", 4), r(60, 142, 10, 90, "#8A6B3F"), r(330, 142, 10, 90, "#8A6B3F"),
      r(140, 70, 120, 60, "#17231C", 6), r(146, 76, 108, 48, "#2F6B4F", 4), r(194, 130, 12, 6, "#9AA59E"),
      r(280, 100, 30, 30, "#F5480F", 6), r(286, 92, 18, 10, "#F5480F", 4),
      r(80, 110, 36, 20, "#FAF5E9", 3), r(230, 220, 90, 14, "#14442F", 6), r(240, 234, 8, 30, "#17231C"), r(300, 234, 8, 30, "#17231C"),
      c(60, 90, 10, "#F2B134"),
    ],
  },
  building: {
    id: "building", label: "Building", width: 400, height: 300,
    shapes: [
      r(0, 0, W, 210, "#FDE3BD"), c(60, 60, 24, "#F5480F", 0.8), r(0, 210, W, 90, "#8FB89A"),
      r(110, 50, 180, 170, "#FAF5E9", 4), r(110, 40, 180, 14, "#14442F"),
      ...[0, 1, 2].flatMap((row) => [0, 1, 2].map((col) => r(126 + col * 54, 70 + row * 46, 38, 30, row === 1 && col === 1 ? "#F2B134" : "#14442F", 3))),
      r(186, 188, 28, 32, "#C84B05", 3), r(20, 190, 40, 30, "#2F6B4F", 14), r(340, 190, 40, 30, "#2F6B4F", 14),
    ],
  },
};

export const SCENE_ORDER: SceneId[] = ["living", "bedroom", "kitchen", "bathroom", "compound", "balcony", "workspace", "building"];

/** Stable pick so the same room always gets the same stand-in picture. */
export function sceneFor(seed: string, index = 0): Scene {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return SCENES[SCENE_ORDER[(h + index) % SCENE_ORDER.length]];
}
