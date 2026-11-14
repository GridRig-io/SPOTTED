import { StyleSheet, View } from "react-native";
import { glanceFor, type AmenityMap } from "@spotted/tokens";
import { colors, radii } from "@/theme";
import { Icon } from "./Icon";
import { Text } from "./ui";

/** The four things Abuja guests ask about first, on every card: bold enough to read, quiet enough not to shout. */
export function GlancePills({ amenities }: { amenities: AmenityMap }) {
  const g = glanceFor(amenities);
  return (
    <View style={styles.wrap}>
      {g.map((t) => {
        const off = /^No /.test(t.value);
        const paid = /Extra cost/.test(t.value);
        const bg = off ? colors.cream2 : paid ? colors.sand : colors.mist;
        const fg = off ? colors.muted : paid ? colors.orange : colors.forest;
        return (
          <View key={t.key} style={[styles.pill, { backgroundColor: bg }]} accessibilityLabel={`${t.label}: ${t.value}`}>
            <Icon name={t.icon} size={15} color={fg} />
            <Text v="caption" color={fg} style={{ fontFamily: "Inter_600SemiBold" }}>{t.value}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: radii.pill },
});
