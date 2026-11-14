import { test } from "node:test";
import assert from "node:assert/strict";
import { settleReference } from "../src/server.ts";

// A tiny fake of the parts of the database client that settleReference touches.
function fakeDb(provider: string) {
  const calls: string[] = [];
  const rows: Record<string, any> = { payments: { provider, reference: "R1", booking_id: "B1", amount_ngn: 5000 }, bookings: { id: "B1", status: "pending_payment", code: "SP-AAAAAA" } };
  const chain = (t: string) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: rows[t] }), single: async () => ({ data: rows[t] }) }) }) });
  return { calls, from: (t: string) => chain(t), rpc: async (fn: string) => { calls.push(fn); return { data: { ...rows.bookings, status: "confirmed" }, error: null }; } } as any;
}

test("a test payment cannot be settled by a redirect or webhook", async () => {
  const db = fakeDb("test");
  const b = await settleReference({ serviceDb: db, env: { PAYMENT_PROVIDER: "test" }, reference: "R1" });
  assert.equal(b.status, "pending_payment"); assert.deepEqual(db.calls, []);
});
test("a test payment cannot be settled when the site is live, even from the test route", async () => {
  const db = fakeDb("test");
  const b = await settleReference({ serviceDb: db, env: { PAYMENT_PROVIDER: "paystack" }, reference: "R1", allowTest: true });
  assert.equal(b.status, "pending_payment"); assert.deepEqual(db.calls, []);
});
test("the test route settles test payments in test mode", async () => {
  const db = fakeDb("test");
  const b = await settleReference({ serviceDb: db, env: { PAYMENT_PROVIDER: "test" }, reference: "R1", allowTest: true });
  assert.equal(b.status, "confirmed"); assert.deepEqual(db.calls, ["confirm_payment"]);
});
