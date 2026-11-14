import { startBookingPayment } from "@spotted/core/server";
import { json, payEnv } from "@/lib/api-helpers";
import { SITE_URL } from "@/lib/env";
import { serviceDb, userDbFromRequest } from "@/lib/supabase-server";

/** The browser and the mobile app both call this with the guest's access token. Secret keys never leave the server. */
export async function POST(req: Request) {
  const auth = userDbFromRequest(req);
  if (!auth) return json({ error: "Sign in first." }, 401);
  const { code, source } = (await req.json().catch(() => ({}))) as { code?: string; source?: string };
  if (!code) return json({ error: "Missing booking code." }, 400);
  const { data: u } = await auth.db.auth.getUser(auth.token);
  if (!u.user) return json({ error: "Your session expired. Sign in again." }, 401);
  try {
    const { data: profile } = await auth.db.from("profiles").select("full_name, phone").eq("id", u.user.id).maybeSingle();
    const started = await startBookingPayment({
      userDb: auth.db, serviceDb: serviceDb(), env: payEnv(), bookingCode: code, siteUrl: SITE_URL, source: source === "app" ? "app" : "web",
      user: { email: u.user.email, phone: u.user.phone || profile?.phone, name: profile?.full_name },
    });
    return json({ url: started.url, provider: started.provider });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Could not start the payment." }, 400);
  }
}
