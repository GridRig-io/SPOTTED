import { timingSafeEqual } from "node:crypto";
import type { PaymentProvider } from "./types";

const BASE = "https://api.flutterwave.com/v3";

/** Flutterwave v3 (Standard checkout). `secretHash` is the value you type into Settings > Webhooks on the Flutterwave dashboard. */
export function flutterwave(secretKey: string, secretHash: string): PaymentProvider {
  const call = async (path: string, init?: RequestInit) => {
    const res = await fetch(BASE + path, {
      ...init,
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok || json.status === "error") throw new Error(`Flutterwave: ${json.message ?? res.statusText}`);
    return json;
  };
  return {
    name: "flutterwave",
    async initialize(i) {
      const j = await call("/payments", {
        method: "POST",
        body: JSON.stringify({
          tx_ref: i.reference, amount: i.amountNgn, currency: "NGN", redirect_url: i.callbackUrl,
          customer: { email: i.email, name: i.name ?? undefined, phonenumber: i.phone ?? undefined },
          customizations: { title: "Spotted", description: i.description },
          meta: i.metadata,
        }),
      });
      return { url: j.data.link as string };
    },
    async verify(reference) {
      const j = await call(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`);
      const d = j.data ?? {};
      return { paid: d.status === "successful" && d.currency === "NGN", amountNgn: Math.round(Number(d.amount ?? 0)), reference, raw: d };
    },
    parseWebhook(rawBody, headers) {
      const sent = headers.get("verif-hash") ?? "";
      const a = Buffer.from(sent), b = Buffer.from(secretHash);
      if (!secretHash || a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Bad Flutterwave hash");
      const ev = JSON.parse(rawBody);
      const d = ev.data ?? {};
      return d.status === "successful" && d.tx_ref ? { reference: String(d.tx_ref) } : null;
    },
  };
}
