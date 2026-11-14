// Generates supabase/seed/demo.sql: sample Abuja places so the app and website have something to show.
// Everything is flagged is_demo = true. Remove it all later with:  delete from properties where is_demo;
// Names are invented. Pictures are illustrated stand-ins (scene ids) until real photos are uploaded.
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { AMENITIES } from "../../packages/tokens/src/amenities.ts";

const id = (s) => { const h = createHash("md5").update("spotted:" + s).digest("hex"); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`; };
const q = (v) => (v === null || v === undefined ? "null" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

const OWNERS = [
  ["Amaka Eze", "demo.host1@spotted.example"], ["Ibrahim Musa", "demo.host2@spotted.example"], ["Funke Adeyemi", "demo.host3@spotted.example"],
];

// Answer templates. Each is a map amenity -> [state, spec, note, cost]. Anything not listed is "included".
const base = Object.fromEntries(AMENITIES.map((a) => [a.key, ["included"]]));
const T = (o) => ({ ...base, ...o });
const NO = ["not_offered"];
const solid = T({ grid_power: ["included", 20, "Shared"], backup_power: ["included", null, "Inverter, runs about 12 hours"], running_water: ["included", null, "Borehole, always on"], hot_water: ["included", null, "Heater in bathroom"], wifi: ["included", 45, "Fibre"], guard: ["included", null, "24 hours"], cctv: ["included", null, "Entrance and compound"], washing_machine: ["paid", null, null, 3000], microwave: NO, lift: NO, parties: NO, pets: NO, smoking: NO, parking: ["included", 2, "Inside the gate"], tv: ["included", null, "Cable"], kitchen: ["included", null, "Full kitchen"] });
const budget = T({ grid_power: ["included", 14, "Shared"], backup_power: ["paid", null, "Generator, evenings", 5000], running_water: ["included", null, "Mains and tank"], hot_water: ["paid", null, "Kettle on request", 1000], wifi: ["paid", null, "Router in the room", 2000], work_desk: NO, guard: NO, cctv: NO, gate: ["included"], air_conditioning: NO, washing_machine: NO, microwave: NO, fridge: ["included"], lift: NO, parties: NO, pets: NO, smoking: NO, parking: ["included", 1, "Outside the gate"], tv: NO, kitchen: ["included", null, "Basic, shared"] });
const premium = T({ grid_power: ["included", 24, "Dedicated transformer"], backup_power: ["included", null, "Gas generator, automatic"], running_water: ["included", null, "Borehole with filter"], hot_water: ["included", null, "Central heater"], wifi: ["included", 120, "Dual fibre lines"], guard: ["included", null, "24 hours, two guards"], cctv: ["included", null, "Every entrance"], washing_machine: ["included"], parties: ["paid", null, "Small events only", 50000], pets: NO, smoking: NO, lift: ["included", null, "Second floor, lift available"], parking: ["included", 3, "Covered"], tv: ["included", null, "Cable and streaming"], kitchen: ["included", null, "Full kitchen"] });
const mixed = T({ grid_power: ["included", 18, "Shared"], backup_power: ["included", null, "Solar plus inverter"], running_water: ["included", null, "Borehole"], hot_water: ["included", null, "Heater"], wifi: ["included", 25, "Tested at noon"], guard: ["included", null, "Night guard"], cctv: NO, washing_machine: ["paid", null, null, 2500], microwave: ["included"], lift: NO, parties: NO, pets: ["paid", null, "Small dogs only", 5000], smoking: NO, parking: ["included", 2], tv: ["included", null, "Smart TV"], kitchen: ["included", null, "Full kitchen"] });

const PLACES = [
  { slug: "maitama-garden-flat", name: "Maitama Garden Flat", area: "maitama", kind: "entire_flat", hint: "Quiet street near Ahmadu Bello Way", owner: 0, t: premium, rating: [4.8, 31],
    desc: "A bright two-bedroom flat in a gated compound with a small garden. Steady power, fast wifi and a calm street make it a good base for work trips.",
    rooms: [["Whole flat", "whole_flat", 95000, 10000, 4, 2, 2, 2, ["living", "bedroom", "kitchen", "bathroom", "balcony"]], ["Master room", "master_room", 55000, 5000, 2, 1, 1, 1, ["bedroom", "bathroom", "living", "workspace", "balcony"]]] },
  { slug: "wuse2-studio-nook", name: "Wuse 2 Studio Nook", area: "wuse-2", kind: "hotel_apartment", hint: "Walking distance to Wuse 2 restaurants", owner: 1, t: solid, rating: [4.6, 54],
    desc: "A tidy studio on the second floor, built for short stays. Eat out, walk around, come back to a quiet room with cold AC.",
    rooms: [["Studio", "studio", 42000, 4000, 2, 1, 1, 1, ["bedroom", "kitchen", "bathroom", "workspace", "balcony"]]] },
  { slug: "garki-family-house", name: "Garki Family House", area: "garki", kind: "guest_house", hint: "Garki 2, close to the market", owner: 2, t: mixed, rating: [4.3, 19],
    desc: "A family house with three guest rooms and a shared sitting room. Friendly host, steady water, solar plus inverter for evenings.",
    rooms: [["Guest room A", "guest_room", 28000, 0, 2, 1, 1, 1, ["bedroom", "living", "bathroom", "kitchen", "compound"]], ["Guest room B", "guest_room", 26000, 0, 2, 1, 1, 1, ["bedroom", "bathroom", "living", "kitchen", "compound"]]] },
  { slug: "asokoro-quiet-suite", name: "Asokoro Quiet Suite", area: "asokoro", kind: "entire_flat", hint: "Inside a gated estate", owner: 0, t: premium, rating: [4.9, 22],
    desc: "A one-bedroom suite on a leafy estate street. Strong security, covered parking and a proper desk.",
    rooms: [["Whole suite", "whole_flat", 120000, 12000, 3, 1, 1, 2, ["living", "bedroom", "workspace", "bathroom", "balcony"]]] },
  { slug: "jabi-lake-view-flat", name: "Jabi Lake View Flat", area: "jabi", kind: "entire_flat", hint: "Five minutes from Jabi Lake", owner: 1, t: solid, rating: [4.5, 38],
    desc: "A two-bedroom flat with a balcony facing the lake road. Good for small groups who want their own kitchen.",
    rooms: [["Whole flat", "whole_flat", 75000, 8000, 5, 3, 2, 2, ["balcony", "living", "bedroom", "kitchen", "bathroom"]], ["Guest room", "guest_room", 32000, 0, 2, 1, 1, 1, ["bedroom", "bathroom", "living", "balcony", "workspace"]]] },
  { slug: "gwarinpa-budget-room", name: "Gwarinpa Budget Room", area: "gwarinpa", kind: "room_in_home", hint: "1st Avenue side", owner: 2, t: budget, rating: [4.0, 12],
    desc: "A plain, clean room in a family home. Fair price, honest answers: power is shared with the house and wifi costs extra.",
    rooms: [["Single room", "guest_room", 18000, 0, 2, 1, 1, 1, ["bedroom", "bathroom", "living", "compound", "kitchen"]]] },
  { slug: "utako-work-stay", name: "Utako Work Stay", area: "utako", kind: "hotel_apartment", hint: "Near Utako Market and Jabi Motor Park", owner: 1, t: solid, rating: [4.4, 27],
    desc: "A compact apartment with a real desk, strong wifi and a quiet bedroom. Built around work trips.",
    rooms: [["Apartment", "studio", 48000, 5000, 2, 1, 1, 1, ["workspace", "bedroom", "kitchen", "bathroom", "living"]]] },
  { slug: "lugbe-airport-lodge", name: "Lugbe Airport Lodge", area: "lugbe", kind: "guest_house", hint: "Airport road, 15 minutes to the terminal", owner: 2, t: budget, rating: [4.1, 16],
    desc: "A simple lodge for early flights. Gated, with water and a fan. Power is limited, so we say so up front.",
    rooms: [["Standard room", "guest_room", 22000, 0, 2, 1, 1, 1, ["bedroom", "bathroom", "compound", "building", "kitchen"]]] },
  { slug: "katampe-hillside-flat", name: "Katampe Hillside Flat", area: "katampe", kind: "entire_flat", hint: "Hillside, quiet at night", owner: 0, t: mixed, rating: [4.7, 9],
    desc: "A three-bedroom flat with a wide balcony and a view over the hills. Best for families and small groups.",
    rooms: [["Whole flat", "whole_flat", 85000, 8000, 6, 4, 3, 2, ["balcony", "living", "bedroom", "kitchen", "bathroom"]]] },
];
const UNCLAIMED = [
  ["old-gate-guest-house", "Old Gate Guest House", "wuse-2", "guest_house", "Off Adetokunbo Ademola Crescent"],
  ["sunrise-lodge-kubwa", "Sunrise Lodge", "kubwa", "guest_house", "Kubwa Express Road"],
  ["cedar-court-apo", "Cedar Court Apartments", "apo", "hotel_apartment", "Apo Legislative Quarters side"],
];

const out = [];
out.push(`-- Spotted · demo data (GENERATED by supabase/scripts/gen-demo.mjs). Optional. Everything here has is_demo = true.
-- Remove all of it later:   delete from properties where is_demo;   delete from auth.users where email like 'demo.host%@spotted.example';
`);
out.push(`insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values`);
out.push(OWNERS.map(([n, e], i) => `  (${q(id("owner" + i))}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${q(e)}, ${q(JSON.stringify({ full_name: n }))}::jsonb, now(), now())`).join(",\n") + "\non conflict (id) do nothing;");
out.push(`update profiles set role = 'owner' where id in (${OWNERS.map((_, i) => q(id("owner" + i))).join(", ")});\n`);

for (const p of PLACES) {
  const pid = id("prop:" + p.slug);
  out.push(`-- ${p.name}`);
  out.push(`insert into properties (id, owner_id, area_id, name, slug, kind, description, area_hint, status, is_demo, rating_avg, rating_count, published_at)
select ${q(pid)}, ${q(id("owner" + p.owner))}, a.id, ${q(p.name)}, ${q(p.slug)}, ${q(p.kind)}, ${q(p.desc)}, ${q(p.hint)}, 'published', true, ${p.rating[0]}, ${p.rating[1]}, now() from areas a where a.slug = ${q(p.area)} on conflict (id) do nothing;`);
  out.push(`insert into property_private (property_id, street_address, gate_instructions, wifi_name, wifi_password, host_phone) values (${q(pid)}, 'Demo address (hidden until booking)', 'Call the host from the gate', ${q(p.name.replace(/\W+/g, "") + "_WiFi")}, 'demo-password', '+2348000000000') on conflict do nothing;`);
  const sharedDone = new Set();
  for (const [ri, [rname, rkind, price, clean, maxg, beds, baths, minn, scenes]] of p.rooms.entries()) {
    const rid = id(`room:${p.slug}:${ri}`);
    out.push(`insert into rooms (id, property_id, name, kind, description, max_guests, beds, bathrooms, price_per_night, cleaning_fee, min_nights, status) values (${q(rid)}, ${q(pid)}, ${q(rname)}, ${q(rkind)}, ${q(p.desc)}, ${maxg}, ${beds}, ${baths}, ${price}, ${clean}, ${minn}, 'draft') on conflict (id) do nothing;`);
    scenes.forEach((s, k) => out.push(`insert into room_photos (id, property_id, room_id, scene, caption, position) values (${q(id(`photo:${rid}:${k}`))}, ${q(pid)}, ${q(rid)}, ${q(s)}, ${q(s[0].toUpperCase() + s.slice(1))}, ${k}) on conflict (id) do nothing;`));
    for (const a of AMENITIES) {
      if (a.scope === "shared" && sharedDone.has(a.key)) continue;
      if (a.scope === "shared") sharedDone.add(a.key);
      const [state, spec, note, cost] = p.t[a.key];
      out.push(`insert into amenity_answers (id, property_id, room_id, amenity_key, state, spec_value, note, extra_cost_ngn, evidence) values (${q(id(`ans:${p.slug}:${a.scope === "shared" ? "shared" : ri}:${a.key}`))}, ${q(pid)}, ${a.scope === "room" ? q(rid) : "null"}, ${q(a.key)}, ${q(state)}, ${q(spec ?? null)}, ${q(note ?? null)}, ${q(cost ?? null)}, ${q(["grid_power", "backup_power", "running_water", "hot_water", "gate", "guard", "cctv"].includes(a.key) ? "checked" : a.key === "wifi" ? "guests" : "declared")}) on conflict do nothing;`);
    }
    out.push(`update rooms set status = 'published' where id = ${q(rid)};`);
  }
  out.push("");
}
out.push("-- Places Spotted listed first. Visible, flagged, and not bookable until a host claims them.");
for (const [slug, name, area, kind, hint] of UNCLAIMED)
  out.push(`insert into properties (id, area_id, name, slug, kind, area_hint, status, is_demo) select ${q(id("prop:" + slug))}, a.id, ${q(name)}, ${q(slug)}, ${q(kind)}, ${q(hint)}, 'unclaimed', true from areas a where a.slug = ${q(area)} on conflict (id) do nothing;`);
writeFileSync(new URL("../seed/demo.sql", import.meta.url), out.join("\n") + "\n");
console.log("demo.sql:", PLACES.length, "places,", PLACES.reduce((n, p) => n + p.rooms.length, 0), "rooms");
