import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { View } from "react-native";
import { savedRooms } from "@spotted/core";
import { RequireAuth } from "@/components/RequireAuth";
import { RoomCard } from "@/components/RoomCard";
import { Screen } from "@/components/Screen";
import { Alert, Button, CardsSkeleton, Empty, Text } from "@/components/ui";
import { useLoad } from "@/lib/useLoad";
import { useAuth } from "@/providers/AuthProvider";

export default function Saved() {
  return <Screen><Text v="h1" accessibilityRole="header">Saved places</Text><RequireAuth next="/saved" title="Sign in to see your saved places" note="Tap the heart on any place to keep it here."><List /></RequireAuth></Screen>;
}

function List() {
  const { db, savedIds } = useAuth();
  const router = useRouter();
  const { data, error, reload } = useLoad(db ? () => savedRooms(db) : null, "saved");
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  if (!data) return error ? <Alert>{error}</Alert> : <CardsSkeleton n={2} />;
  const cards = data.filter((c) => savedIds.has(c.property_id));
  if (!cards.length) return <Empty icon="heart" title="Nothing saved yet" action={<Button title="Explore places" onPress={() => router.push("/")} />}>Tap the heart on a place you like and it will wait for you here.</Empty>;
  return <View style={{ gap: 28 }}>{cards.map((c) => <RoomCard key={c.room_id} card={c} />)}</View>;
}
