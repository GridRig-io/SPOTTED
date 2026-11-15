import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { formatNaira, nightsBetween, addDays, formatRange, formatTime, todayInLagos } from "../src/format.ts";
import { filtersFromParams, filtersToParams, filtersToRpc, activeFilterCount } from "../src/filters.ts";
import { normalizeNgPhone } from "../src/phone.ts";
import { paystack } from "../src/payments/paystack.ts";
import { flutterwave } from "../src/payments/flutterwave.ts";

test("naira formatting", () => {
  assert.equal(formatNaira(45000), "₦45,000");
  assert.equal(formatNaira(1234567), "₦1,234,567");
  assert.equal(formatNaira(null), "₦—");
});
test("dates", () => {
  assert.equal(nightsBetween("2026-12-28", "2027-01-02"), 5);
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(formatRange("2026-12-12", "2026-12-15"), "12 Dec to 15 Dec");
  assert.equal(formatTime("14:00:00"), "2pm");
  assert.equal(formatTime("11:30"), "11:30am");
  assert.match(todayInLagos(new Date("2026-12-31T23:30:00Z")), /^2027-01-01$/); // already tomorrow in Lagos (UTC+1)
});
test("filters round-trip through URL params and database args", () => {
  const f = filtersFromParams((k) => ({ area: "maitama", in: "2026-12-12", out: "2026-12-15", guests: "2", max: "60000", amenities: "wifi,gate", sort: "price_asc", kind: "bogus" } as Record<string, string>)[k]);
  assert.equal(f.kind, undefined);
  assert.deepEqual(f.amenities, ["wifi", "gate"]);
  assert.deepEqual(filtersFromParams((k) => filtersToParams(f)[k]), f);
  const rpc = filtersToRpc(f, 2, 24);
  assert.equal(rpc.p_offset, 48); assert.equal(rpc.p_check_in, "2026-12-12"); assert.equal(rpc.p_sort, "price_asc");
  assert.equal(filtersToRpc({ checkIn: "2026-12-12" }).p_check_in, null);   // one date alone is ignored
  assert.equal(activeFilterCount(f), 4);
});
test("Nigerian phone numbers", () => {
  for (const n of ["08031234567", "8031234567", "+2348031234567", "234 803 123 4567", "0803-123-4567"]) assert.equal(normalizeNgPhone(n), "+2348031234567");
  for (const n of ["0123456789", "12345", "+447700900123", ""]) assert.equal(normalizeNgPhone(n), null);
});
test("paystack webhook: signature checked, only charge.success counts", () => {
  const p = paystack("sk_test_abc");
  const body = JSON.stringify({ event: "charge.success", data: { reference: "SP-ABC123-1F" } });
  const sig = createHmac("sha512", "sk_test_abc").update(body).digest("hex");
  assert.deepEqual(p.parseWebhook(body, new Headers({ "x-paystack-signature": sig })), { reference: "SP-ABC123-1F" });
  assert.throws(() => p.parseWebhook(body, new Headers({ "x-paystack-signature": "nope" })), /Bad Paystack signature/);
  const other = JSON.stringify({ event: "charge.failed", data: { reference: "X" } });
  assert.equal(p.parseWebhook(other, new Headers({ "x-paystack-signature": createHmac("sha512", "sk_test_abc").update(other).digest("hex") })), null);
});
test("flutterwave webhook: hash checked, only successful counts", () => {
  const f = flutterwave("FLWSECK_TEST", "my-hash");
  const body = JSON.stringify({ event: "charge.completed", data: { status: "successful", tx_ref: "SP-ABC123-1F" } });
  assert.deepEqual(f.parseWebhook(body, new Headers({ "verif-hash": "my-hash" })), { reference: "SP-ABC123-1F" });
  assert.throws(() => f.parseWebhook(body, new Headers({ "verif-hash": "wrong" })), /Bad Flutterwave hash/);
  assert.throws(() => flutterwave("k", "").parseWebhook(body, new Headers()), /Bad Flutterwave hash/);
});

import { cancellationLine, freeCancelUntil, refundableToday, stayTotal } from "../src/policy.ts";
import { distanceKm, formatDistance, googleDirectionsUrl, inNigeria } from "../src/geo.ts";
import { makeSlug } from "../src/host.ts";

test("cancellation policies: free-until date and refund rule match the database", () => {
  assert.equal(freeCancelUntil("moderate", "2026-12-10"), "2026-12-05");
  assert.equal(freeCancelUntil("flexible", "2026-12-10"), "2026-12-09");
  assert.equal(freeCancelUntil("strict", "2026-12-20"), "2026-12-06");
  assert.equal(refundableToday("moderate", "2026-12-10", "2026-12-05"), true);
  assert.equal(refundableToday("moderate", "2026-12-10", "2026-12-06"), false);
  assert.deepEqual(cancellationLine("moderate", "2026-12-10", "2026-12-01"), { text: "Free cancellation until 5 Dec", free: true });
  assert.equal(cancellationLine("strict", "2026-12-03", "2026-12-01").free, false);
});

test("total stay price shown on cards", () => {
  assert.equal(stayTotal({ price_per_night: 95000, cleaning_fee: 10000 }, 2), 200000);
  assert.equal(stayTotal({ price_per_night: 10000, cleaning_fee: 0 }, 3, 5), 31500);
});

test("geo helpers", () => {
  const km = distanceKm({ lat: 6.4478, lng: 3.4735 }, { lat: 6.43, lng: 3.42 });
  assert.ok(km > 5 && km < 7);
  assert.equal(formatDistance(0.42), "400 m away");
  assert.equal(formatDistance(3.44), "3.4 km away");
  assert.match(googleDirectionsUrl({ lat: 9, lng: 7 }), /destination=9,7/);
  assert.equal(inNigeria({ lat: 51.5, lng: -0.1 }), false);
});

test("state is part of the search link; nearest needs a location and never enters the URL", () => {
  const f = filtersFromParams((k) => ({ state: "lagos", area: "lekki", sort: "nearest" } as Record<string, string>)[k]);
  assert.equal(f.state, "lagos");
  assert.equal(filtersToParams(f).state, "lagos");
  assert.equal(filtersToRpc(f).p_sort, "recommended");
  const r = filtersToRpc(f, 0, 24, { lat: 6.45, lng: 3.47 });
  assert.equal(r.p_sort, "nearest"); assert.equal(r.p_near_lat, 6.45); assert.equal(r.p_state, "lagos");
});

test("listing slugs are tidy and unique-ish", () => {
  assert.match(makeSlug("Lekki Nest!"), /^lekki-nest-[a-z0-9]{4}$/);
  assert.notEqual(makeSlug("A"), makeSlug("A"));
});
