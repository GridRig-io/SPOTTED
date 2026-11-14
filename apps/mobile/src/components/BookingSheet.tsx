import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createBooking, formatDay, formatNaira, nightsBetween, plural, quoteStay, type BlockedRange, type Quote } from "@spotted/core";
import { colors, radii } from "@/theme";
import { useLoad } from "@/lib/useLoad";
import { useAuth } from "@/providers/AuthProvider";
import { DatePickerView } from "./DateRangePicker";
import { Icon } from "./Icon";
import { Alert, Button, Skeleton, Text } from "./ui";

function overlaps(a: string, b: string, blocked: BlockedRange[]) { return blocked.some((r) => a < r.check_out && b > r.check_in); }

interface Props {
  visible: boolean; onClose: () => void; nextPath: (v: { checkIn: string; checkOut: string; guests: number }) => string;
  roomId: string; price: number; maxGuests: number; minNights: number; maxNights: number; blocked: BlockedRange[];
  checkIn: string; checkOut: string; guests: number; onChange: (v: { checkIn: string; checkOut: string; guests: number }) => void;
}

/** Dates, guests, a server-calculated price, then reserve. The price shown is always the one the database will charge. */
export function BookingSheet(p: Props) {
  return (
    <Modal visible={p.visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={p.onClose}>
      {p.visible ? <Body {...p} /> : null}
    </Modal>
  );
}

function Body({ onClose, nextPath, roomId, price, maxGuests, minNights, maxNights, blocked, checkIn, checkOut, guests, onChange }: Props) {
  const router = useRouter();
  const { db, user, ready } = useAuth();
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionErr, setActionErr] = useState("");

  const local = useMemo(() => {
    if (!checkIn || !checkOut) return "";
    if (checkOut <= checkIn) return "Check-out must be after check-in.";
    const n = nightsBetween(checkIn, checkOut);
    if (n < minNights) return `This room needs at least ${plural(minNights, "night")}.`;
    if (n > maxNights) return `This room allows at most ${maxNights} nights.`;
    if (overlaps(checkIn, checkOut, blocked)) return "Those dates are taken. Try other dates.";
    return "";
  }, [checkIn, checkOut, minNights, maxNights, blocked]);

  const wantQuote = Boolean(db && checkIn && checkOut && !local);
  const { data: quote, error: quoteErr, loading } = useLoad<Quote>(wantQuote && db ? () => quoteStay(db, roomId, checkIn, checkOut, guests) : null, `${roomId}|${checkIn}|${checkOut}|${guests}`);
  const shown = wantQuote ? quote : null;
  const n = checkIn && checkOut && !local ? nightsBetween(checkIn, checkOut) : 0;

  async function reserve() {
    if (!db) return;
    if (!user) { onClose(); router.push({ pathname: "/signin", params: { next: nextPath({ checkIn, checkOut, guests }) } }); return; }
    setBusy(true); setActionErr("");
    try {
      const b = await createBooking(db, roomId, checkIn, checkOut, guests);
      onClose();
      router.push({ pathname: "/checkout/[code]", params: { code: b.code } });
    } catch (e) { setActionErr(e instanceof Error ? e.message : "Could not reserve. Try again."); setBusy(false); }
  }

  if (picking) {
    return <DatePickerView onClose={() => setPicking(false)} checkIn={checkIn} checkOut={checkOut} minNights={minNights} maxNights={maxNights} blocked={blocked}
      onDone={(a, b) => { onChange({ checkIn: a, checkOut: b, guests }); setPicking(false); }} />;
  }

  const err = actionErr || (wantQuote ? quoteErr : "");
  const canReserve = Boolean(shown?.available) && !busy && ready;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }} edges={["top", "bottom"]}>
      <View style={styles.head}>
        <Text v="h3">Reserve</Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}><Icon name="x" size={24} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
        <Text><Text v="h2">{formatNaira(price)}</Text> <Text color={colors.muted}>a night</Text></Text>

        <Pressable onPress={() => setPicking(true)} accessibilityRole="button" accessibilityLabel="Choose dates" style={styles.dates}>
          <View style={{ flex: 1, gap: 2 }}><Text v="label" color={colors.muted}>CHECK IN</Text><Text v="bodyStrong">{checkIn ? formatDay(checkIn) : "Add date"}</Text></View>
          <Icon name="chevron-right" size={18} color={colors.muted} />
          <View style={{ flex: 1, gap: 2 }}><Text v="label" color={colors.muted}>CHECK OUT</Text><Text v="bodyStrong">{checkOut ? formatDay(checkOut) : "Add date"}</Text></View>
          <Icon name="calendar" size={20} color={colors.forest} />
        </Pressable>

        <View style={styles.guests}>
          <View style={{ flex: 1 }}><Text v="bodyStrong">Guests</Text><Text v="small" color={colors.muted}>Sleeps up to {maxGuests}</Text></View>
          <Pressable disabled={guests <= 1} onPress={() => onChange({ checkIn, checkOut, guests: guests - 1 })} accessibilityRole="button" accessibilityLabel="Fewer guests" style={[styles.step, guests <= 1 && { opacity: 0.35 }]}><Icon name="minus" size={18} /></Pressable>
          <Text v="bodyStrong" style={{ minWidth: 24, textAlign: "center" }}>{guests}</Text>
          <Pressable disabled={guests >= maxGuests} onPress={() => onChange({ checkIn, checkOut, guests: guests + 1 })} accessibilityRole="button" accessibilityLabel="More guests" style={[styles.step, guests >= maxGuests && { opacity: 0.35 }]}><Icon name="plus" size={18} /></Pressable>
        </View>

        {blocked.length ? <Text v="caption" color={colors.muted}>Taken: {blocked.slice(0, 3).map((r) => `${formatDay(r.check_in)} to ${formatDay(r.check_out)}`).join(", ")}{blocked.length > 3 ? " and more" : ""}</Text> : null}
        {local ? <Alert>{local}</Alert> : null}
        {err ? <Alert>{err}</Alert> : null}
        {shown && !shown.available ? <Alert>Those dates are no longer available.</Alert> : null}

        {wantQuote && loading ? <Skeleton height={96} /> : null}
        {shown && shown.available ? (
          <View style={{ gap: 10 }} accessibilityLiveRegion="polite">
            <Line a={`${formatNaira(shown.nightly_ngn)} × ${plural(shown.nights, "night")}`} b={formatNaira(shown.subtotal_ngn)} />
            {shown.cleaning_fee_ngn ? <Line a="Cleaning fee" b={formatNaira(shown.cleaning_fee_ngn)} /> : null}
            {shown.service_fee_ngn ? <Line a="Service fee" b={formatNaira(shown.service_fee_ngn)} /> : null}
            <View style={styles.total}><Text v="h4">Total</Text><Text v="h4">{formatNaira(shown.total_ngn)}</Text></View>
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.foot}>
        <Button kind="accent" disabled={!canReserve && Boolean(user)} busy={busy} onPress={reserve}
          title={user || !ready ? (n ? "Reserve" : "Choose your dates") : "Sign in to reserve"} />
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center", marginTop: 8 }}>
          <Icon name="lock" size={14} color={colors.muted} />
          <Text v="caption" color={colors.muted} style={{ flex: 1 }}>You are not charged until the next step. Your dates are held for 20 minutes while you pay.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Line({ a, b }: { a: string; b: string }) {
  return <View style={styles.line}><Text v="small">{a}</Text><Text v="small">{b}</Text></View>;
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingBottom: 0 },
  dates: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.white, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.line, padding: 14 },
  guests: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.white, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.line, padding: 14 },
  step: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  line: { flexDirection: "row", justifyContent: "space-between" },
  total: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
  foot: { padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white },
});
