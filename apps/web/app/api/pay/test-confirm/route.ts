import { settleReference } from "@spotted/core/server";
import { json, payEnv } from "@/lib/api-helpers";
import { serviceDb, userDbFromRequest } from "@/lib/supabase-server";

/** Test mode only: "pays" a booking without moving money. Disabled unless PAYMENT_PROVIDER=test. */
export async function POST(req: Request) {
  if ((process.env.PAYMENT_PROVIDER ?? "test") !== "test") return json({ error: "Test payments are switched off." }, 403);
  // The payment page opens in the phone's own browser, which is not signed in. In test mode the unguessable reference is the proof.
  const auth = userDbFromRequest(req);
  const { reference } = (await req.json().catch(() => ({}))) as { reference?: string };
  if (!reference) return json({ error: "Missing reference." }, 400);
  const sdb = serviceDb();
  const { data: p } = await sdb.from("payments").select("booking_id, provider").eq("reference", reference).maybeSingle();
  if (!p || p.provider !== "test") return json({ error: "Not a test payment." }, 400);
  if (auth) {
    const { data: mine } = await auth.db.from("bookings").select("id").eq("id", p.booking_id).maybeSingle();   // RLS: only the guest's own booking
    if (!mine) return json({ error: "Booking not found." }, 404);
  }
  const b = await settleReference({ serviceDb: sdb, env: payEnv(), reference, allowTest: true });
  return json({ status: b.status, code: b.code });
}
