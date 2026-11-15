// Applies every migration to an in-memory Postgres (PGlite) and checks the rules that matter:
// double booking, publish gate, privacy, money functions. Run: npm run test:db
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";

const dir = new URL("../migrations/", import.meta.url);
const db = await new PGlite({ extensions: { btree_gist } });

// Minimal stand-ins for what Supabase provides.
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), instance_id uuid, aud text, role text, email text, phone text, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz, updated_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  grant usage on schema public, auth to anon, authenticated, service_role;
`);

for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  await db.exec(readFileSync(new URL(f, dir), "utf8"));
  console.log("applied", f);
}

let passed = 0;
const as = async (role, uid, fn) => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
};
const q = async (sql, params) => (await db.query(sql, params)).rows;
const test = async (name, fn) => {
  try { await fn(); passed++; console.log("  ok  ", name); }
  catch (e) { console.error("  FAIL", name, "\n      ", e.message); process.exitCode = 1; }
};
const fails = async (fn, re) => {
  let err; try { await fn(); } catch (e) { err = e; }
  assert.ok(err, "expected an error but none was thrown");
  if (re) assert.match(err.message, re, `wrong error: ${err.message}`);
};

const [{ id: owner }] = await q(`insert into auth.users (email, raw_user_meta_data) values ('owner@x.ng', '{"full_name":"Ada Okafor"}') returning id`);
const [{ id: g1 }] = await q(`insert into auth.users (email, raw_user_meta_data) values ('g1@x.ng', '{"full_name":"Tunde Bello"}') returning id`);
const [{ id: g2 }] = await q(`insert into auth.users (email) values ('g2@x.ng') returning id`);

const [{ id: area }] = await q(`select id from areas where slug = 'maitama'`);
const [{ id: prop }] = await q(`insert into properties (owner_id, area_id, name, slug, status, area_hint) values ($1, $2, 'Ada Flats', 'ada-flats', 'draft', 'Off Aguiyi Ironsi') returning id`, [owner, area]);
await q(`insert into property_private (property_id, street_address, wifi_password) values ($1, '12 Secret Close', 'hunter2')`, [prop]);
const [{ id: flat }] = await q(`insert into rooms (property_id, name, kind, price_per_night, cleaning_fee, max_guests) values ($1, 'Whole flat', 'whole_flat', 50000, 5000, 4) returning id`, [prop]);
const [{ id: master }] = await q(`insert into rooms (property_id, name, kind, price_per_night, max_guests) values ($1, 'Master room', 'master_room', 30000, 2) returning id`, [prop]);

await test("reference data: 22 amenities, areas, settings", async () => {
  assert.equal((await q(`select count(*)::int n from amenity_catalog`))[0].n, 22);
  assert.ok((await q(`select count(*)::int n from areas`))[0].n >= 15);
  assert.equal((await q(`select value from app_settings where key='host_commission_pct'`))[0].value, 10);
});
await test("profile is created for new users", async () => {
  assert.equal((await q(`select full_name from profiles where id = $1`, [owner]))[0].full_name, "Ada Okafor");
});

await test("publish gate: blocked without 5 photos", async () => {
  await fails(() => q(`update rooms set status='published' where id=$1`, [flat]), /at least 5 photos/);
});
for (let i = 0; i < 4; i++) await q(`insert into room_photos (property_id, room_id, url, position) values ($1,$2,$3,$4)`, [prop, flat, `https://img.test/${i}.jpg`, i]);
await test("publish gate: 4 photos still blocked", async () => {
  await fails(() => q(`update rooms set status='published' where id=$1`, [flat]), /at least 5 photos/);
});
await q(`insert into room_photos (property_id, room_id, url, position) values ($1,$2,'https://img.test/4.jpg',4)`, [prop, flat]);
await test("publish gate: 5 photos but amenities unanswered is blocked", async () => {
  await fails(() => q(`update rooms set status='published' where id=$1`, [flat]), /Answer all 22 amenities/);
});
await test("amenity scope is enforced", async () => {
  await fails(() => q(`insert into amenity_answers (property_id, room_id, amenity_key, state) values ($1,$2,'wifi','included')`, [prop, flat]), /once for the whole property/);
  await fails(() => q(`insert into amenity_answers (property_id, amenity_key, state) values ($1,'air_conditioning','included')`, [prop]), /for each room/);
  await fails(() => q(`insert into amenity_answers (property_id, amenity_key, state) values ($1,'grid_power','paid')`, [prop]), /check/i);
});

const answerAll = async (room, overrides = {}) => {
  for (const c of await q(`select key, scope from amenity_catalog`)) {
    const o = overrides[c.key] ?? {};
    await q(
      `insert into amenity_answers (property_id, room_id, amenity_key, state, spec_value, note, extra_cost_ngn)
       values ($1, $2, $3, $4, $5, $6, $7) on conflict do nothing`,
      [prop, c.scope === "room" ? room : null, c.key, o.state ?? "included", o.spec ?? null, o.note ?? null, o.cost ?? null],
    );
  }
};
await answerAll(flat, { wifi: { state: "included", spec: 40 }, washing_machine: { state: "paid", cost: 3000 }, pets: { state: "not_offered" } });
await test("publish gate: passes once photos and all 22 answers exist", async () => {
  await q(`update properties set status='published', published_at=now() where id=$1`, [prop]);
  await q(`update rooms set status='published' where id=$1`, [flat]);
  assert.equal((await q(`select status from rooms where id=$1`, [flat]))[0].status, "published");
});
await test("a second room needs its own 5 photos and room-level answers", async () => {
  await fails(() => q(`update rooms set status='published' where id=$1`, [master]), /at least 5 photos/);
  for (let i = 0; i < 5; i++) await q(`insert into room_photos (property_id, room_id, url, position) values ($1,$2,$3,$4)`, [prop, master, `https://img.test/m${i}.jpg`, i]);
  await fails(() => q(`update rooms set status='published' where id=$1`, [master]), /Answer all 22/);
  await answerAll(master);
  await q(`update rooms set status='published' where id=$1`, [master]);
});

await test("anon can search; card carries photos, amenities, included keys", async () => {
  const rows = await as("anon", null, () => q(`select * from search_rooms()`));
  assert.equal(rows.length, 2);
  const c = rows.find((r) => r.room_id === flat);
  assert.equal(c.photos.length, 5);
  assert.equal(c.amenities.wifi.spec_value, 40);
  assert.ok(c.included_keys.includes("wifi"));
  assert.ok(!c.included_keys.includes("pets"));
});
await test("search filters: amenity must-haves, price, guests, area", async () => {
  const n = async (sql, p) => (await as("anon", null, () => q(sql, p))).length;
  assert.equal(await n(`select * from search_rooms(p_amenities => array['wifi','gate'])`), 2);
  assert.equal(await n(`select * from search_rooms(p_amenities => array['pets'])`), 0);
  assert.equal(await n(`select * from search_rooms(p_max => 40000)`), 1);
  assert.equal(await n(`select * from search_rooms(p_guests => 3)`), 1);
  assert.equal(await n(`select * from search_rooms(p_area => 'garki')`), 0);
  assert.equal(await n(`select * from search_rooms(p_area => 'maitama', p_q => 'ada')`), 2);
});
await test("anon cannot read private details, bookings, payments, profiles", async () => {
  assert.equal((await as("anon", null, () => q(`select * from properties`))).length, 1);
  await fails(() => as("anon", null, () => q(`select * from property_private`)), /permission denied/);
  await fails(() => as("anon", null, () => q(`select * from bookings`)), /permission denied/);
  await fails(() => as("anon", null, () => q(`select * from profiles`)), /permission denied/);
});

const D = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
let b1;
await test("quote is computed on the server", async () => {
  const [{ q: quote }] = await as("authenticated", g1, () => q(`select quote_stay($1, $2, $3, 2) q`, [flat, D(10), D(13)]));
  assert.equal(quote.nights, 3); assert.equal(quote.subtotal_ngn, 150000); assert.equal(quote.total_ngn, 155000);
  assert.equal(quote.commission_ngn, 15000); assert.equal(quote.available, true);
});
await test("validation: past dates, too many guests, reversed dates, signed out", async () => {
  await fails(() => as("authenticated", g1, () => q(`select create_booking($1,$2,$3,2)`, [flat, D(-2), D(1)])), /past/);
  await fails(() => as("authenticated", g1, () => q(`select create_booking($1,$2,$3,9)`, [flat, D(10), D(12)])), /sleeps up to 4/);
  await fails(() => as("authenticated", g1, () => q(`select create_booking($1,$2,$3,2)`, [flat, D(12), D(10)])), /after check-in/);
  await fails(() => as("anon", null, () => q(`select create_booking($1,$2,$3,2)`, [flat, D(10), D(12)])), /permission denied/);
  await fails(() => as("authenticated", owner, () => q(`select create_booking($1,$2,$3,2)`, [flat, D(10), D(12)])), /own place/);
});
await test("guest books; price snapshot saved; dates held", async () => {
  const [row] = await as("authenticated", g1, () => q(`select * from create_booking($1,$2,$3,2)`, [flat, D(10), D(13)]));
  b1 = row;
  assert.equal(row.status, "pending_payment"); assert.equal(row.total_ngn, 155000); assert.match(row.code, /^SP-[A-Z0-9]{6}$/);
});
await test("double booking is impossible (same room, overlapping nights)", async () => {
  await fails(() => as("authenticated", g2, () => q(`select create_booking($1,$2,$3,2)`, [flat, D(12), D(15)])), /no longer available/);
  await fails(() => as("authenticated", g2, () => q(`select create_booking($1,$2,$3,2)`, [flat, D(9), D(11)])), /no longer available/);
});
await test("whole flat held blocks the rooms inside it (and back-to-back stay is allowed)", async () => {
  await fails(() => as("authenticated", g2, () => q(`select create_booking($1,$2,$3,1)`, [master, D(11), D(12)])), /no longer available/);
  const [row] = await as("authenticated", g2, () => q(`select * from create_booking($1,$2,$3,1)`, [master, D(13), D(15)]));
  assert.equal(row.status, "pending_payment");
});
await test("database exclusion constraint backs up the function", async () => {
  await fails(() => q(`insert into bookings (code, room_id, property_id, guest_id, check_in, check_out, guests, nightly_ngn, subtotal_ngn, total_ngn) values ('SP-HACK01',$1,$2,$3,$4,$5,1,1,1,1)`, [flat, prop, g2, D(11), D(12)]), /no_double_booking/);
});
await test("blocked ranges are visible to anyone without leaking who booked", async () => {
  const r = await as("anon", null, () => q(`select * from room_blocked_ranges($1)`, [flat]));
  assert.equal(r.length, 2); assert.deepEqual(Object.keys(r[0]).sort(), ["check_in", "check_out"]);
});
await test("search by dates hides rooms that are taken", async () => {
  const r = await as("anon", null, () => q(`select room_id from search_rooms(p_check_in => $1, p_check_out => $2)`, [D(11), D(12)]));
  assert.equal(r.length, 0);
  const r2 = await as("anon", null, () => q(`select room_id from search_rooms(p_check_in => $1, p_check_out => $2)`, [D(20), D(22)]));
  assert.equal(r2.length, 2);
});

await test("guests cannot write bookings/payments directly or call payment functions", async () => {
  await fails(() => as("authenticated", g1, () => q(`update bookings set status='confirmed' where id=$1`, [b1.id])), /permission denied/);
  await fails(() => as("authenticated", g1, () => q(`insert into payments (booking_id, provider, reference, amount_ngn) values ($1,'test','x',1)`, [b1.id])), /permission denied/);
  await fails(() => as("authenticated", g1, () => q(`select confirm_payment('x', 1)`)), /permission denied/);
  await fails(() => as("authenticated", g1, () => q(`select start_payment($1,'test','r')`, [b1.id])), /permission denied/);
});
await test("guests only see their own bookings", async () => {
  assert.equal((await as("authenticated", g1, () => q(`select * from bookings`))).length, 1);
  assert.equal((await as("authenticated", g2, () => q(`select * from bookings`))).length, 1);
  assert.equal((await as("authenticated", owner, () => q(`select * from bookings`))).length, 2);
});
await test("private details hidden until the booking is confirmed", async () => {
  assert.equal((await as("authenticated", g1, () => q(`select * from property_private`))).length, 0);
});
await test("payment: start, wrong amount fails, correct amount confirms, replay is idempotent", async () => {
  const pay = (await as("service_role", null, () => q(`select * from start_payment($1,'paystack','SPOT-REF-1')`, [b1.id])))[0];
  assert.equal(pay.amount_ngn, 155000);
  await as("service_role", null, () => q(`select confirm_payment('SPOT-REF-1', 1000)`));
  assert.equal((await q(`select status from bookings where id=$1`, [b1.id]))[0].status, "pending_payment");
  assert.equal((await q(`select status from payments where reference='SPOT-REF-1'`))[0].status, "failed");
  await q(`update payments set status='initiated' where reference='SPOT-REF-1'`);
  const [c] = await as("service_role", null, () => q(`select * from confirm_payment('SPOT-REF-1', 155000, '{"ok":true}')`));
  assert.equal(c.status, "confirmed");
  const [c2] = await as("service_role", null, () => q(`select * from confirm_payment('SPOT-REF-1', 155000)`));
  assert.equal(c2.status, "confirmed");
  assert.equal((await q(`select status from payments where reference='SPOT-REF-1'`))[0].status, "paid");
});
await test("confirmed guest can read address and wifi only in their stay window; others never", async () => {
  assert.equal((await as("authenticated", g1, () => q(`select * from property_private`))).length, 0); // stay is 10 days away
  await q(`update bookings set check_in = $2::date, check_out = $3::date where id = $1`, [b1.id, D(0), D(2)]);
  const rows = await as("authenticated", g1, () => q(`select * from property_private`));
  assert.equal(rows.length, 1); assert.equal(rows[0].wifi_password, "hunter2");
  assert.equal((await as("authenticated", g2, () => q(`select * from property_private`))).length, 0);
  assert.equal((await as("authenticated", owner, () => q(`select * from property_private`))).length, 1);
});
await test("expired holds release the nights and late payment is flagged for refund when taken", async () => {
  const [b] = await as("authenticated", g2, () => q(`select * from create_booking($1,$2,$3,1)`, [master, D(30), D(32)]));
  await as("service_role", null, () => q(`select start_payment($1,'test','SPOT-REF-2')`, [b.id]));
  await q(`update bookings set expires_at = now() - interval '1 minute' where id = $1`, [b.id]);
  const [b3] = await as("authenticated", g1, () => q(`select * from create_booking($1,$2,$3,1)`, [master, D(30), D(32)]));
  assert.equal(b3.status, "pending_payment");
  assert.equal((await q(`select status from bookings where id=$1`, [b.id]))[0].status, "expired");
  await as("service_role", null, () => q(`select confirm_payment('SPOT-REF-2', ${b.total_ngn})`));
  assert.equal((await q(`select status from payments where reference='SPOT-REF-2'`))[0].status, "needs_refund");
});
await test("cancel frees the nights", async () => {
  const code = (await q(`select code from bookings where room_id=$1 and check_in=$2 and status='pending_payment'`, [master, D(30)]))[0].code;
  const [row] = await as("authenticated", g1, () => q(`select * from cancel_booking($1)`, [code]));
  assert.equal(row.status, "cancelled");
  await fails(() => as("authenticated", g2, () => q(`select cancel_booking($1)`, [row.code])), /not found/i);
});

await test("profile role cannot be changed by the user", async () => {
  await fails(() => as("authenticated", g1, () => q(`update profiles set role='admin' where id=$1`, [g1])), /permission denied/);
  await as("authenticated", g1, () => q(`update profiles set full_name='Tunde B' where id=$1`, [g1]));
  assert.equal((await as("authenticated", g1, () => q(`select * from profiles`))).length, 1);
});
await test("reviews need a finished stay, show first name only, and update the rating", async () => {
  await fails(() => as("authenticated", g2, () => q(`insert into reviews (booking_id, property_id, room_id, guest_id, rating) values ($1,$2,$3,$4,5)`, [b1.id, prop, flat, g2])), /row-level security/);
  await q(`update bookings set check_in = $2::date, check_out = $3::date where id = $1`, [b1.id, D(-5), D(-2)]);
  await as("authenticated", g1, () => q(`insert into reviews (booking_id, property_id, room_id, guest_id, rating, comment) values ($1,$2,$3,$4,5,'Light was steady')`, [b1.id, prop, flat, g1]));
  const rv = await as("anon", null, () => q(`select * from v_reviews`));
  assert.equal(rv[0].guest_first_name, "Tunde"); assert.equal("guest_id" in rv[0], false);
  assert.equal((await q(`select rating_avg, rating_count from properties where id=$1`, [prop]))[0].rating_count, 1);
});
await test("owner can manage own place but not someone else's; saved places are private", async () => {
  await as("authenticated", owner, () => q(`update rooms set price_per_night = 52000 where id=$1`, [flat]));
  assert.equal((await q(`select price_per_night from rooms where id=$1`, [flat]))[0].price_per_night, 52000);
  await as("authenticated", g1, () => q(`update rooms set price_per_night = 1000 where id=$1`, [flat]));
  assert.equal((await q(`select price_per_night from rooms where id=$1`, [flat]))[0].price_per_night, 52000);
  await as("authenticated", g1, () => q(`insert into saved_places (user_id, property_id) values ($1,$2)`, [g1, prop]));
  assert.equal((await as("authenticated", g2, () => q(`select * from saved_places`))).length, 0);
  await fails(() => as("authenticated", g2, () => q(`insert into saved_places (user_id, property_id) values ($1,$2)`, [g1, prop])), /row-level security/);
});
await test("unclaimed places are listed but cannot be booked (no rooms)", async () => {
  await q(`insert into properties (area_id, name, slug, status) values ($1,'Old Gate Guest House','old-gate','unclaimed')`, [area]);
  assert.equal((await as("anon", null, () => q(`select * from v_unclaimed_places`))).length, 1);
  assert.equal((await as("anon", null, () => q(`select * from search_rooms()`))).length, 2);
});

// ───────── 0006 / 0007: hosts, review, blocks, policies, states, location ─────────
const [{ id: h2 }] = await q(`insert into auth.users (email, raw_user_meta_data) values ('host2@x.ng', '{"full_name":"Chidi Nwosu"}') returning id`);
const [{ id: adminU }] = await q(`insert into auth.users (email) values ('admin@x.ng') returning id`);
await q(`update profiles set role='admin' where id=$1`, [adminU]);
await test("become_host: checks the phone, makes the user an owner, keeps admins admin", async () => {
  await fails(() => as("authenticated", h2, () => q(`select become_host('Chidi Nwosu', '0803', null)`)), /Nigerian phone/);
  await as("authenticated", h2, () => q(`select become_host('Chidi Nwosu', '+2348031234567', 'Nwosu Stays')`));
  const [p] = await q(`select role, business_name, host_since from profiles where id=$1`, [h2]);
  assert.equal(p.role, "owner"); assert.equal(p.business_name, "Nwosu Stays"); assert.ok(p.host_since);
  await as("authenticated", adminU, () => q(`select become_host('Ada Admin', '+2348000000001')`));
  assert.equal((await q(`select role from profiles where id=$1`, [adminU]))[0].role, "admin");
});
const [{ id: lagosArea }] = await q(`select a.id from areas a join states s on s.id=a.state_id where s.slug='lagos' and a.slug='lekki'`);
const hp = "11111111-1111-4111-8111-111111111111", hr = "22222222-2222-4222-8222-222222222222";
await test("hosts create drafts; cannot fake demo, ratings, status or the public map spot", async () => {
  await as("authenticated", h2, () => q(`insert into properties (id, owner_id, area_id, name, slug, status, is_demo, rating_avg, lat, lng, description)
    values ($1,$2,$3,'Lekki Nest','lekki-nest','published',true,5,6.5,3.5,'A calm two-bed flat in Lekki Phase 1 with steady power and a borehole.')`, [hp, h2, lagosArea]));
  const [p] = await q(`select status, is_demo, rating_avg, lat from properties where id=$1`, [hp]);
  assert.equal(p.status, "draft"); assert.equal(p.is_demo, false); assert.equal(Number(p.rating_avg), 0); assert.equal(p.lat, null);
  await fails(() => as("authenticated", h2, () => q(`update properties set status='published' where id=$1`, [hp])), /Spotted check/);
  await fails(() => as("authenticated", h2, () => q(`update properties set lat=6.4 where id=$1`, [hp])), /managed by Spotted/);
  await fails(() => as("authenticated", h2, () => q(`update properties set rating_count=99 where id=$1`, [hp])), /managed by Spotted/);
});
await test("host amenity answers are always marked as the host's own word", async () => {
  await as("authenticated", h2, () => q(`insert into rooms (id, property_id, name, kind, price_per_night, max_guests) values ($1,$2,'Whole flat','whole_flat',80000,4)`, [hr, hp]));
  for (const c of await q(`select key, scope from amenity_catalog`))
    await as("authenticated", h2, () => q(`insert into amenity_answers (property_id, room_id, amenity_key, state, evidence) values ($1,$2,$3,'included','checked')`, [hp, c.scope === "room" ? hr : null, c.key]));
  assert.equal((await q(`select count(*)::int n from amenity_answers where property_id=$1 and evidence <> 'declared'`, [hp]))[0].n, 0);
});
await test("submit for review needs address, phone and complete rooms", async () => {
  await fails(() => as("authenticated", h2, () => q(`select submit_property($1)`, [hp])), /street address/);
  await as("authenticated", h2, () => q(`insert into property_private (property_id, street_address, host_phone, lat, lng, landmark) values ($1,'4 Admiralty Way','+2348031234567',6.447812,3.473456,'Opposite the Total filling station')`, [hp]));
  await fails(() => as("authenticated", h2, () => q(`select submit_property($1)`, [hp])), /at least 5 photos/);
  for (let i = 0; i < 5; i++) await as("authenticated", h2, () => q(`insert into room_photos (property_id, room_id, url, position) values ($1,$2,$3,$4)`, [hp, hr, `https://img.test/h${i}.jpg`, i]));
  await fails(() => as("authenticated", g1, () => q(`select submit_property($1)`, [hp])), /not found/);
  const [p] = await as("authenticated", h2, () => q(`select * from submit_property($1)`, [hp]));
  assert.equal(p.status, "pending_review");
});
await test("exact pin is private; the public map gets a rounded spot", async () => {
  const [p] = await q(`select lat, lng from properties where id=$1`, [hp]);
  assert.equal(Number(p.lat), 6.45); assert.equal(Number(p.lng), 3.47);
  assert.equal((await as("authenticated", g1, () => q(`select * from property_private where property_id=$1`, [hp]))).length, 0);
});
await test("only a Spotted admin can publish; rejecting needs a note", async () => {
  await fails(() => as("authenticated", h2, () => q(`select review_property($1, true)`, [hp])), /Only Spotted reviewers/);
  await fails(() => as("authenticated", adminU, () => q(`select review_property($1, false, '')`, [hp])), /what to fix/);
  await as("authenticated", adminU, () => q(`select review_property($1, false, 'Photo 3 is blurry')`, [hp]));
  assert.equal((await q(`select status, review_note from properties where id=$1`, [hp]))[0].review_note, "Photo 3 is blurry");
  await as("authenticated", h2, () => q(`select submit_property($1)`, [hp]));
  const [p] = await as("authenticated", adminU, () => q(`select * from review_property($1, true)`, [hp]));
  assert.equal(p.status, "published");
});
await test("states: search one state at a time; areas belong to a state", async () => {
  const lagos = await as("anon", null, () => q(`select * from search_rooms(p_state => 'lagos')`));
  assert.equal(lagos.length, 1); assert.equal(lagos[0].state_slug, "lagos"); assert.equal(lagos[0].cancellation_policy, "moderate");
  const fct = await as("anon", null, () => q(`select * from search_rooms(p_state => 'fct')`));
  assert.ok(fct.every((c) => c.state_slug === "fct"));
  assert.ok((await q(`select count(*)::int n from areas where slug = 'enugu-other'`))[0].n === 1);
});
await test("nearest first puts the closest place on top", async () => {
  const near = await as("anon", null, () => q(`select property_slug from search_rooms(p_sort => 'nearest', p_near_lat => 6.45, p_near_lng => 3.47)`));
  assert.equal(near[0].property_slug, "lekki-nest");
});
await test("host date blocks close dates for guests (whole-flat rule too) and stay private", async () => {
  await as("authenticated", h2, () => q(`insert into room_blocks (room_id, property_id, start_date, end_date, note) values ($1,$2,$3,$4,'Family visiting')`, [hr, hp, D(40), D(43)]));
  const [qt] = await as("authenticated", g1, () => q(`select quote_stay($1,$2,$3,1) as v`, [hr, D(41), D(42)]));
  assert.equal(qt.v.available, false);
  const ranges = await as("anon", null, () => q(`select * from room_blocked_ranges($1)`, [hr]));
  assert.ok(ranges.length >= 1);
  assert.equal((await as("authenticated", g1, () => q(`select * from room_blocks`))).length, 0);
  await fails(() => as("authenticated", g1, () => q(`insert into room_blocks (room_id, property_id, start_date, end_date) values ($1,$2,$3,$4)`, [hr, hp, D(50), D(51)])), /row-level security/);
  await fails(() => as("authenticated", h2, () => q(`insert into room_blocks (room_id, property_id, start_date, end_date) values ($1,$2,$3,$4)`, [flat, hp, D(50), D(51)])), /does not belong/);
});
await test("host sees their bookings with guest first name; phone only once confirmed", async () => {
  const [b] = await as("authenticated", g1, () => q(`select * from create_booking($1,$2,$3,2)`, [hr, D(60), D(62)]));
  let rows = await as("authenticated", h2, () => q(`select * from host_bookings()`));
  assert.equal(rows.length, 1); assert.equal(rows[0].guest_first_name, "Tunde"); assert.equal(rows[0].guest_phone, null);
  assert.equal((await as("authenticated", owner, () => q(`select * from host_bookings() where property_id=$1`, [hp]))).length, 0);
  const [host] = await as("anon", null, () => q(`select * from property_host($1)`, [hp]));
  assert.equal(host.first_name, "Chidi"); assert.equal(host.business_name, "Nwosu Stays");
  // cancellation policy: moderate = full refund 5+ days before check-in
  await as("service_role", null, () => q(`select start_payment($1,'test','SPOT-REF-H1')`, [b.id]));
  await as("service_role", null, () => q(`select confirm_payment('SPOT-REF-H1', ${b.total_ngn})`));
  await as("authenticated", g1, () => q(`select cancel_booking($1)`, [b.code]));
  assert.equal((await q(`select status from payments where reference='SPOT-REF-H1'`))[0].status, "needs_refund");
});
await test("strict policy: late cancellation keeps the payment", async () => {
  await q(`update properties set cancellation_policy='strict' where id=$1`, [hp]);
  const [b] = await as("authenticated", g1, () => q(`select * from create_booking($1,$2,$3,2)`, [hr, D(6), D(8)]));
  await as("service_role", null, () => q(`select start_payment($1,'test','SPOT-REF-H2')`, [b.id]));
  await as("service_role", null, () => q(`select confirm_payment('SPOT-REF-H2', ${b.total_ngn})`));
  await as("authenticated", g1, () => q(`select cancel_booking($1)`, [b.code]));
  assert.equal((await q(`select status from payments where reference='SPOT-REF-H2'`))[0].status, "paid");
});

// ───────── demo seed on a fresh database ─────────
{
  const db2 = await new PGlite({ extensions: { btree_gist } });
  await db2.exec(`
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), instance_id uuid, aud text, role text, email text, phone text, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz, updated_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    grant usage on schema public, auth to anon, authenticated, service_role;
  `);
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) await db2.exec(readFileSync(new URL(f, dir), "utf8"));
  await db2.exec(readFileSync(new URL("../seed/demo.sql", import.meta.url), "utf8"));
  await db2.exec(readFileSync(new URL("../seed/demo.sql", import.meta.url), "utf8")); // safe to run twice
  await test("demo seed: publishes through the same gate, is repeatable, search works", async () => {
    await db2.exec(`set role anon`);
    const cards = (await db2.query(`select * from search_rooms(p_limit => 60)`)).rows;
    const un = (await db2.query(`select * from v_unclaimed_places`)).rows;
    await db2.exec(`reset role`);
    assert.equal(cards.length, 12); assert.equal(un.length, 3);
    assert.ok(cards.every((c) => c.photos.length === 5 && Object.keys(c.amenities).length === 22));
    const poor = cards.find((c) => c.property_slug === "gwarinpa-budget-room");
    assert.equal(poor.amenities.wifi.state, "paid"); assert.ok(!poor.included_keys.includes("wifi"));
  });
}

console.log(`\n${passed} checks passed${process.exitCode ? ", some FAILED" : ""}`);
