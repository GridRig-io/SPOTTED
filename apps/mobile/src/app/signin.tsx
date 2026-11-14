import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { normalizeNgPhone, sendEmailCode, sendPhoneCode, verifyEmailCode, verifyPhoneCode } from "@spotted/core";
import { Logo } from "@/components/Logo";
import { Screen } from "@/components/Screen";
import { Alert, Button, Card, Chip, Field, SetupNotice, Text } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { hasSupabase } from "@/lib/env";
import { useAuth } from "@/providers/AuthProvider";
import { colors } from "@/theme";

WebBrowser.maybeCompleteAuthSession();

type Mode = "phone" | "email";
/** Only allow in-app paths, never another site. */
const safeNext = (n: string | undefined) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/");

export default function SignIn() {
  const { db, user, ready } = useAuth();
  const router = useRouter();
  const { next: rawNext } = useLocalSearchParams<{ next?: string }>();
  const next = safeNext(rawNext);
  const [mode, setMode] = useState<Mode>("phone");
  const [value, setValue] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { if (ready && user) router.replace(next as never); }, [ready, user, next, router]);
  if (!hasSupabase) return <Screen><SetupNotice /></Screen>;

  async function send() {
    if (!db) return;
    setErr(""); setBusy(true);
    try {
      if (mode === "phone") {
        const phone = normalizeNgPhone(value);
        if (!phone) throw new Error("Enter a Nigerian number, like 0803 123 4567.");
        await sendPhoneCode(db, phone); setSentTo(phone);
      } else {
        const email = value.trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email address.");
        await sendEmailCode(db, email); setSentTo(email);
      }
    } catch (x) { setErr(x instanceof Error ? x.message : "Could not send the code."); }
    setBusy(false);
  }

  async function verify() {
    if (!db || !sentTo) return;
    setErr(""); setBusy(true);
    try {
      if (mode === "phone") await verifyPhoneCode(db, sentTo, code.trim()); else await verifyEmailCode(db, sentTo, code.trim());
      // the effect above sends them on once the session arrives
    } catch (x) { setErr(x instanceof Error ? x.message : "That code did not work."); setBusy(false); }
  }

  async function google() {
    if (!db) return;
    setErr(""); setBusy(true);
    try {
      const redirectTo = Linking.createURL("auth-callback");
      const { data, error } = await db.auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } });
      if (error || !data.url) throw new Error(error?.message ?? "Google sign-in is not set up yet.");
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (res.type === "success") {
        const url = new URL(res.url);
        const authCode = url.searchParams.get("code");
        if (authCode) {
          const { error: e2 } = await db.auth.exchangeCodeForSession(authCode);
          if (e2) throw new Error(e2.message);
        } else {
          const frag = new URLSearchParams(url.hash.replace(/^#/, ""));
          const access_token = frag.get("access_token"), refresh_token = frag.get("refresh_token");
          if (!access_token || !refresh_token) throw new Error("Google sign-in did not finish. Try again.");
          const { error: e3 } = await db.auth.setSession({ access_token, refresh_token });
          if (e3) throw new Error(e3.message);
        }
      }
    } catch (x) { setErr(x instanceof Error ? x.message : "Could not sign in with Google."); }
    setBusy(false);
  }

  return (
    <Screen edges={["top", "bottom"]}>
      <View style={styles.top}>
        <Logo height={34} />
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}><Icon name="x" size={24} /></Pressable>
      </View>
      <Card style={{ gap: 16 }}>
        <View style={{ gap: 4 }}>
          <Text v="h2" accessibilityRole="header">Sign in or create an account</Text>
          <Text v="small" color={colors.muted}>We will text or email you a 6-digit code. No password to remember.</Text>
        </View>
        {!sentTo ? (
          <>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Chip icon="user" label="Phone" on={mode === "phone"} onPress={() => { setMode("phone"); setValue(""); setErr(""); }} />
              <Chip label="Email" on={mode === "email"} onPress={() => { setMode("email"); setValue(""); setErr(""); }} />
            </View>
            <Field label={mode === "phone" ? "Phone number" : "Email address"} value={value} onChangeText={setValue}
              keyboardType={mode === "phone" ? "phone-pad" : "email-address"} autoCapitalize="none" autoComplete={mode === "phone" ? "tel" : "email"} textContentType={mode === "phone" ? "telephoneNumber" : "emailAddress"}
              placeholder={mode === "phone" ? "0803 123 4567" : "you@example.com"} />
            {err ? <Alert>{err}</Alert> : null}
            <Button title="Send my code" busy={busy} disabled={!value.trim()} onPress={send} />
            <View style={styles.or}><View style={styles.rule} /><Text v="small" color={colors.muted}>or</Text><View style={styles.rule} /></View>
            <Button kind="quiet" title="Continue with Google" onPress={google} disabled={busy} />
          </>
        ) : (
          <>
            <Text>We sent a code to <Text v="bodyStrong">{sentTo}</Text>.</Text>
            <Field label="6-digit code" value={code} onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} autoFocus
              style={{ letterSpacing: 8, fontSize: 22 }} />
            {err ? <Alert>{err}</Alert> : null}
            <Button title="Continue" busy={busy} disabled={code.length !== 6} onPress={verify} />
            <Button kind="quiet" title={`Use a different ${mode === "phone" ? "number" : "email"}`} onPress={() => { setSentTo(null); setCode(""); setErr(""); }} />
          </>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  or: { flexDirection: "row", alignItems: "center", gap: 12 },
  rule: { flex: 1, height: 1, backgroundColor: colors.line },
});
