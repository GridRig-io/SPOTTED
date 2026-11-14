import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { fontFiles } from "@spotted/tokens";
import { Icon } from "@/components/Icon";
import { colors } from "@/theme";

// Same four tabs, same icons and same order as the website's bottom bar.
const TABS = [
  { name: "index", title: "Explore", icon: "search" },
  { name: "saved", title: "Saved", icon: "heart" },
  { name: "trips", title: "Trips", icon: "luggage" },
  { name: "profile", title: "Profile", icon: "user" },
] as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.forest,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fontFiles.body.semibold, fontSize: 12 },
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.line, height: Platform.OS === "ios" ? 88 : 68, paddingTop: 6 },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title, tabBarIcon: ({ color, focused }) => <Icon name={t.icon} size={24} color={String(color)} strokeWidth={focused ? 2.4 : 2} /> }} />
      ))}
    </Tabs>
  );
}
