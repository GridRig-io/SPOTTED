import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { colors } from "@/theme";
import { useAuth } from "@/providers/AuthProvider";
import { Icon } from "./Icon";

export function SaveButton({ propertyId, size = 38 }: { propertyId: string; size?: number }) {
  const { user, savedIds, toggleSaved } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const on = savedIds.has(propertyId);
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={on ? "Remove from saved" : "Save this place"} accessibilityState={{ selected: on }} hitSlop={8}
      onPress={() => { if (!user) router.push({ pathname: "/signin", params: { next: path } }); else void toggleSaved(propertyId); }}
      style={[styles.btn, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Icon name="heart" size={20} color={on ? colors.bright : colors.ink} fill={on ? colors.bright : "none"} />
    </Pressable>
  );
}

const styles = StyleSheet.create({ btn: { backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" } });
