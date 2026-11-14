// Server-only entry. Never import "@spotted/core/server" from the mobile app or a client component.
import type { Db } from "./client";
import { getPaymentProvider, newReference, providerName, type PaymentEnv } from "./payments";
import type { Booking, PaymentProviderName } from "./types";

export * from "./payments";
export type { PaymentProviderName } from "./types";
export { createServiceClient, createSpottedClient, type Db } from "./client";

export interface StartedPayment { url: string; reference: string; provider: PaymentProviderName }

/** Starts a payment for a booking the signed-in guest owns. `userDb` is the guest's own client (RLS proves ownership). */
export async function startBookingPayment(opts: {
  userDb: Db; serviceDb: Db; env: PaymentEnv; bookingCode: string; siteUrl: string;
  /** "app" sends the guest to a small page that hands them back to the Spotted app; "web" (default) goes to their booking page. */
  source?: "app" | "web";
  user: { email?: string | null; phone?: string | null; name?: string | null };
}): Promise<StartedPayment> {
  const { data: booking, error } = await opts.userDb.from("bookings").select("*").eq("code", opts.bookingCode).maybeSingle();
  if (error || !booking) throw new Error("Booking not found");
  const b = booking as Booking;
  if (b.status !== "pending_payment") throw new Error("This booking is not waiting for payment");
  if (b.expires_at && new Date(b.expires_at) <= new Date()) throw new Error("This hold expired. Please choose your dates again.");

  const name = providerName(opts.env);
  const provider = getPaymentProvider(opts.env, name);
  const reference = newReference(b.code);
  const { error: e2 } = await opts.serviceDb.rpc("start_payment", { p_booking_id: b.id, p_provider: name, p_reference: reference });
  if (e2) throw new Error(e2.message);

  const email = opts.user.email || `${(opts.user.phone ?? "guest").replace(/\D/g, "")}@guest.spotted.ng`; // gateways require an email
  const res = await provider.initialize({
    reference, amountNgn: b.total_ngn, email, name: opts.user.name, phone: opts.user.phone,
    callbackUrl: opts.source === "app" ? `${opts.siteUrl}/pay/done?code=${encodeURIComponent(b.code)}` : `${opts.siteUrl}/booking/${b.code}?paid=1`,
    description: `Stay ${b.check_in} to ${b.check_out}`,
    metadata: { booking: b.code },
  });
  return { url: res.url, reference, provider: name };
}

/** Verify with the gateway, then settle in the database. Safe to call many times for the same reference. */
export async function settleReference(opts: { serviceDb: Db; env: PaymentEnv; reference: string; /** Only the test-confirm route sets this. */ allowTest?: boolean }): Promise<Booking> {
  const { data: pay } = await opts.serviceDb.from("payments").select("provider, reference, booking_id, amount_ngn").eq("reference", opts.reference).maybeSingle();
  if (!pay) throw new Error("Unknown payment reference");
  if (pay.provider === "test" && !(opts.allowTest && (opts.env.PAYMENT_PROVIDER ?? "test") === "test")) {
    // A test payment can never be settled by a redirect, a webhook or a live-mode server. Only the explicit test button does it.
    const { data: b } = await opts.serviceDb.from("bookings").select("*").eq("id", pay.booking_id).single();
    return b as Booking;
  }
  const provider = getPaymentProvider(opts.env, pay.provider as PaymentProviderName);
  const v = await provider.verify(opts.reference);
  if (!v.paid) {
    const { data: b } = await opts.serviceDb.from("bookings").select("*").eq("id", pay.booking_id).single();
    return b as Booking;
  }
  const amount = pay.provider === "test" ? (pay.amount_ngn as number) : v.amountNgn;   // test mode moves no money, so the expected amount is the amount
  const { data, error } = await opts.serviceDb.rpc("confirm_payment", { p_reference: opts.reference, p_amount: amount, p_raw: v.raw as object });
  if (error) throw new Error(error.message);
  return data as Booking;
}
