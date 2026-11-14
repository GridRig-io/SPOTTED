import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { formatNaira, plural, PROPERTY_KIND_LABEL, ROOM_KIND_LABEL, type RoomCard as RoomCardT } from "@spotted/core";
import { colors, radii } from "@/theme";
import { Icon } from "./Icon";
import { Photo } from "./Photo";
import { GlancePills } from "./Pills";
import { SaveButton } from "./SaveButton";
import { Badge, Text } from "./ui";

export function RoomCard({ card, params }: { card: RoomCardT; params?: Record<string, string> }) {
  const router = useRouter();
  const open = () => router.push({ pathname: "/place/[slug]", params: { slug: card.property_slug, room: card.room_id, ...params } });
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.photo}>
        <Pressable onPress={open} accessibilityRole="imagebutton" accessibilityLabel={`${card.property_name}, ${card.room_name}`} style={StyleSheet.absoluteFill}>
          <Photo photo={card.photos[0]} seed={card.room_id} alt={`${card.property_name}, ${card.room_name}`} style={StyleSheet.absoluteFill} />
        </Pressable>
        <View style={styles.save}><SaveButton propertyId={card.property_id} /></View>
        {card.photo_count > 1 ? <View style={styles.count}><Text v="caption" color={colors.cream}>{card.photo_count} photos</Text></View> : null}
      </View>
      <Pressable onPress={open} style={{ gap: 6 }} accessibilityRole="button" accessibilityLabel={`Open ${card.property_name}`}>
        <View style={styles.titleRow}>
          <Text v="h4" style={{ flex: 1, fontSize: 18, lineHeight: 24 }} numberOfLines={1}>{card.property_name}</Text>
          {card.rating_count > 0 ? (
            <View style={styles.rating} accessibilityLabel={`Rated ${card.rating_avg} out of 5 by ${card.rating_count} guests`}>
              <Icon name="star" size={14} color={colors.gold} fill={colors.gold} />
              <Text v="smallStrong">{Number(card.rating_avg).toFixed(1)}</Text>
              <Text v="small" color={colors.muted}>({card.rating_count})</Text>
            </View>
          ) : <Badge label="New" />}
        </View>
        <Text v="small" color={colors.muted}>
          {ROOM_KIND_LABEL[card.room_kind]} · {PROPERTY_KIND_LABEL[card.property_kind]} · {card.area_name}{card.rooms_in_property > 1 ? ` · ${plural(card.rooms_in_property, "room")} here` : ""}
        </Text>
        <GlancePills amenities={card.amenities} />
        <Text v="body"><Text v="bodyStrong">{formatNaira(card.price_per_night)}</Text> <Text v="small" color={colors.muted}>a night · sleeps {card.max_guests}</Text></Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { aspectRatio: 4 / 3, borderRadius: radii.lg, overflow: "hidden", backgroundColor: colors.mist },
  save: { position: "absolute", top: 10, right: 10 },
  count: { position: "absolute", bottom: 10, left: 10, backgroundColor: "rgba(23,35,28,0.7)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rating: { flexDirection: "row", alignItems: "center", gap: 3 },
});
