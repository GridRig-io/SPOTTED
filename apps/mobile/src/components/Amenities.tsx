import { StyleSheet, View } from "react-native";
import { AMENITY_GROUPS, EVIDENCE_LABEL, STATE_LABEL, glanceFor, type AmenityMap } from "@spotted/tokens";
import { formatNaira, type RoomAmenityRow } from "@spotted/core";
import { colors, radii } from "@/theme";
import { Icon } from "./Icon";
import { IconBox, Text } from "./ui";

export function rowsToMap(rows: RoomAmenityRow[]): AmenityMap {
  const m: AmenityMap = {};
  for (const r of rows) if (r.state) m[r.amenity_key] = { amenity_key: r.amenity_key, state: r.state, spec_value: r.spec_value, note: r.note, extra_cost_ngn: r.extra_cost_ngn };
  return m;
}

function detail(r: RoomAmenityRow): string | null {
  const bits: string[] = [];
  if (r.state === "included") {
    if (r.amenity_key === "wifi" && r.spec_value) bits.push(`${r.spec_value} Mbps tested`);
    else if (r.amenity_key === "grid_power" && r.spec_value) bits.push(`${r.spec_value} hours a day`);
    else if (r.amenity_key === "parking" && r.spec_value) bits.push(`${r.spec_value} ${r.spec_value === 1 ? "car" : "cars"}`);
  }
  if (r.state === "paid" && r.extra_cost_ngn) bits.push(formatNaira(r.extra_cost_ngn));
  if (r.note) bits.push(r.note);
  if (r.scope === "shared") bits.push("Shared");
  return bits.length ? bits.join(" · ") : null;
}

/** Four tiles for the questions Abuja guests ask first. Always a plain sentence, never blank. */
export function GlanceTiles({ rows }: { rows: RoomAmenityRow[] }) {
  const g = glanceFor(rowsToMap(rows));
  return (
    <View style={styles.tiles}>
      {g.map((t) => (
        <View key={t.key} style={styles.tile}>
          <IconBox name={t.icon} />
          <Text v="label" color={colors.muted} style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>{t.label}</Text>
          <Text v="smallStrong">{t.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** All 22 answers, grouped. Each line is Included, Extra cost or Not offered. */
export function AmenityList({ rows }: { rows: RoomAmenityRow[] }) {
  return (
    <View style={{ gap: 14 }}>
      <Text v="small" color={colors.muted}>Every line is Included, Extra cost or Not offered. A green tick means Spotted checked it or past guests confirmed it. Anything without one is the host&apos;s own word.</Text>
      {AMENITY_GROUPS.map((g) => {
        const list = rows.filter((r) => r.group_key === g.key);
        if (!list.length) return null;
        return (
          <View key={g.key} style={styles.group} accessibilityLabel={g.label}>
            <View style={styles.groupHead}><Icon name={g.icon} size={20} color={colors.forest} /><Text v="h4">{g.label}</Text></View>
            {list.map((r) => {
              const st = r.state ?? "not_offered";
              const d = detail(r);
              const tone = st === "included" ? colors.forest : st === "paid" ? colors.orange : colors.soft;
              return (
                <View key={r.amenity_key} style={[styles.row, st === "not_offered" && { opacity: 0.75 }]}>
                  <Icon name={r.icon} size={22} color={tone} />
                  <View style={{ flex: 1 }}>
                    <Text v="bodyStrong" color={st === "not_offered" ? colors.muted : colors.ink}>{r.label}</Text>
                    {d ? <Text v="caption" color={colors.muted}>{d}</Text> : null}
                  </View>
                  {r.evidence && r.evidence !== "declared" ? <View accessibilityLabel={EVIDENCE_LABEL[r.evidence]}><Icon name="badge-check" size={16} color={colors.forest} /></View> : null}
                  <View style={[styles.state, { backgroundColor: st === "included" ? colors.mist : st === "paid" ? colors.sand : colors.cream2 }]}>
                    <Text v="label" color={tone === colors.soft ? colors.muted : tone}>{STATE_LABEL[st]}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "48%", flexGrow: 1, backgroundColor: colors.white, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 6 },
  group: { backgroundColor: colors.white, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 4 },
  groupHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.line },
  state: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radii.pill },
});
