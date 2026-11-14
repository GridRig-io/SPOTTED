// EXPO_PUBLIC_* values are inlined at build time. They are written from the single root .env by `npm run env`.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
