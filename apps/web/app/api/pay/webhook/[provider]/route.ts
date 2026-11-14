import { getPaymentProvider, settleReference, type PaymentProviderName } from "@spotted/core/server";
import { json, payEnv } from "@/lib/api-helpers";
import { serviceDb } from "@/lib/supabase-server";

/** Gateways call this when a payment succeeds, even if the guest closed the browser. Signature checked, then verified with the gateway again. */
export async function POST(req: Request, ctx: RouteContext<"/api/pay/webhook/[provider]">) {
  const { provider } = await ctx.params;
  if (provider !== "paystack" && provider !== "flutterwave") return json({ error: "Unknown provider" }, 404);
  const raw = await req.text();
  try {
    const p = getPaymentProvider(payEnv(), provider as PaymentProviderName);
    const evt = p.parseWebhook(raw, req.headers);
    if (evt) await settleReference({ serviceDb: serviceDb(), env: payEnv(), reference: evt.reference });
    return json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return json({ error: msg }, /Bad .* (signature|hash)/.test(msg) ? 401 : 500);   // 5xx makes the gateway retry
  }
}
