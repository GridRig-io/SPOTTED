import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentProvider } from "./types";

const BASE = "https://api.paystack.co";

export function paystack(secretKey: string): PaymentProvider {
  const call = async (path: string, init?: RequestInit) => {
    const res = await fetch(BASE + path, {
      ...init,
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok || json.status === false) throw new Error(`Paystack: ${json.message ?? res.statusText}`);
    return json;
  };
  return {
    name: "paystack",
    async initialize(i) {
      const j = await call("/transaction/initialize", {
        method: "POST",
        body: JSON.stringify({
          email: i.email, amount: Math.round(i.amountNgn * 100), currency: "NGN", reference: i.reference,
          callback_url: i.callbackUrl, metadata: { description: i.description, ...(i.metadata ?? {}) },
        }),
      });
      return { url: j.data.authorization_url as string, providerReference: j.data.access_code as string };
    },
    async verify(reference) {
      const j = await call(`/transaction/verify/${encodeURIComponent(reference)}`);
      return { paid: j.data.status === "success", amountNgn: Math.round(Number(j.data.amount) / 100), reference, raw: j.data };
    },
    parseWebhook(rawBody, headers) {
      const sig = headers.get("x-paystack-signature") ?? "";
      const expected = createHmac("sha512", secretKey).update(rawBody).digest("hex");
      const a = Buffer.from(sig), b = Buffer.from(expected);
      if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Bad Paystack signature");
      const ev = JSON.parse(rawBody);
      return ev.event === "charge.success" && ev.data?.reference ? { reference: String(ev.data.reference) } : null;
    },
  };
}
