import { createServiceClient, createSpottedClient, type Db } from "@spotted/core/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/** Public, read-only client for server components (RLS still applies: it only sees what an anonymous visitor sees). */
export function publicDb(): Db {
  return createSpottedClient(SUPABASE_URL, SUPABASE_ANON_KEY, { persistSession: false });
}

/** Client that acts as the signed-in guest, built from the bearer token the browser or app sends. */
export function userDbFromRequest(req: Request): { db: Db; token: string } | null {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const db = createSpottedClient(SUPABASE_URL, SUPABASE_ANON_KEY, { persistSession: false, accessToken: token });
  return { db, token };
}

export function serviceDb(): Db {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
  return createServiceClient(SUPABASE_URL, key);
}
