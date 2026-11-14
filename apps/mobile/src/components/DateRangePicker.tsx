import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { addDays, formatDay, nightsBetween, plural, todayInLagos, type BlockedRange } from "@spotted/core";
import { colors, radii } from "@/theme";
import { Icon } from "./Icon";
import { Button, Text } from "./ui";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function overlaps(a: string, b: string, blocked: BlockedRange[]) {
  return blocked.some((r) => a < r.check_out && b > r.check_in);
}

export interface DatePickerProps {
  onClose: () => void; onDone: (checkIn: string, checkOut: string) => void;
  checkIn: string; checkOut: string; minNights: number; maxNights: number; blocked: BlockedRange[];
}

export function DateRangePicker(p: DatePickerProps & { visible: boolean }) {
  return (
    <Modal visible={p.visible} animationType="slide" onRequestClose={p.onClose} presentationStyle="pageSheet">
      {p.visible ? <DatePickerView {...p} /> : null}
    </Modal>
  );
}

export function DatePickerView({ onClose, onDone, checkIn, checkOut, minNights, maxNights, blocked }: DatePickerProps) {
  const today = todayInLagos();
  const start = checkIn || today;
  const [inn, setIn] = useState(checkIn);
  const [out, setOut] = useState(checkOut);
  const [year, setYear] = useState(Number(start.slice(0, 4)));
  const [month, setMonth] = useState(Number(start.slice(5, 7)) - 1);

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(year, month, 1)).getUTCDay(); // 0 = Sunday
    const lead = (first + 6) % 7;                                  // weeks start on Monday
    const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [year, month]);

  const choosingOut = Boolean(inn) && !out;
  const nightBlocked = (d: string) => blocked.some((r) => d >= r.check_in && d < r.check_out);
  const canPickIn = (d: string) => d >= today && !nightBlocked(d);
  const canPickOut = (d: string) => choosingOut && d > inn && !overlaps(inn, d, blocked) && nightsBetween(inn, d) <= maxNights;

  function tap(d: string) {
    if (choosingOut && d > inn) { if (canPickOut(d)) setOut(d); return; }
    if (canPickIn(d)) { setIn(d); setOut(""); }
  }

  const nights = inn && out ? nightsBetween(inn, out) : 0;
  const tooShort = Boolean(nights) && nights < minNights;
  const prevDisabled = year === Number(today.slice(0, 4)) && month <= Number(today.slice(5, 7)) - 1;
  const step = (n: number) => {
    const t = new Date(Date.UTC(year, month + n, 1));
    setYear(t.getUTCFullYear()); setMonth(t.getUTCMonth());
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.head}>
        <Text v="h3">Choose your dates</Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}><Icon name="x" size={24} /></Pressable>
      </View>
      <View style={styles.summary}>
        <View style={styles.sumBox}><Text v="label" color={colors.muted}>CHECK IN</Text><Text v="bodyStrong">{inn ? formatDay(inn) : "Pick a day"}</Text></View>
        <View style={styles.sumBox}><Text v="label" color={colors.muted}>CHECK OUT</Text><Text v="bodyStrong">{out ? formatDay(out) : inn ? "Pick a day" : "—"}</Text></View>
      </View>

      <View style={styles.monthRow}>
        <Pressable onPress={() => step(-1)} disabled={prevDisabled} accessibilityRole="button" accessibilityLabel="Previous month" style={[styles.nav, prevDisabled && { opacity: 0.3 }]}><Icon name="chevron-left" size={22} /></Pressable>
        <Text v="h4">{MONTHS[month]} {year}</Text>
        <Pressable onPress={() => step(1)} accessibilityRole="button" accessibilityLabel="Next month" style={styles.nav}><Icon name="chevron-right" size={22} /></Pressable>
      </View>
      <View style={styles.grid}>
        {WEEK.map((w, i) => <View key={`w${i}`} style={styles.cell}><Text v="caption" color={colors.muted}>{w}</Text></View>)}
        {cells.map((d, i) => {
          if (d === null) return <View key={`b${i}`} style={styles.cell} />;
          const ds = ymd(year, month, d);
          const enabled = canPickIn(ds) || canPickOut(ds);
          const isEnd = ds === inn || ds === out;
          const inside = Boolean(inn && out && ds > inn && ds < out);
          return (
            <Pressable key={ds} disabled={!enabled} onPress={() => tap(ds)} style={styles.cell}
              accessibilityRole="button" accessibilityLabel={`${d} ${MONTHS[month]}${nightBlocked(ds) ? ", taken" : ""}`} accessibilityState={{ selected: isEnd, disabled: !enabled }}>
              <View style={[styles.day, inside && { backgroundColor: colors.mist, borderRadius: 0, width: "100%" }, isEnd && { backgroundColor: colors.forest }]}>
                <Text v="smallStrong" color={isEnd ? colors.cream : enabled ? colors.ink : colors.soft} style={!enabled && nightBlocked(ds) ? { textDecorationLine: "line-through" } : undefined}>{d}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text v="caption" color={colors.muted} style={{ paddingHorizontal: 20 }}>Crossed-out days are already booked. Check-out can be the day another guest checks in.</Text>

      <View style={{ flex: 1 }} />
      <View style={styles.foot}>
        {tooShort ? <Text v="small" color={colors.red}>This room needs at least {plural(minNights, "night")}.</Text> : nights ? <Text v="small" color={colors.muted}>{plural(nights, "night")}</Text> : <Text v="small" color={colors.muted}>{inn ? "Now pick your check-out day." : "Pick your check-in day."}</Text>}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button title="Clear" kind="quiet" style={{ flex: 1 }} onPress={() => { setIn(""); setOut(""); }} />
          <Button title="Done" style={{ flex: 2 }} disabled={!nights || tooShort} onPress={() => onDone(inn, out)} />
        </View>
      </View>
    </SafeAreaView>
  );
}

/** First free check-out suggestion after a check-in. */
export const suggestOut = (checkIn: string, minNights: number) => addDays(checkIn, Math.max(1, minNights));

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20 },
  summary: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginBottom: 12 },
  sumBox: { flex: 1, backgroundColor: colors.white, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.line, padding: 12, gap: 2 },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, marginVertical: 8 },
  nav: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20 },
  cell: { width: `${100 / 7}%`, height: 46, alignItems: "center", justifyContent: "center" },
  day: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  foot: { padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white },
});
