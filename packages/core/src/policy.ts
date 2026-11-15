import { addDays, formatDay, todayInLagos } from "./format";
import type { CancellationPolicy, RoomCard } from "./types";

/** The three cancellation policies. Same words on the website, in the app and in the database (policy_free_days). */
export const POLICIES: Record<CancellationPolicy, { label: string; days: number; short: string; long: string }> = {
  flexible: { label: "Flexible", days: 1, short: "Full refund up to 1 day before check-in", long: "Cancel at least 1 day before check-in for a full refund. After that, the stay is not refundable." },
  moderate: { label: "Moderate", days: 5, short: "Full refund up to 5 days before check-in", long: "Cancel at least 5 days before check-in for a full refund. After that, the stay is not refundable." },
  strict: { label: "Strict", days: 14, short: "Full refund up to 14 days before check-in", long: "Cancel at least 14 days before check-in for a full refund. After that, the stay is not refundable." },
};

export const POLICY_KEYS = Object.keys(POLICIES) as CancellationPolicy[];

/** Last day a guest can cancel for a full refund. */
export function freeCancelUntil(policy: CancellationPolicy, checkIn: string): string {
  return addDays(checkIn, -POLICIES[policy].days);
}

/** "Free cancellation until 7 Dec", or the plain rule when the date has already passed or no dates are picked. */
export function cancellationLine(policy: CancellationPolicy, checkIn?: string | null, today = todayInLagos()): { text: string; free: boolean } {
  if (!checkIn) return { text: POLICIES[policy].short, free: true };
  const until = freeCancelUntil(policy, checkIn);
  if (until >= today) return { text: `Free cancellation until ${formatDay(until)}`, free: true };
  return { text: "Not refundable if cancelled now", free: false };
}

/** Whether cancelling today gets a full refund. Mirrors cancel_booking in the database. */
export function refundableToday(policy: CancellationPolicy, checkIn: string, today = todayInLagos()): boolean {
  return freeCancelUntil(policy, checkIn) >= today;
}

/** The price a guest pays for the whole stay before checkout: nights × price + cleaning (+ service fee if set). */
export function stayTotal(card: Pick<RoomCard, "price_per_night" | "cleaning_fee">, nights: number, serviceFeePct = 0): number {
  const sub = card.price_per_night * nights;
  return sub + card.cleaning_fee + Math.round((sub * serviceFeePct) / 100);
}
