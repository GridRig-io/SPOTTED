import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AMENITIES } from "@spotted/tokens";
import {
  activeFilterCount, filtersFromParams, filtersToParams, formatRange, listAreas, listUnclaimed, searchRooms, SORT_LABEL,
  type SearchFilters, type SortKey,
} from "@spotted/core";
import { DateRangePicker } from "@/components/DateRangePicker";
import { FilterSheet, toggleAmenity } from "@/components/FilterSheet";
import { Icon } from "@/components/Icon";
import { RoomCard } from "@/components/RoomCard";
import { BackBar } from "@/components/Screen";
import { Badge, Button, Card, CardsSkeleton, Chip, Empty, SetupNotice, Text } from "@/components/ui";
import { hasSupabase } from "@/lib/env";
import { useLoad } from "@/lib/useLoad";
import { useAuth } from "@/providers/AuthProvider";
import { colors, textStyle } from "@/theme";

const PARAM_KEYS = ["area", "q", "in", "out", "guests", "min", "max", "amenities", "kind", "sort"] as const;
const QUICK = ["grid_power", "backup_power", "wifi", "guard", "air_conditioning", "parking"];
const SORTS = Object.keys(SORT_LABEL) as SortKey[];

export default function Search() {
  const router = useRouter();
  const { db } = useAuth();
  const raw = useLocalSearchParams<Record<string, string | string[]>>();
  const get = (k: string) => { const v = raw[k]; return Array.isArray(v) ? v[0] : v; };
  const filters = filtersFromParams(get);
  const [sheet, setSheet] = useState(false);
  const [dates, setDates] = useState(false);
  const [text, setText] = useState(filters.q ?? "");

  const apply = (f: SearchFilters) => {
    const next = filtersToParams(f);
    router.setParams(Object.fromEntries(PARAM_KEYS.map((k) => [k, next[k]])));
  };
  const key = JSON.stringify(filtersToParams(filters));
  const { data, error, loading, reload } = useLoad(db ? async () => {
    const [areas, rooms, unclaimed] = await Promise.all([listAreas(db), searchRooms(db, filters, 0, 30), listUnclaimed(db, filters.area)]);
    return { areas, rooms, unclaimed };
  } : null, key);

  const area = data?.areas.find((a) => a.slug === filters.area);
  const n = activeFilterCount(filters);
  const carry: Record<string, string> = {};
  if (filters.checkIn && filters.checkOut) { carry.in = filters.checkIn; carry.out = filters.checkOut; }
  if (filters.guests) carry.guests = String(filters.guests);

  const header = (
    <View style={{ gap: 14, paddingBottom: 8 }}>
      <BackBar />
      <View style={styles.searchBox}>
        <Icon name="search" size={20} color={colors.forest} />
        <TextInput value={text} onChangeText={setText} placeholder="Area, street or place name" placeholderTextColor={colors.soft}
          returnKeyType="search" onSubmitEditing={() => apply({ ...filters, q: text.trim() || undefined })} accessibilityLabel="Search places"
          style={[textStyle("body"), { flex: 1, color: colors.ink, minHeight: 48 }]} />
        {text ? <Pressable onPress={() => { setText(""); apply({ ...filters, q: undefined }); }} accessibilityLabel="Clear search" hitSlop={10}><Icon name="x" size={18} color={colors.muted} /></Pressable> : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hrow}>
        <Chip label="All of Abuja" on={!filters.area} onPress={() => apply({ ...filters, area: undefined })} />
        {(data?.areas ?? []).map((a) => <Chip key={a.slug} label={a.name} on={filters.area === a.slug} onPress={() => apply({ ...filters, area: filters.area === a.slug ? undefined : a.slug })} />)}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hrow}>
        <Chip icon="sliders-horizontal" label={`Filters${n ? ` · ${n}` : ""}`} on={n > 0} onPress={() => setSheet(true)} />
        <Chip icon="calendar" label={filters.checkIn && filters.checkOut ? formatRange(filters.checkIn, filters.checkOut) : "Add dates"} on={Boolean(filters.checkIn && filters.checkOut)} onPress={() => setDates(true)} />
        {QUICK.map((k) => {
          const a = AMENITIES.find((x) => x.key === k)!;
          return <Chip key={k} icon={a.icon} label={a.filterLabel ?? a.label} on={filters.amenities?.includes(k) ?? false} onPress={() => apply(toggleAmenity(filters, k))} />;
        })}
      </ScrollView>

      <View style={styles.between}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text v="h2" numberOfLines={1}>{area ? `Places in ${area.name}` : "Places in Abuja"}</Text>
          <Text v="small" color={colors.muted}>{data ? (data.rooms.length ? `${data.rooms.length}${data.rooms.length >= 30 ? "+" : ""} places` : "No places") : " "}</Text>
        </View>
        <Chip icon="arrow-up-down" label={SORT_LABEL[filters.sort ?? "recommended"]} onPress={() => apply({ ...filters, sort: SORTS[(SORTS.indexOf(filters.sort ?? "recommended") + 1) % SORTS.length] })} />
      </View>
    </View>
  );

  const footer = data?.unclaimed.length ? (
    <View style={{ gap: 12, marginTop: 28 }}>
      <Text v="h3">Also in {area ? area.name : "Abuja"}, not on Spotted yet</Text>
      <Text v="small" color={colors.muted}>These places exist but nobody has claimed them, so we cannot show verified amenities or take bookings.</Text>
      {data.unclaimed.map((u) => (
        <Card key={u.id} onPress={() => router.push({ pathname: "/place/[slug]", params: { slug: u.slug } })} accessibilityLabel={`${u.name}, not claimed yet`} style={{ gap: 6 }}>
          <Badge label="Not claimed yet" tone="warn" />
          <Text v="h4">{u.name}</Text>
          <Text v="small" color={colors.muted}>{u.area_name}{u.area_hint ? ` · ${u.area_hint}` : ""}</Text>
        </Card>
      ))}
    </View>
  ) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={["top"]}>
      {!hasSupabase ? <SetupNotice /> : (
        <FlatList
          data={data?.rooms ?? []} keyExtractor={(c) => c.room_id}
          renderItem={({ item }) => <View style={{ marginBottom: 28 }}><RoomCard card={item} params={carry} /></View>}
          ListHeaderComponent={header} ListFooterComponent={footer ?? undefined}
          ListEmptyComponent={loading && !data ? <CardsSkeleton n={2} /> : error ? <Empty icon="triangle-alert" title="We could not load places" action={<Button title="Try again" kind="quiet" onPress={reload} />}>{error}</Empty>
            : <Empty title="Nothing matches that yet" action={<Button title="Clear everything" onPress={() => { setText(""); apply({}); }} />}>Try other dates, remove a must-have, or look at a nearby area. Filters only show rooms that include what you pick.</Empty>}
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" onRefresh={reload} refreshing={loading && Boolean(data)}
        />
      )}
      <FilterSheet visible={sheet} filters={filters} onClose={() => setSheet(false)} onApply={(f) => { setSheet(false); apply(f); }} />
      <DateRangePicker visible={dates} onClose={() => setDates(false)} checkIn={filters.checkIn ?? ""} checkOut={filters.checkOut ?? ""} minNights={1} maxNights={90} blocked={[]}
        onDone={(a, b) => { setDates(false); apply({ ...filters, checkIn: a, checkOut: b }); }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 16 },
  hrow: { gap: 8, paddingRight: 20 },
  between: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
});
