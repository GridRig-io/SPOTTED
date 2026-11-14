import { Image } from "expo-image";
import { StyleSheet, View, type StyleProp, type ViewStyle, type ImageStyle } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { SCENES, sceneFor, type Scene } from "@spotted/tokens";
import type { Photo as CorePhoto } from "@spotted/core";
import { colors } from "@/theme";

export function SceneArt({ scene }: { scene: Scene }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" accessibilityLabel={scene.label}>
      {scene.shapes.map((s, i) =>
        s.t === "rect" ? <Rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} fill={s.fill} opacity={s.o} />
        : s.t === "circle" ? <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} opacity={s.o} />
        : <Path key={i} d={s.d} fill={s.fill} opacity={s.o} />,
      )}
    </Svg>
  );
}

/** A real photo when there is one, otherwise the same illustrated stand-in the website draws for that room. */
export function Photo({ photo, seed, index = 0, alt, style }: { photo?: CorePhoto | null; seed: string; index?: number; alt: string; style?: StyleProp<ViewStyle & ImageStyle> }) {
  if (photo?.url) {
    return <Image source={{ uri: photo.url }} style={[styles.fill, style]} contentFit="cover" transition={150} accessibilityLabel={alt} />;
  }
  const scene = photo?.scene && SCENES[photo.scene as keyof typeof SCENES] ? SCENES[photo.scene as keyof typeof SCENES] : sceneFor(seed, index);
  return <View style={[styles.fill, { backgroundColor: colors.mist }, style]} accessibilityLabel={alt} accessibilityRole="image"><SceneArt scene={scene} /></View>;
}

const styles = StyleSheet.create({ fill: { width: "100%", overflow: "hidden" } });
