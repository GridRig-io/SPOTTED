"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { browserDb } from "@/lib/supabase-browser";
import { hasSupabase } from "@/lib/env";
import type { Db } from "@spotted/core";

interface Ctx { db: Db | null; user: User | null; session: Session | null; ready: boolean; signOut: () => Promise<void>; savedIds: Set<string>; toggleSaved: (propertyId: string) => Promise<boolean> }
const EMPTY: Set<string> = new Set();
const AuthCtx = createContext<Ctx>({ db: null, user: null, session: null, ready: false, signOut: async () => {}, savedIds: new Set(), toggleSaved: async () => false });

const noopSubscribe = () => () => {};
/** false while the browser is hydrating server HTML, true afterwards. Keeps signed-in UI from mismatching the server render. */
export function useHydrated() { return useSyncExternalStore(noopSubscribe, () => true, () => false); }

export function AuthProvider({ children }: { children: ReactNode }) {
  const db = useMemo(() => (hasSupabase ? browserDb() : null), []);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!db);
  const [savedIds, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!db) return;
    db.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = db.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [db]);

  const signedIn = Boolean(session);
  useEffect(() => {
    if (!db || !signedIn) return;
    let live = true;
    import("@spotted/core").then(({ savedIds: load }) => load(db).then((ids) => { if (live) setSaved(new Set(ids)); }).catch(() => {}));
    return () => { live = false; };
  }, [db, signedIn]);
  const visibleSaved = useMemo(() => (signedIn ? savedIds : new Set<string>()), [signedIn, savedIds]);

  const signOut = useCallback(async () => { await db?.auth.signOut(); }, [db]);

  const toggleSaved = useCallback(async (propertyId: string) => {
    if (!db || !session) return false;
    const { setSaved: persist } = await import("@spotted/core");
    const next = !savedIds.has(propertyId);
    setSaved((prev) => { const n = new Set(prev); if (next) n.add(propertyId); else n.delete(propertyId); return n; }); // instant
    try { await persist(db, propertyId, next); } catch {
      setSaved((prev) => { const n = new Set(prev); if (next) n.delete(propertyId); else n.add(propertyId); return n; });
    }
    return true;
  }, [db, session, savedIds]);

  return <AuthCtx.Provider value={{ db, user: session?.user ?? null, session, ready, signOut, savedIds: visibleSaved, toggleSaved }}>{children}</AuthCtx.Provider>;
}

/**
 * Each component that reads auth state is masked until *it* has hydrated. Components inside streamed Suspense boundaries
 * hydrate later than the provider, so masking once at the top is not enough to match the server HTML.
 */
export function useAuth(): Ctx {
  const raw = useContext(AuthCtx);
  const hydrated = useHydrated();
  return useMemo(() => (hydrated ? raw : { ...raw, user: null, session: null, ready: false, savedIds: EMPTY }), [hydrated, raw]);
}
