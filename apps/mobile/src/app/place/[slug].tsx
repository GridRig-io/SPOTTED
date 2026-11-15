import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Linking, Pressable, ScrollView, Share, StyleSheet, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  claimPlace, cancellationLine, formatNaira, formatTime, getBlockedRanges, getProperty, getPropertyHost, getReviews, getRoomAmenities, getRoomPhotos, getRoomsOfProperty,
  googleViewUrl, nightsBetween, plural, POLICIES, PROPERTY_KIND_LABEL, ROOM_KIND_LABEL, stayTotal, type Photo as PhotoT,
} from "@spotted/core";
import { AmenityExceptions, AmenityList, GlanceTiles } from "@/components/Amenities";
import { BookingSheet } from "@/components/BookingSheet";
import { Icon } from "@/components/Icon";
import { Photo } from "@/components/Photo";
import { SaveButton } from "@/components/SaveButton";
import { BackBar } from "@/components/Screen";
import { Alert, Badge, Button, Card, Chip, Empty, Field, SetupNotice, Skeleton, Text } from "@/components/ui";
import { API_URL, hasSupabase } from "@/lib/env";
import { useLoad } from "@/lib/useLoad";
import { useAuth } from "@/providers/AuthProvider";
import { colors, radii } from "@/theme";

export default function PlaceScreen() {
  const router = useRouter();
  const { db } = useAuth();
  const p = useLocalSearchParams<{ slug: string; room?: string; in?: string; out?: string; guests?: string }>();
  const { width } = useWindowDimensions();
  const [sheet, setSheet] = useState(false);
  const [sel, setSel] = useState({ checkIn: p.in ?? "", checkOut: p.out ?? "", guests: Number(p.guests) || 1 });
  const [allAmenities, setAllAmenities] = useState(false);

  const { data, error, reload } = useLoad(db ? async () => {
    const property = await getProperty(db, p.slug);
    if (!property) return { kind: "missing" as const };
    if (property.status === "unclaimed") return { kind: "unclaimed" as const, property };
    const rooms = await getRoomsOfProperty(db, property.id);
    if (!rooms.length) return { kind: "norooms" as const };
    const room = rooms.find((r) => r.room_id === p.room) ?? rooms.find((r) => r.room_kind === "whole_flat") ?? rooms[0];
    const [photos, amenityRows, reviews, blocked, host] = await Promise.all([
      getRoomPhotos(db, room.room_id), getRoomAmenities(db, room.room_id), getReviews(db, property.id, 6), getBlockedRanges(db, room.room_id),
      getPropertyHost(db, property.id).catch(() => null),
    ]);
    return { kind: "ok" as const, property, rooms, room, photos, amenityRows, reviews, blocked, host };
  } : null, `${p.slug}|${p.room ?? ""}`);

  if (!hasSupabase) return <SafeAreaView style={styles.root}><SetupNotice /></SafeAreaView>;
  if (!data) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={{ padding: 20, gap: 16 }}>
          <BackBar />
          {error ? <Empty icon="triangle-alert" title="We could not load this place" action={<Button title="Try again" kind="quiet" onPress={reload} />}>{error}</Empty>
            : <><Skeleton height={240} radius={radii.lg} /><Skeleton height={28} width="70%" /><Skeleton height={16} width="50%" /></>}
        </View>
      </SafeAreaView>
    );
  }
  if (data.kind === "missing") return <SafeAreaView style={styles.root}><View style={{ padding: 20 }}><BackBar /><Empty title="We could not find that place" /></View></SafeAreaView>;
  if (data.kind === "norooms") return <SafeAreaView style={styles.root}><View style={{ padding: 20 }}><BackBar /><Empty icon="bed" title="No rooms are open right now">This place has no rooms available to book at the moment.</Empty></View></SafeAreaView>;
  if (data.kind === "unclaimed") return <Unclaimed property={data.property} />;

  const { property, rooms, room, photos, amenityRows, reviews, blocked, host } = data;
  const policy = POLICIES[property.cancellation_policy ?? "moderate"];
  const nights = sel.checkIn && sel.checkOut ? nightsBetween(sel.checkIn, sel.checkOut) : 0;
  const cancel = cancellationLine(property.cancellation_policy ?? "moderate", sel.checkIn || null);
  const share = () => void Share.share({ message: `${property.name} on Spotted: ${API_URL}/place/${property.slug}`, url: `${API_URL}/place/${property.slug}`, title: property.name });
  const shown: (PhotoT | null)[] = photos.length ? photos : [null];
  const roomsSorted = [...rooms].sort((a, b) => Number(b.room_kind === "whole_flat") - Number(a.room_kind === "whole_flat"));
  const nextPath = (v: { checkIn: string; checkOut: string; guests: number }) => {
    const q = new URLSearchParams({ room: room.room_id, ...(v.checkIn && v.checkOut ? { in: v.checkIn, out: v.checkOut } : {}), guests: String(v.guests) });
    return `/place/${property.slug}?${q.toString()}`;
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View>
          <FlatList horizontal pagingEnabled showsHorizontalScrollIndicator={false} data={shown} keyExtractor={(_, i) => String(i)}
            renderItem={({ item, index }) => <View style={{ width, height: width * 0.8 }}><Photo photo={item} seed={room.room_id} index={index} alt={`${room.room_name} photo ${index + 1}`} style={{ height: "100%" }} /></View>} />
          <SafeAreaView edges={["top"]} style={styles.overlay} pointerEvents="box-none">
            <View style={styles.overlayRow} pointerEvents="box-none">
              <BackBar />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable onPress={share} accessibilityRole="button" accessibilityLabel="Share this place" style={styles.roundBtn}><Icon name="share" size={20} /></Pressable>
                <SaveButton propertyId={property.id} size={44} />
              </View>
            </View>
          </SafeAreaView>
          {shown.length > 1 ? <View style={styles.count}><Text v="caption" color={colors.cream}>{plural(shown.length, "photo")} · swipe</Text></View> : null}
        </View>

        <View style={styles.body}>
          <View style={{ gap: 6 }}>
            <Text v="h1" accessibilityRole="header">{property.name}</Text>
            <View style={styles.meta}>
              <Text v="small" color={colors.muted}>{PROPERTY_KIND_LABEL[property.kind]}</Text>
              {property.rating_count > 0
                ? <><Text v="small" color={colors.muted}>·</Text><Icon name="star" size={14} color={colors.gold} fill={colors.gold} /><Text v="smallStrong">{Number(property.rating_avg).toFixed(1)} ({property.rating_count})</Text></>
                : <Badge label="New" />}
            </View>
            <View style={styles.meta}>
              <Icon name="map-pin" size={14} color={colors.muted} />
              <Text v="small" color={colors.muted} style={{ flex: 1 }}>{property.area?.name}{property.area_hint ? `, ${property.area_hint}` : ""}{property.area?.state ? ` · ${property.area.state.short_name}` : ""}</Text>
            </View>
          </View>

          {rooms.length > 1 ? (
            <View style={{ gap: 8 }}>
              <Text v="label" color={colors.muted} style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>{plural(rooms.length, "room")} at this place</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {roomsSorted.map((r) => <Chip key={r.room_id} label={`${r.room_name} · ₦${Math.round(r.price_per_night / 1000)}k`} on={r.room_id === room.room_id} onPress={() => router.setParams({ room: r.room_id })} />)}
              </ScrollView>
            </View>
          ) : null}

          <View style={{ gap: 8 }}>
            <Text v="h2">{room.room_name}</Text>
            <Text v="small" color={colors.muted}>
              {ROOM_KIND_LABEL[room.room_kind]} · Sleeps {room.max_guests} · {plural(room.beds, "bed")} · {plural(room.bathrooms, "bathroom")}{room.min_nights > 1 ? ` · ${room.min_nights} nights minimum` : ""}
            </Text>
            <Text>{property.description}</Text>
          </View>

          {host ? (
            <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={styles.avatar}><Text v="h3" color={colors.cream}>{host.first_name.slice(0, 1).toUpperCase()}</Text></View>
              <View style={{ flex: 1 }}>
                <Text v="bodyStrong">Hosted by {host.first_name}{host.business_name ? ` · ${host.business_name}` : ""}</Text>
                <Text v="small" color={colors.muted}>On Spotted since {new Date(host.host_since).getFullYear()} · Reviewed by Spotted</Text>
              </View>
            </Card>
          ) : null}

          <View style={{ gap: 14 }}>
            <Text v="h2">What this place offers</Text>
            <GlanceTiles rows={amenityRows} />
            <AmenityExceptions rows={amenityRows} />
            {allAmenities ? <AmenityList rows={amenityRows} /> : null}
            <Button kind="quiet" icon={allAmenities ? "chevron-down" : "chevron-right"} title={allAmenities ? "Hide the full list" : `See all ${amenityRows.length} answers`} onPress={() => setAllAmenities((v) => !v)} style={{ alignSelf: "flex-start" }} />
          </View>

          <View style={{ gap: 8 }}>
            <Text v="h2">Times and rules</Text>
            <Text><Text v="bodyStrong">Check in</Text> from {formatTime(property.check_in_from)} · <Text v="bodyStrong">Check out</Text> by {formatTime(property.check_out_by)}</Text>
            {property.house_rules ? <Text>{property.house_rules}</Text> : null}
          </View>

          <View style={{ gap: 8 }}>
            <Text v="h2">Cancellation</Text>
            <Card style={{ gap: 6 }}>
              <Badge label={policy.label} />
              <Text>{policy.long}</Text>
            </Card>
          </View>

          <View style={{ gap: 8 }}>
            <Text v="h2">Where it is</Text>
            <Text color={colors.muted}>{property.area?.name}{property.area_hint ? `, ${property.area_hint}` : ""}. Before you book we only show the rough area (about 1 km). The exact pin, landmark and Get directions appear on your booking from the day before check-in.</Text>
            {property.lat && property.lng ? <Button small kind="quiet" icon="map" title="See the rough area in Maps" style={{ alignSelf: "flex-start" }}
              onPress={() => void Linking.openURL(googleViewUrl({ lat: Number(property.lat), lng: Number(property.lng) }))} /> : null}
          </View>

          <View style={{ gap: 10 }}>
            <Text v="h2">Guest reviews</Text>
            {reviews.length ? reviews.map((r) => (
              <Card key={r.id} style={{ gap: 6 }}>
                <View style={styles.between}><Text v="bodyStrong">{r.guest_first_name}</Text><View style={styles.meta}><Icon name="star" size={14} color={colors.gold} fill={colors.gold} /><Text v="smallStrong">{r.rating}</Text></View></View>
                {r.comment ? <Text>{r.comment}</Text> : null}
              </Card>
            )) : <Text color={colors.muted}>No reviews yet. Reviews can only come from guests who stayed.</Text>}
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={styles.bar}>
        <View style={styles.barRow}>
          <Pressable onPress={() => setSheet(true)} accessibilityRole="button" style={{ flex: 1 }}>
            {nights ? <Text><Text v="h3">{formatNaira(stayTotal(room, nights))}</Text> <Text v="small" color={colors.muted}>for {plural(nights, "night")}</Text></Text>
              : <Text><Text v="h3">{formatNaira(room.price_per_night)}</Text> <Text v="small" color={colors.muted}>a night</Text></Text>}
            <Text v="caption" color={cancel.free ? colors.forest : colors.muted}>{cancel.text}</Text>
          </Pressable>
          <Button kind="accent" small title={sel.checkIn && sel.checkOut ? "Reserve" : "Check dates"} onPress={() => setSheet(true)} style={{ paddingHorizontal: 24 }} />
        </View>
      </SafeAreaView>

      <BookingSheet visible={sheet} onClose={() => setSheet(false)} roomId={room.room_id} price={room.price_per_night} maxGuests={room.max_guests}
        minNights={room.min_nights} maxNights={room.max_nights} blocked={blocked} checkIn={sel.checkIn} checkOut={sel.checkOut} guests={Math.min(sel.guests, room.max_guests)}
        onChange={setSel} nextPath={nextPath} policy={property.cancellation_policy ?? "moderate"} />
    </View>
  );
}

function Unclaimed({ property }: { property: NonNullable<Awaited<ReturnType<typeof getProperty>>> }) {
  const router = useRouter();
  const { db, user } = useAuth();
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState("");

  async function submit() {
    if (!db) return;
    if (!user) { router.push({ pathname: "/signin", params: { next: `/place/${property.slug}` } }); return; }
    setState("busy"); setErr("");
    try { await claimPlace(db, property.id, note); setState("done"); } catch (x) { setErr(x instanceof Error ? x.message : "Try again."); setState("idle"); }
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <BackBar />
        <Badge label="Not claimed yet" tone="warn" />
        <Text v="h1">{property.name}</Text>
        <Text color={colors.muted}>{PROPERTY_KIND_LABEL[property.kind]} · {property.area?.name}{property.area_hint ? ` · ${property.area_hint}` : ""}</Text>
        <Alert tone="info">Nobody has claimed this place on Spotted, so we have no verified photos or amenities and it cannot be booked here. If you own or manage it, claim it and guests can start booking.</Alert>
        {state === "done" ? <Alert tone="info">Thanks. We got your request and will contact you to confirm you run this place.</Alert> : (
          <Card style={{ gap: 12 }}>
            <Text v="h3">Is this your place?</Text>
            <Field label="How can we reach you, and what is your role here?" multiline value={note} onChangeText={setNote} placeholder="For example: I am the owner. Call me on 0803 000 0000." />
            {err ? <Alert>{err}</Alert> : null}
            <Button title={user ? "Ask to claim this place" : "Sign in to claim"} busy={state === "busy"} disabled={Boolean(user) && note.trim().length < 3} onPress={submit} />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  overlay: { position: "absolute", top: 0, left: 0, right: 0 },
  overlayRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 8 },
  count: { position: "absolute", bottom: 14, right: 14, backgroundColor: "rgba(23,35,28,0.7)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
  body: { padding: 20, gap: 28 },
  meta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5 },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.forest, alignItems: "center", justifyContent: "center" },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line },
  barRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
});
