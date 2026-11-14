import { settleReference } from "@spotted/core/server";
import { json, payEnv } from "@/lib/api-helpers";
import { serviceDb, userDbFromRequest } from "@/lib/supabase-server";

/** Called after the guest returns from the gateway. Asks the gateway directly, then confirms the booking. */
export async function POST(req: Request) {
  const auth = userDbFromRequest(req);
  if (!auth) return json({ error: "Sign in first." }, 401);
  const { code, reference } = (await req.json().catch(() => ({}))) as { code?: string; reference?: string };
  if (!code) return json({ error: "Missing booking code." }, 400);
  // RLS: the guest can only see their own booking.
  const { data: booking } = await auth.db.from("bookings").select("id, status").eq("code", code).maybeSingle();
  if (!booking) return json({ error: "Booking not found." }, 404);
  const sdb = serviceDb();
  let ref = reference;
  if (ref) {
    const { data: p } = await sdb.from("payments").select("booking_id").eq("reference", ref).maybeSingle();
    if (!p || p.booking_id !== booking.id) ref = undefined;                                   // a reference from another booking is ignored
  }
  if (!ref) {
    const { data: last } = await sdb.from("payments").select("reference").eq("booking_id", booking.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    ref = last?.reference;
  }
  if (!ref) return json({ status: booking.status });
  try {
    const b = await settleReference({ serviceDb: sdb, env: payEnv(), reference: ref });
    return json({ status: b.status });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Could not check the payment.", status: booking.status }, 502);
  }
}
