import type { PaymentProvider } from "./types";

/** Test mode: no money moves. "Paying" is a button on our own page. Use it to try the whole booking flow before you have gateway keys. */
export function testProvider(appUrl: string): PaymentProvider {
  const paid = new Set<string>();
  return {
    name: "test",
    async initialize(i) {
      const u = new URL("/pay/test", appUrl);
      u.searchParams.set("reference", i.reference);
      u.searchParams.set("amount", String(i.amountNgn));
      u.searchParams.set("next", i.callbackUrl);
      return { url: u.toString() };
    },
    async verify(reference) {
      // Test mode trusts the test-confirm route, which only exists when PAYMENT_PROVIDER=test.
      return { paid: true, amountNgn: Number.MAX_SAFE_INTEGER, reference, raw: { test: true, seen: paid.has(reference) } };
    },
    parseWebhook() { return null; },
  };
}
