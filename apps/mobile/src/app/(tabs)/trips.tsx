import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { myBookings, todayInLagos } from "@spotted/core";
import { BookingRow } from "@/components/BookingRow";
import { RequireAuth } from "@/components/RequireAuth";
import { Screen } from "@/components/Screen";
import { Alert, Button, Empty, Skeleton, Text } from "@/components/ui";
import { View } from "react-native";
import { useLoad } from "@/lib/useLoad";
import { useAuth } from "@/providers/AuthProvider";

export default function Trips() {
  return <Screen><Text v="h1" accessibilityRole="header">Your trips</Text><RequireAuth next="/trips" title="Sign in to see your trips"><List /></RequireAuth></Screen>;
}

function List() {
  const { db } = useAuth();
  const router = useRouter();
  const { data: rows, error, reload } = useLoad(db ? () => myBookings(db) : null, "trips");
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const today = todayInLagos();
  if (!rows) return error ? <Alert>{error}</Alert> : <View style={{ gap: 12 }}><Skeleton height={96} /><Skeleton height={96} /></View>;
  const up = rows.filter((b) => (b.status === "confirmed" || b.status === "pending_payment") && b.check_out >= today).sort((a, b) => a.check_in.localeCompare(b.check_in));
  const past = rows.filter((b) => b.status === "completed" || (b.status === "confirmed" && b.check_out < today));
  const other = rows.filter((b) => b.status === "cancelled" || b.status === "expired");
  if (!rows.length) {
    return <Empty icon="luggage" title="No trips yet" action={<Button title="Find a place" onPress={() => router.push("/search")} />}>When you book a place it shows up here, with the address and wifi once your stay is close.</Empty>;
  }
  return (
    <View style={{ gap: 24 }}>
      {up.length ? <Section title="Upcoming">{up.map((b) => <BookingRow key={b.id} b={b} />)}</Section> : null}
      {past.length ? <Section title="Past stays">{past.map((b) => <BookingRow key={b.id} b={b} />)}</Section> : null}
      {other.length ? <Section title="Cancelled or expired">{other.map((b) => <BookingRow key={b.id} b={b} />)}</Section> : null}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={{ gap: 12 }}><Text v="h2">{title}</Text>{children}</View>;
}
