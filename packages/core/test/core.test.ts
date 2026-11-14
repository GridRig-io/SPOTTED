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
