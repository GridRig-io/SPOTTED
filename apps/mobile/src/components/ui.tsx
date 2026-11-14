import { useEffect, useState, type ReactNode } from "react";
import { Animated, Pressable, StyleSheet, Text as RNText, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from "react-native";
import { motion, touch, type TypeName } from "@spotted/tokens";
import { colors, radii, shadow, textStyle } from "@/theme";
import { Icon } from "./Icon";

export function Text({ v = "body", color, style, children, ...rest }: { v?: TypeName; color?: string; style?: StyleProp<TextStyle>; children?: ReactNode; numberOfLines?: number; accessibilityRole?: "header" | "text" | "link" }) {
  return <RNText {...rest} style={[textStyle(v), { color: color ?? colors.ink }, style]}>{children}</RNText>;
}

export function Button({ title, onPress, kind = "primary", disabled, busy, icon, small, style }: {
  title: string; onPress?: () => void; kind?: "primary" | "accent" | "quiet"; disabled?: boolean; busy?: boolean; icon?: string; small?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const bg = kind === "primary" ? colors.forest : kind === "accent" ? colors.orange : colors.white;
  const fg = kind === "quiet" ? colors.forest : colors.cream;
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button" accessibilityState={{ disabled: Boolean(off), busy: Boolean(busy) }}
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn, small && styles.btnSmall, { backgroundColor: bg, opacity: off ? 0.5 : pressed ? 0.86 : 1 },
        kind === "quiet" && { borderWidth: 1.5, borderColor: colors.line }, style,
      ]}
    >
      {icon ? <Icon name={icon} size={small ? 16 : 18} color={fg} /> : null}
      <Text v={small ? "smallStrong" : "bodyStrong"} color={fg}>{busy ? "One moment…" : title}</Text>
    </Pressable>
  );
}

export function Chip({ label, icon, on, onPress }: { label: string; icon?: string; on?: boolean; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: Boolean(on) }} onPress={onPress}
      style={({ pressed }) => [styles.chip, on && { backgroundColor: colors.forest, borderColor: colors.forest }, pressed && { opacity: 0.85 }]}>
      {icon ? <Icon name={icon} size={16} color={on ? colors.cream : colors.forest} /> : null}
      <Text v="smallStrong" color={on ? colors.cream : colors.ink}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, tone = "green" }: { label: string; tone?: "green" | "warn" | "red" }) {
  const bg = tone === "green" ? colors.mist : tone === "warn" ? colors.sand : colors.redbg;
  const fg = tone === "green" ? colors.forest : tone === "warn" ? colors.orange : colors.red;
  return <View style={[styles.badge, { backgroundColor: bg }]}><Text v="label" color={fg}>{label}</Text></View>;
}

export function Card({ children, style, onPress, accessibilityLabel }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string }) {
  if (onPress) {
    return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }, style]}>{children}</Pressable>;
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Field({ label, error, ...input }: { label: string; error?: string } & TextInputProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text v="label" color={colors.muted} style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</Text>
      <TextInput placeholderTextColor={colors.soft} {...input} accessibilityLabel={label}
        style={[styles.input, textStyle("body"), { color: colors.ink }, input.multiline && { minHeight: 96, textAlignVertical: "top", paddingTop: 12 }, input.style]} />
      {error ? <Text v="small" color={colors.red}>{error}</Text> : null}
    </View>
  );
}

export function Alert({ children, tone = "red" }: { children: ReactNode; tone?: "red" | "info" }) {
  return (
    <View accessibilityRole="alert" style={[styles.alert, tone === "info" && { backgroundColor: colors.mist }]}>
      <Icon name={tone === "red" ? "triangle-alert" : "info"} size={18} color={tone === "red" ? colors.red : colors.forest} />
      <Text v="small" color={tone === "red" ? colors.red : colors.forest} style={{ flex: 1 }}>{children}</Text>
    </View>
  );
}

/** Pulses after 300 ms of waiting, as set in the loading rules from the design review. */
export function Skeleton({ height = 16, width, radius = 12, style }: { height?: number; width?: number | `${number}%`; radius?: number; style?: StyleProp<ViewStyle> }) {
  const [v] = useState(() => new Animated.Value(0.55));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0.55, duration: 700, useNativeDriver: true }),
    ]));
    const t = setTimeout(() => loop.start(), 0);
    return () => { clearTimeout(t); loop.stop(); };
  }, [v]);
  return <Animated.View accessibilityLabel="Loading" style={[{ height, width: width ?? "100%", borderRadius: radius, backgroundColor: colors.sage2, opacity: v }, style]} />;
}

export function CardsSkeleton({ n = 3 }: { n?: number }) {
  return (
    <View style={{ gap: 28 }}>
      {Array.from({ length: n }, (_, i) => (
        <View key={i} style={{ gap: 10 }}>
          <Skeleton height={200} radius={radii.lg} />
          <Skeleton height={20} width="70%" />
          <Skeleton height={14} width="50%" />
          <Skeleton height={44} />
        </View>
      ))}
    </View>
  );
}

export function Empty({ icon = "search", title, children, action }: { icon?: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.iconbox}><Icon name={icon} size={28} color={colors.forest} /></View>
      <Text v="h3" style={{ textAlign: "center" }}>{title}</Text>
      {children ? <Text v="body" color={colors.muted} style={{ textAlign: "center", maxWidth: 320 }}>{children}</Text> : null}
      {action}
    </View>
  );
}

export function SetupNotice() {
  return (
    <Card style={{ gap: 10, margin: 20 }}>
      <Badge label="One step left" tone="warn" />
      <Text v="h3">Connect your Supabase project</Text>
      <Text color={colors.muted}>The app cannot find your database keys. Fill in the root .env file, run npm run env, then restart Expo. Steps are in docs/SETUP.md.</Text>
    </Card>
  );
}

export function IconBox({ name, size = 22 }: { name: string; size?: number }) {
  return <View style={styles.iconbox}><Icon name={name} size={size} color={colors.forest} /></View>;
}

export function Divider() { return <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: colors.line }} />; }

const styles = StyleSheet.create({
  btn: { minHeight: touch.minTarget + 8, borderRadius: radii.pill, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  btnSmall: { minHeight: touch.minTarget, paddingHorizontal: 16 },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radii.pill, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white, flexDirection: "row", alignItems: "center", gap: 6 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
  card: { backgroundColor: colors.white, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, padding: 16, ...shadow.card },
  input: { minHeight: 52, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: 14 },
  alert: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: colors.redbg, borderRadius: radii.md, padding: 12 },
  empty: { alignItems: "center", gap: 12, paddingVertical: 48, paddingHorizontal: 24 },
  iconbox: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.mist, alignItems: "center", justifyContent: "center" },
});

export { motion };
