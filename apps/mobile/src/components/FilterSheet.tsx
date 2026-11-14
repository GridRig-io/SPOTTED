import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AMENITIES } from "@spotted/tokens";
import { PRICE_PRESETS, ROOM_KIND_LABEL, type RoomKind, type SearchFilters } from "@spotted/core";
import { colors } from "@/theme";
import { Icon } from "./Icon";
import { Button, Chip, Text } from "./ui";

const KINDS: RoomKind[] = ["whole_flat", "master_room", "guest_room", "studio"];
const FILTER_AMENITIES = AMENITIES.filter((a) => a.filterable);

export function toggleAmenity(f: SearchFilters, k: string): SearchFilters {
  const s = new Set(f.amenities ?? []);
  if (s.has(k)) s.delete(k); else s.add(k);
  return { ...f, amenities: [...s] };
}

/** The full filter sheet. Same options as the website: price, type of room, and the amenities a place must include. */
export function FilterSheet({ visible, filters, onClose, onApply }: { visible: boolean; filters: SearchFilters; onClose: () => void; onApply: (f: SearchFilters) => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {visible ? <Sheet filters={filters} onClose={onClose} onApply={onApply} /> : null}
    </Modal>
  );
}

function Sheet({ filters, onClose, onApply }: { filters: SearchFilters; onClose: () => void; onApply: (f: SearchFilters) => void }) {
  const [draft, setDraft] = useState<SearchFilters>(filters);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={["top", "bottom"]}>
      <View style={styles.head}>
        <Text v="h2">Filters</Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close filters" hitSlop={10}><Icon name="x" size={24} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 28 }}>
        <View style={{ gap: 12 }}>
          <Text v="h4">Price a night</Text>
          <View style={styles.wrap}>
            {PRICE_PRESETS.map((p) => {
              const min = "min" in p ? p.min : undefined, max = "max" in p ? p.max : undefined;
              const on = draft.minPrice === min && draft.maxPrice === max;
              return <Chip key={p.label} label={p.label} on={on} onPress={() => setDraft({ ...draft, minPrice: on ? undefined : min, maxPrice: on ? undefined : max })} />;
            })}
          </View>
        </View>
        <View style={{ gap: 12 }}>
          <Text v="h4">Guests</Text>
          <View style={styles.wrap}>
            {[1, 2, 3, 4, 5, 6].map((g) => <Chip key={g} label={g === 6 ? "6+" : String(g)} on={draft.guests === g} onPress={() => setDraft({ ...draft, guests: draft.guests === g ? undefined : g })} />)}
          </View>
        </View>
        <View style={{ gap: 12 }}>
          <Text v="h4">Type of room</Text>
          <View style={styles.wrap}>
            {KINDS.map((k) => <Chip key={k} label={ROOM_KIND_LABEL[k]} on={draft.kind === k} onPress={() => setDraft({ ...draft, kind: draft.kind === k ? undefined : k })} />)}
          </View>
        </View>
        <View style={{ gap: 12 }}>
          <Text v="h4">Must have</Text>
          <Text v="small" color={colors.muted}>Only rooms that include these, not ones that charge extra.</Text>
          <View style={styles.wrap}>
            {FILTER_AMENITIES.map((a) => <Chip key={a.key} icon={a.icon} label={a.filterLabel ?? a.label} on={draft.amenities?.includes(a.key) ?? false} onPress={() => setDraft(toggleAmenity(draft, a.key))} />)}
          </View>
        </View>
      </ScrollView>
      <View style={styles.foot}>
        <Button title="Clear all" kind="quiet" style={{ flex: 1 }} onPress={() => onApply({ area: filters.area, q: filters.q, checkIn: filters.checkIn, checkOut: filters.checkOut, guests: filters.guests })} />
        <Button title="Show places" style={{ flex: 2 }} onPress={() => onApply(draft)} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingBottom: 0 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  foot: { flexDirection: "row", gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white },
});
