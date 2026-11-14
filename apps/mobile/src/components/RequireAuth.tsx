import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { View } from "react-native";
import { useAuth } from "@/providers/AuthProvider";
import { hasSupabase } from "@/lib/env";
import { Button, Empty, SetupNotice, Skeleton } from "./ui";

/** Shows its children only when signed in; otherwise a short prompt that leads to sign-in and comes back here afterwards. */
export function RequireAuth({ children, next, title = "Sign in to continue", note = "It takes a minute. We send you a code, so there is no password to remember." }: { children: ReactNode; next: string; title?: string; note?: string }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  if (!hasSupabase) return <SetupNotice />;
  if (!ready) return <View style={{ gap: 12 }}><Skeleton height={28} width="50%" /><Skeleton height={96} /></View>;
  if (!user) {
    return <Empty icon="user" title={title} action={<Button title="Sign in" onPress={() => router.push({ pathname: "/signin", params: { next } })} />}>{note}</Empty>;
  }
  return <>{children}</>;
}
