import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { getMyProfile, normalizeNgPhone, updateMyProfile } from "@spotted/core";
import { Icon } from "@/components/Icon";
import { RequireAuth } from "@/components/RequireAuth";
import { Screen } from "@/components/Screen";
import { Alert, Button, Card, Field, Text } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { colors } from "@/theme";

export default function Profile() {
  return <Screen><Text v="h1" accessibilityRole="header">Your account</Text><RequireAuth next="/profile" title="Sign in to see your account"><Inner /></RequireAuth></Screen>;
}

function Inner() {
  const { db, user, signOut } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("guest");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!db) return;
    let live = true;
    getMyProfile(db).then((p) => { if (live && p) { setName(p.full_name ?? ""); setPhone(p.phone ?? ""); setRole(p.role); } }).catch(() => {});
    return () => { live = false; };
  }, [db]);

  async function save() {
    if (!db) return;
    setMsg(""); setErr("");
    const ph = phone.trim() ? normalizeNgPhone(phone) : "";
    if (phone.trim() && !ph) { setErr("Enter a Nigerian phone number, like 0803 123 4567."); return; }
    setBusy(true);
    try { await updateMyProfile(db, { full_name: name.trim(), ...(ph ? { phone: ph } : {}) }); setMsg("Saved."); } catch (x) { setErr(x instanceof Error ? x.message : "Could not save."); }
    setBusy(false);
  }

  const links = [
    { icon: "luggage", t: "Your trips", go: "/trips" },
    { icon: "heart", t: "Saved places", go: "/saved" },
    { icon: "circle-help", t: "Help", go: "/help" },
  ] as const;

  return (
    <View style={{ gap: 20 }}>
      <Card style={{ gap: 16 }}>
        <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="0803 123 4567" />
        <View style={{ gap: 4 }}><Text v="label" color={colors.muted} style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>Signed in as</Text><Text>{user?.email || user?.phone}</Text></View>
        {msg ? <Alert tone="info">{msg}</Alert> : null}
        {err ? <Alert>{err}</Alert> : null}
        <Button title="Save changes" busy={busy} onPress={save} />
      </Card>
      <Card style={{ gap: 4 }}>
        {links.map((l) => (
          <Pressable key={l.t} onPress={() => router.push(l.go)} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52 }}>
            <Icon name={l.icon} size={20} /><Text style={{ flex: 1 }}>{l.t}</Text><Icon name="chevron-right" size={18} color={colors.muted} />
          </Pressable>
        ))}
        {role === "owner" ? <Text v="small" color={colors.muted} style={{ paddingTop: 8 }}>You are a host. The host dashboard is coming in the next release.</Text> : null}
      </Card>
      <Button kind="quiet" icon="log-out" title="Sign out" onPress={() => void signOut()} />
    </View>
  );
}
