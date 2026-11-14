import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert as NativeAlert, Linking, Pressable, StyleSheet, View } from "react-native";
import { cancelBooking, formatNaira, formatRange, formatTime, getBooking, getPrivateDetails, plural, todayInLagos } from "@spotted/core";
import { Icon } from "@/components/Icon";
import { PinMark } from "@/components/Logo";
import { RequireAuth } from "@/components/RequireAuth";
import { BackBar, Screen } from "@/components/Screen";
import { Alert, Button, Card, Empty, Skeleton, Text } from "@/components/ui";
import { useLoad } from "@/lib/useLoad";
import { useAuth } from "@/providers/AuthProvider";
import { colors, radii } from "@/theme";

export default function BookingScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <Screen><BackBar /><RequireAuth next={`/booking/${code}`} title="Sign in to see your booking"><Inner code={code} /></RequireAuth></Screen>;
}

function Inner({ code }: { code: string }) {
  const { db } = useAuth();
  const router = useRouter();
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const { data, error, reload } = useLoad(db ? async () => {
    const b = await getBooking(db, code);
    const priv = b && (b.status === "confirmed" || b.status === "completed") ? await getPrivateDetails(db, b.property_id).catch(() => null) : null;
    return { b, priv };
  } : null, code);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  if (!data) {
    if (error) return <Empty icon="triangle-alert" title="We could not load this booking" action={<Button title="Try again" kind="quiet" onPress={reload} />}>{error}</Empty>;
    return <View style={{ gap: 12 }}><Skeleton height={110} radius={radii.lg} /><Skeleton height={160} /></View>;
  }
  const { b, priv } = data;
  if (!b) return <Empty title="We could not find that booking" />;

  const confirmed = b.status === "confirmed" || b.status === "completed";
  const upcoming = b.check_in > todayInLagos();

  function cancel() {
    NativeAlert.alert("Cancel this booking?", "Refunds follow the host's cancellation terms.", [
      { text: "Keep booking", style: "cancel" },
      { text: "Cancel booking", style: "destructive", onPress: () => { if (db) cancelBooking(db, code).then(reload).catch((e: Error) => setErr(e.message)); } },
    ]);
  }

  return (
    <View style={{ gap: 20 }}>
      {confirmed ? (
        <View style={styles.hero}>
          <PinMark size={56} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text v="label" color={colors.sage} style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>Booking confirmed</Text>
            <Text v="h2" color={colors.cream}>{b.property?.name}</Text>
            <Text color={colors.sage}>{formatRange(b.check_in, b.check_out)} · {plural(b.nights, "night")}</Text>
          </View>
        </View>
      ) : b.status === "pending_payment" ? (
        <Card style={{ gap: 10 }}>
          <Text>We have not received your payment yet.</Text>
          <Button small kind="accent" title="Continue to payment" onPress={() => router.replace({ pathname: "/checkout/[code]", params: { code } })} style={{ alignSelf: "flex-start" }} />
        </Card>
      ) : <Alert>{b.status === "cancelled" ? "This booking was cancelled." : "This booking expired before it was paid."}</Alert>}
      {err ? <Alert>{err}</Alert> : null}

      <Card style={{ gap: 12 }}>
        <View style={styles.between}>
          <Text v="label" color={colors.muted} style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>Booking code</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Copy booking code" onPress={() => { void Clipboard.setStringAsync(b.code); setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={styles.code}>
            <Text v="h4" color={colors.forest} style={{ letterSpacing: 1 }}>{b.code}</Text><Icon name={copied ? "check" : "copy"} size={16} color={colors.forest} />
          </Pressable>
        </View>
        <Row icon="calendar" text={formatRange(b.check_in, b.check_out)} />
        <Row icon="clock" text={`In from ${b.property ? formatTime(b.property.check_in_from) : ""}, out by ${b.property ? formatTime(b.property.check_out_by) : ""}`} />
        <Row icon="users" text={plural(b.guests, "guest")} />
        <Text color={colors.muted}>{b.room?.name} · {b.property?.area?.name}{b.property?.area_hint ? `, ${b.property.area_hint}` : ""}</Text>
        <View style={[styles.between, { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 }]}>
          <Text v="bodyStrong">Total {confirmed ? "paid" : ""}</Text><Text v="bodyStrong">{formatNaira(b.total_ngn)}</Text>
        </View>
      </Card>

      {confirmed ? (
        <Card style={{ gap: 12 }}>
          <Text v="h3">Getting in</Text>
          {priv ? (
            <View style={{ gap: 10 }}>
              {priv.street_address ? <Row icon="map-pin" text={priv.street_address} /> : null}
              {priv.gate_instructions ? <Row icon="door-closed" text={priv.gate_instructions} /> : null}
              {priv.wifi_name ? <Row icon="wifi" text={`${priv.wifi_name}${priv.wifi_password ? ` · password ${priv.wifi_password}` : ""}`} /> : null}
              {priv.host_phone ? <Pressable onPress={() => void Linking.openURL(`tel:${priv.host_phone}`)} accessibilityRole="link" style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><Icon name="message-circle" size={18} /><Text v="smallStrong" color={colors.forest}>Call host: {priv.host_phone}</Text></Pressable> : null}
            </View>
          ) : <Text color={colors.muted}>{upcoming ? "The exact address, gate instructions and wifi password appear here from the day before your stay. We keep them private until then." : "Details are not available."}</Text>}
        </Card>
      ) : null}

      {b.status === "confirmed" && upcoming ? <Button kind="quiet" title="Cancel booking" onPress={cancel} /> : null}
      <Button kind="quiet" title="See all your trips" onPress={() => router.replace("/trips")} />
    </View>
  );
}

function Row({ icon, text }: { icon: string; text: string }) {
  return <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}><Icon name={icon} size={18} /><Text v="small" style={{ flex: 1 }}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", gap: 16, alignItems: "center", backgroundColor: colors.forest, borderRadius: radii.lg, padding: 18 },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  code: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.mist, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.md },
});
