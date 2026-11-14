import type { PaymentProviderName } from "../types";
import { flutterwave } from "./flutterwave";
import { paystack } from "./paystack";
import { testProvider } from "./test";
import type { PaymentProvider } from "./types";

export * from "./types";

export interface PaymentEnv {
  PAYMENT_PROVIDER?: string;
  PAYSTACK_SECRET_KEY?: string;
  FLUTTERWAVE_SECRET_KEY?: string;
  FLUTTERWAVE_SECRET_HASH?: string;
  NEXT_PUBLIC_SITE_URL?: string;
}

export function providerName(env: PaymentEnv): PaymentProviderName {
  const n = (env.PAYMENT_PROVIDER ?? "test").toLowerCase();
  if (n === "paystack" || n === "flutterwave" || n === "test") return n;
  throw new Error(`PAYMENT_PROVIDER must be paystack, flutterwave or test (got "${env.PAYMENT_PROVIDER}")`);
}

/** The one switch. Change PAYMENT_PROVIDER in .env and redeploy; no other code changes. */
export function getPaymentProvider(env: PaymentEnv, name: PaymentProviderName = providerName(env)): PaymentProvider {
  switch (name) {
    case "paystack":
      if (!env.PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY is missing");
      return paystack(env.PAYSTACK_SECRET_KEY);
    case "flutterwave":
      if (!env.FLUTTERWAVE_SECRET_KEY) throw new Error("FLUTTERWAVE_SECRET_KEY is missing");
      return flutterwave(env.FLUTTERWAVE_SECRET_KEY, env.FLUTTERWAVE_SECRET_HASH ?? "");
    case "test":
      return testProvider(env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
  }
}

/** Short, unguessable, unique reference shared with the gateway. */
export function newReference(bookingCode: string): string {
  const rnd = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${bookingCode}-${rnd}`.toUpperCase();
}
