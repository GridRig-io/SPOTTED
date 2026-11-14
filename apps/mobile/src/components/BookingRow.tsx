import { useRouter } from "expo-router";
import { View } from "react-native";
import { formatNaira, formatRange, type BookingWithPlace } from "@spotted/core";
import { colors } from "@/theme";
import { Badge, Card, Text } from "./ui";

const LABEL: Record<string, { t: string; tone: "green" | "warn" | "red" }> = {
  confirmed: { t: "Confirmed", tone: "green" }, completed: { t: "Completed", tone: "green" },
  pending_payment: { t: "Waiting for payment", tone: "warn" }, cancelled: { t: "Cancelled", tone: "red" }, expired: { t: "Expired", tone: "red" },
};

export function BookingRow({ b }: { b: BookingWithPlace }) {
  const router = useRouter();
  const l = LABEL[b.status];
  const open = () => router.push(b.status === "pending_payment" ? { pathname: "/checkout/[code]", params: { code: b.code } } : { pathname: "/booking/[code]", params: { code: b.code } });
  return (
    <Card onPress={open} accessibilityLabel={`${b.property?.name}, ${l.t}`} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text v="h4" numberOfLines={1}>{b.property?.name}</Text>
        <Text v="small" color={colors.muted} numberOfLines={1}>{b.room?.name} · {b.property?.area?.name}</Text>
        <Text v="small">{formatRange(b.check_in, b.check_out)}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}><Badge label={l.t} tone={l.tone} /><Text v="bodyStrong">{formatNaira(b.total_ngn)}</Text></View>
    </Card>
  );
}
