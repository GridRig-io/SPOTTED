import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Button, Empty } from "@/components/ui";

export default function NotFound() {
  const router = useRouter();
  return <Screen><Empty icon="map-pin" title="We could not find that page" action={<Button title="Back to Explore" onPress={() => router.replace("/")} />}>The link may be old or mistyped.</Empty></Screen>;
}
