import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Db = SupabaseClient;

export interface ClientOptions {
  /** Where to keep the session. Web uses cookies/localStorage by default; React Native passes AsyncStorage/SecureStore. */
  storage?: { getItem(k: string): string | null | Promise<string | null>; setItem(k: string, v: string): void | Promise<void>; removeItem(k: string): void | Promise<void> };
  detectSessionInUrl?: boolean;
  /** Server code passes false: there is no session to keep between requests. */
  persistSession?: boolean;
  /** Server code acting for a signed-in guest: their access token, sent with every request. */
  accessToken?: string;
}

/** One way to create the client, used by both the website and the app, so they always talk to the same database the same way. */
export function createSpottedClient(url: string, anonKey: string, opts: ClientOptions = {}): Db {
  if (!url || !anonKey) throw new Error("Supabase URL and anon key are missing. Copy .env.example to .env and fill them in.");
  return createClient(url, anonKey, {
    ...(opts.accessToken ? { global: { headers: { Authorization: `Bearer ${opts.accessToken}` } } } : {}),
    auth: {
      persistSession: opts.persistSession ?? true,
      autoRefreshToken: opts.persistSession ?? true,
      detectSessionInUrl: opts.detectSessionInUrl ?? false,
      ...(opts.storage ? { storage: opts.storage } : {}),
    },
  });
}

/** Server only: bypasses row level security. Never import this into the app or a client component. */
export function createServiceClient(url: string, serviceRoleKey: string): Db {
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
