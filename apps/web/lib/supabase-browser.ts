"use client";
import { createSpottedClient, type Db } from "@spotted/core";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

let client: Db | null = null;
/** One browser client for the whole site. Session lives in the browser; API routes receive it as a bearer token. */
export function browserDb(): Db {
  if (!client) client = createSpottedClient(SUPABASE_URL, SUPABASE_ANON_KEY, { detectSessionInUrl: true });
  return client;
}
