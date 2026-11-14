// Reads the single root .env and writes the files the website and the app expect.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const src = new URL(".env", root);
if (!existsSync(src)) { console.error("No .env found. Copy .env.example to .env and fill it in first."); process.exit(1); }
const env = Object.fromEntries(
  readFileSync(src, "utf8").split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; }),
);
const need = ["SUPABASE_URL", "SUPABASE_ANON_KEY"];
const missing = need.filter((k) => !env[k] || /YOUR-/.test(env[k]));
if (missing.length) console.warn("Heads up: fill in", missing.join(", "), "in .env");

const web = [
  `NEXT_PUBLIC_SUPABASE_URL=${env.SUPABASE_URL ?? ""}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${env.SUPABASE_ANON_KEY ?? ""}`,
  `NEXT_PUBLIC_SITE_URL=${env.SITE_URL ?? "http://localhost:3000"}`,
  `SUPABASE_SERVICE_ROLE_KEY=${env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
  `PAYMENT_PROVIDER=${env.PAYMENT_PROVIDER ?? "test"}`,
  `PAYSTACK_SECRET_KEY=${env.PAYSTACK_SECRET_KEY ?? ""}`,
  `FLUTTERWAVE_SECRET_KEY=${env.FLUTTERWAVE_SECRET_KEY ?? ""}`,
  `FLUTTERWAVE_SECRET_HASH=${env.FLUTTERWAVE_SECRET_HASH ?? ""}`,
].join("\n") + "\n";
// The app only ever gets public values. It reaches payments through the website's API.
const mobile = [
  `EXPO_PUBLIC_SUPABASE_URL=${env.SUPABASE_URL ?? ""}`,
  `EXPO_PUBLIC_SUPABASE_ANON_KEY=${env.SUPABASE_ANON_KEY ?? ""}`,
  `EXPO_PUBLIC_API_URL=${env.SITE_URL ?? "http://localhost:3000"}`,
].join("\n") + "\n";
writeFileSync(new URL("apps/web/.env.local", root), web);
writeFileSync(new URL("apps/mobile/.env", root), mobile);
console.log("Wrote apps/web/.env.local and apps/mobile/.env");
