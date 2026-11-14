import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSpottedClient, type Db } from "@spotted/core";
import { hasSupabase, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

let client: Db | null = null;

/** The same client factory the website uses, with the session kept on the phone. Null until the keys are filled in. */
export function getDb(): Db | null {
  if (!hasSupabase) return null;
  client ??= createSpottedClient(SUPABASE_URL, SUPABASE_ANON_KEY, { storage: AsyncStorage, detectSessionInUrl: false });
  return client;
}
