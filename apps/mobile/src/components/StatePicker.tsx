import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { State } from "@spotted/core";
import { colors, radii } from "@/theme";
import { Icon } from "./Icon";
import { Text } from "./ui";

/** Separate from the area: one state at a time, same as the website. */
export function StatePicker({ states, current, onChoose, tone = "light" }: { states: State[]; current: string; onChoose: (slug: string) => void; tone?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const cur = states.find((s) => s.slug === current) ?? states[0];
  const dark = tone === "dark";
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`State: ${cur?.short_name ?? "choose"}. Change state`}
        style={({ pressed }) => [styles.btn, dark ? styles.dark : styles.light, pressed && { opacity: 0.85 }]}>
        <Icon name="map-pin" size={16} color={dark ? colors.cream : colors.forest} />
        <View>
          <Text v="label" color={dark ? colors.sage : colors.muted} style={{ textTransform: "uppercase", letterSpacing: 0.6, fontSize: 10, lineHeight: 12 }}>State</Text>
          <Text v="smallStrong" color={dark ? colors.cream : colors.ink}>{cur?.short_name ?? "Choose"}</Text>
        </View>
        <Icon name="chevron-down" size={16} color={dark ? colors.cream : colors.ink} />
      </Pressable>
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={["top", "bottom"]}>
          <View style={styles.head}>
            <Text v="h3">Which state?</Text>
            <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}><Icon name="x" size={24} /></Pressable>
          </View>
          <Text v="small" color={colors.muted} style={{ paddingHorizontal: 20, marginBottom: 8 }}>Search shows one state at a time. You can switch any time.</Text>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
            {states.map((s) => (
              <Pressable key={s.slug} onPress={() => { setOpen(false); onChoose(s.slug); }} accessibilityRole="radio" accessibilityState={{ checked: s.slug === cur?.slug }} style={styles.row}>
                <View style={{ flex: 1 }}><Text v="bodyStrong" color={s.slug === cur?.slug ? colors.forest : colors.ink}>{s.short_name}</Text><Text v="small" color={colors.muted}>{s.city}</Text></View>
                {s.slug === cur?.slug ? <Icon name="check" size={20} color={colors.forest} /> : null}
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "flex-start", minHeight: 48, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radii.pill, borderWidth: 1.5 },
  light: { backgroundColor: colors.white, borderColor: colors.line },
  dark: { backgroundColor: "rgba(250,245,233,0.12)", borderColor: "rgba(250,245,233,0.28)" },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20 },
  row: { flexDirection: "row", alignItems: "center", minHeight: 60, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 12 },
});
