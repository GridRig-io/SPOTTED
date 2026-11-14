import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import type { Session, User } from "@supabase/supabase-js";
import { savedIds as loadSavedIds, setSaved as persistSaved, type Db } from "@spotted/core";
import { getDb } from "@/lib/supabase";

interface Ctx {
  db: Db | null; user: User | null; session: Session | null; ready: boolean;
  signOut: () => Promise<void>; savedIds: Set<string>; toggleSaved: (propertyId: string) => Promise<boolean>;
}
const AuthCtx = createContext<Ctx>({ db: null, user: null, session: null, ready: false, signOut: async () => {}, savedIds: new Set(), toggleSaved: async () => false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const db = useMemo(() => getDb(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!db);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!db) return;
    db.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = db.auth.onAuthStateChange((_e, s) => setSession(s));
    // Refresh tokens only while the app is in front, as Supabase recommends for React Native.
    db.auth.startAutoRefresh();
    const app = AppState.addEventListener("change", (s) => { if (s === "active") db.auth.startAutoRefresh(); else db.auth.stopAutoRefresh(); });
    return () => { sub.subscription.unsubscribe(); app.remove(); db.auth.stopAutoRefresh(); };
  }, [db]);

  const signedIn = Boolean(session);
  useEffect(() => {
    if (!db || !signedIn) return;
    let live = true;
    loadSavedIds(db).then((ids) => { if (live) setSaved(new Set(ids)); }).catch(() => {});
    return () => { live = false; };
  }, [db, signedIn]);
  const visibleSaved = useMemo(() => (signedIn ? saved : new Set<string>()), [signedIn, saved]);

  const signOut = useCallback(async () => { await db?.auth.signOut(); }, [db]);

  const toggleSaved = useCallback(async (propertyId: string) => {
    if (!db || !session) return false;
    const next = !saved.has(propertyId);
    setSaved((prev) => { const n = new Set(prev); if (next) n.add(propertyId); else n.delete(propertyId); return n; });
    try { await persistSaved(db, propertyId, next); } catch {
      setSaved((prev) => { const n = new Set(prev); if (next) n.delete(propertyId); else n.add(propertyId); return n; });
    }
    return true;
  }, [db, session, saved]);

  return <AuthCtx.Provider value={{ db, user: session?.user ?? null, session, ready, signOut, savedIds: visibleSaved, toggleSaved }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
