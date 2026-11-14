import type { PaymentEnv } from "@spotted/core/server";
import { SITE_URL } from "./env";

export const payEnv = (): PaymentEnv => ({
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
  FLUTTERWAVE_SECRET_KEY: process.env.FLUTTERWAVE_SECRET_KEY,
  FLUTTERWAVE_SECRET_HASH: process.env.FLUTTERWAVE_SECRET_HASH,
  NEXT_PUBLIC_SITE_URL: SITE_URL,
});

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Only allow redirects back into this site. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
