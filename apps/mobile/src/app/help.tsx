import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { AMENITY_COUNT } from "@spotted/tokens";
import { FAQ } from "@spotted/core";
import { Icon } from "@/components/Icon";
import { BackBar, Screen } from "@/components/Screen";
import { Button, Card, Text } from "@/components/ui";
import { colors } from "@/theme";

export default function Help() {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);
  return (
    <Screen>
      <BackBar />
      <Text v="h1" accessibilityRole="header">Help</Text>
      <View style={{ gap: 10 }}>
        {FAQ.map(([q, a], i) => (
          <Card key={q} style={{ gap: 8 }}>
            <Pressable onPress={() => setOpen(open === i ? null : i)} accessibilityRole="button" accessibilityState={{ expanded: open === i }} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 36 }}>
              <Text v="bodyStrong" style={{ flex: 1 }}>{q}</Text><Icon name={open === i ? "minus" : "plus"} size={18} />
            </Pressable>
            {open === i ? <Text color={colors.muted}>{a}</Text> : null}
          </Card>
        ))}
      </View>
      <View style={{ gap: 8 }}>
        <Text v="h2">Hosting on Spotted</Text>
        <Text>List a flat or guest house in Abuja. Your first 2 months are free. To publish a room you post at least 5 photos of that room and answer all {AMENITY_COUNT} amenity questions, so guests know what to expect.</Text>
        <Text color={colors.muted}>Host tools (dashboard, calendar, your own website address) are being built. To register interest, email help@spotted.ng.</Text>
      </View>
      <View style={{ gap: 8 }}>
        <Text v="h2">Claim a listing</Text>
        <Text>If we listed your place before you joined, open it from the search results and tap Ask to claim this place. We will check with you and then hand it over.</Text>
        <Button kind="quiet" title="Browse places" onPress={() => router.push("/search")} style={{ alignSelf: "flex-start" }} />
      </View>
    </Screen>
  );
}
