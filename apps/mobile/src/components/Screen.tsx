import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/theme";
import { Icon } from "./Icon";
import { Text } from "./ui";

/** Every screen gets the same cream background, safe areas and 20 px side margins. */
export function Screen({ children, scroll = true, refreshing, onRefresh, style, edges = ["top"] }: {
  children: ReactNode; scroll?: boolean; refreshing?: boolean; onRefresh?: () => void; style?: StyleProp<ViewStyle>; edges?: ("top" | "bottom")[];
}) {
  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.content, style]} keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.forest} colors={[colors.forest]} /> : undefined}>
          {children}
        </ScrollView>
      ) : <View style={[styles.content, { flex: 1 }, style]}>{children}</View>}
    </SafeAreaView>
  );
}

export function BackBar({ title }: { title?: string }) {
  const router = useRouter();
  return (
    <View style={styles.back}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} style={styles.backBtn}>
        <Icon name="chevron-left" size={24} />
      </Pressable>
      {title ? <Text v="h4">{title}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, gap: 20, paddingBottom: 40 },
  back: { flexDirection: "row", alignItems: "center", gap: 8 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
});
