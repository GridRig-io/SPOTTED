import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { Alert as NativeAlert, View } from "react-native";
import { cancelBooking, formatNaira, formatRange, getBooking, plural, ROOM_KIND_LABEL } from "@spotted/core";
import { Icon } from "@/components/Icon";
import { RequireAuth } from "@/components/RequireAuth";
import { BackBar, Screen } from "@/components/Screen";
import { Alert, Badge, Button, Card, Empty, Skeleton, Text } from "@/components/ui";
import { startPayment, verifyPayment } from "@/lib/pay";
import { useLoad } from "@/lib/useLoad";
import { useAuth } from "@/providers/AuthProvider";
import { colors } from "@/theme";

export default function CheckoutScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <Screen><BackBar /><RequireAuth next={`/checkout/${code}`} title="Sign in to pay"><Inner code={code} /></RequireAuth></Screen>;
}

function useCountdown(expires: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expires) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expires]);
  return expires ? Math.max(0, Math.floor((new Date(expires).getTime() - now) / 1000)) : null;
}

function Inner({ code }: { code: string }) {
  const { db, session } = useAuth();
  const router = useRouter();
  const { data: b, error, reload } = useLoad(db ? () => getBooking(db, code) : null, code);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState("");
  const left = useCountdown(b?.status === "pending_payment" ? b.expires_at : null);

  // Coming back from the browser or from another app: look again.
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  useEffect(() => { if (b && b.status === "confirmed") router.replace({ pathname: "/booking/[code]", params: { code } }); }, [b, code, router]);

  /** Ask the server to check with the gateway; webhooks can be a few seconds behind, so try for about 30 s. */
  async function confirmPayment() {
    if (!session) return;
    setChecking(true);
    for (let i = 0; i < 10; i++) {
      const r = await verifyPayment(session.access_token, code).catch(() => null);
      if (r?.status === "confirmed") { router.replace({ pathname: "/booking/[code]", params: { code } }); return; }
      await new Promise((res) => setTimeout(res, 3000));
    }
    setChecking(false); reload();
  }

  async function pay() {
    if (!session) return;
    setBusy(true); setErr("");
    try {
      const { url } = await startPayment(session.access_token, code);
      await WebBrowser.openBrowserAsync(url, { toolbarColor: colors.forest, controlsColor: colors.cream, dismissButtonStyle: "close" });
      setBusy(false);
      await confirmPayment();
    } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); setBusy(false); }
  }

  function release() {
    NativeAlert.alert("Release these dates?", "Your hold will end and the dates open up for other guests.", [
      { text: "Keep them", style: "cancel" },
      { text: "Release", style: "destructive", onPress: () => { if (db) void cancelBooking(db, code).catch(() => {}).then(() => router.replace("/trips")); } },
    ]);
  }

  if (!b) {
    if (error) return <Empty icon="triangle-alert" title="We could not find that booking" action={<Button title="Try again" kind="quiet" onPress={reload} />}>{error}</Empty>;
    return <View style={{ gap: 12 }}><Skeleton height={32} width="60%" /><Skeleton height={140} /><Skeleton height={120} /></View>;
  }

  const mm = left === null ? "" : `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  const expired = b.status === "expired" || (left !== null && left <= 0);

  return (
    <View style={{ gap: 20 }}>
      <Text v="h1" accessibilityRole="header">Confirm and pay</Text>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}><Text v="h3" style={{ flex: 1 }}>{b.property?.name}</Text>{b.room ? <Badge label={ROOM_KIND_LABEL[b.room.kind]} /> : null}</View>
        <Text color={colors.muted}>{b.room?.name} · {b.property?.area?.name}</Text>
        <Row icon="calendar" text={formatRange(b.check_in, b.check_out)} />
        <Row icon="clock" text={plural(b.nights, "night")} />
        <Row icon="users" text={plural(b.guests, "guest")} />
      </Card>

      <Card style={{ gap: 10 }}>
        <Line a={`${formatNaira(b.nightly_ngn)} × ${plural(b.nights, "night")}`} b={formatNaira(b.subtotal_ngn)} />
        {b.cleaning_fee_ngn ? <Line a="Cleaning fee" b={formatNaira(b.cleaning_fee_ngn)} /> : null}
        {b.service_fee_ngn ? <Line a="Service fee" b={formatNaira(b.service_fee_ngn)} /> : null}
        <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 }}>
          <Text v="h3">Total</Text><Text v="h3">{formatNaira(b.total_ngn)}</Text>
        </View>
      </Card>

      {b.status === "pending_payment" && !expired ? (
        <View style={{ gap: 14 }}>
          <Alert tone="info">Your dates are held for {mm || "20:00"}. After that they open up again.</Alert>
          {err ? <Alert>{err}</Alert> : null}
          {checking ? <Alert tone="info">Checking your payment… this usually takes a few seconds.</Alert> : null}
          <Button kind="accent" title={`Pay ${formatNaira(b.total_ngn)}`} busy={busy || checking} onPress={pay} />
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Icon name="lock" size={14} color={colors.muted} />
            <Text v="caption" color={colors.muted} style={{ flex: 1 }}>Card details are entered on the payment provider&apos;s page. Spotted never sees or stores them.</Text>
          </View>
          <Button kind="quiet" title="I have already paid, check again" onPress={confirmPayment} disabled={busy || checking} />
          <Button kind="quiet" title="Cancel this booking" onPress={release} />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <Alert>{b.status === "cancelled" ? "This booking was cancelled." : "This hold ran out, so the dates were released."}</Alert>
          <Button title="Choose dates again" onPress={() => router.replace({ pathname: "/place/[slug]", params: { slug: b.property?.slug ?? "", room: b.room_id } })} />
        </View>
      )}
    </View>
  );
}

function Row({ icon, text }: { icon: string; text: string }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Icon name={icon} size={18} /><Text v="small">{text}</Text></View>;
}
function Line({ a, b }: { a: string; b: string }) {
  return <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text v="small">{a}</Text><Text v="small">{b}</Text></View>;
}
