import { useRouter } from "expo-router";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { listAreas, searchRooms } from "@spotted/core";
import { Icon } from "@/components/Icon";
import { Logo, PinMark } from "@/components/Logo";
import { RoomCard } from "@/components/RoomCard";
import { Button, CardsSkeleton, Chip, Empty, Card, IconBox, SetupNotice, Text } from "@/components/ui";
import { hasSupabase } from "@/lib/env";
import { useLoad } from "@/lib/useLoad";
import { useAuth } from "@/providers/AuthProvider";
import { colors, radii } from "@/theme";

const TRUST = [
  { icon: "zap", t: "Power", d: "Hours of grid light a day, and what backs it up." },
  { icon: "droplets", t: "Water", d: "Running or not, hot or not. No surprises at 6am." },
  { icon: "wifi", t: "Wifi", d: "A tested speed, not just the word wifi." },
  { icon: "shield-check", t: "Security", d: "Gate, guard and CCTV, each one stated." },
];

export default function Explore() {
  const router = useRouter();
  const { db } = useAuth();
  const { data, error, loading, reload } = useLoad(db ? async () => {
    const [areas, cards] = await Promise.all([listAreas(db), searchRooms(db, {}, 0, 8)]);
    return { areas, cards };
  } : null, "explore");

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={loading && Boolean(data)} onRefresh={reload} tintColor={colors.forest} />}>
        <View style={styles.hero}>
          <View style={styles.heroPin} pointerEvents="none"><PinMark size={300} color={colors.bright} /></View>
          <SafeAreaView edges={["top"]} style={{ gap: 14, paddingTop: 12 }}>
            <Logo height={30} tone="cream" />
            <View style={{ gap: 10, marginTop: 18 }}>
              <View style={styles.where}><Text v="label" color={colors.cream}>Abuja, Nigeria</Text></View>
              <Text v="display" color={colors.cream} accessibilityRole="header">Places worth staying.</Text>
              <Text color={colors.sage}>Apartments and guest houses where the power, water, wifi and security are spelled out before you book.</Text>
            </View>
            <Pressable onPress={() => router.push("/search")} accessibilityRole="search" accessibilityLabel="Search places in Abuja" style={styles.search}>
              <Icon name="search" size={20} color={colors.forest} />
              <View style={{ flex: 1 }}>
                <Text v="smallStrong">Where to in Abuja?</Text>
                <Text v="caption" color={colors.muted}>Any area · any dates · any guests</Text>
              </View>
              <View style={styles.sliders}><Icon name="sliders-horizontal" size={18} color={colors.cream} /></View>
            </Pressable>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          {!hasSupabase ? <SetupNotice /> : null}

          <View style={styles.trust}>
            {TRUST.map((t) => (
              <Card key={t.t} style={styles.tile}>
                <IconBox name={t.icon} />
                <Text v="h4">{t.t}</Text>
                <Text v="small" color={colors.muted}>{t.d}</Text>
              </Card>
            ))}
          </View>

          {hasSupabase && data ? (
            <>
              <View style={{ gap: 12 }}>
                <Text v="h2">Popular areas</Text>
                <View style={styles.wrap}>
                  {data.areas.slice(0, 10).map((a) => <Chip key={a.slug} icon="map-pin" label={a.name} onPress={() => router.push({ pathname: "/search", params: { area: a.slug } })} />)}
                </View>
              </View>
              <View style={{ gap: 16 }}>
                <View style={styles.rowBetween}>
                  <Text v="h2">Places to stay now</Text>
                  <Pressable onPress={() => router.push("/search")} accessibilityRole="link" hitSlop={10}><Text v="smallStrong" color={colors.forest}>See all</Text></Pressable>
                </View>
                {data.cards.length ? <View style={{ gap: 28 }}>{data.cards.map((c) => <RoomCard key={c.room_id} card={c} />)}</View>
                  : <Text color={colors.muted}>No places are listed yet. Check back soon.</Text>}
              </View>
            </>
          ) : null}
          {hasSupabase && !data && loading ? <CardsSkeleton n={2} /> : null}
          {error && !data ? <Empty icon="triangle-alert" title="We could not load places" action={<Button title="Try again" kind="quiet" onPress={reload} />}>{error}</Empty> : null}

          <View style={styles.host}>
            <Text v="h2" color={colors.cream}>Own a flat or guest house in Abuja?</Text>
            <Text color={colors.sage}>List it free for your first 2 months. Post at least 5 photos per room, answer 22 plain questions, and guests find you.</Text>
            <Button kind="accent" title="How hosting works" onPress={() => router.push("/help")} style={{ alignSelf: "flex-start" }} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.forest, paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden" },
  heroPin: { position: "absolute", right: -60, top: 40, opacity: 0.16 },
  where: { alignSelf: "flex-start", backgroundColor: "rgba(250,245,233,0.14)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
  search: { backgroundColor: colors.cream, borderRadius: radii.xl, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 },
  sliders: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.forest, alignItems: "center", justifyContent: "center" },
  body: { padding: 20, gap: 28 },
  trust: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { width: "47.5%", flexGrow: 1, gap: 6 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  host: { backgroundColor: colors.forest, borderRadius: radii.xl, padding: 20, gap: 12 },
});
