import { test } from "node:test";
import assert from "node:assert/strict";
import { AMENITIES, AMENITY_COUNT, AMENITY_GROUPS, describeAmenity, glanceFor, missingAmenities, amenityByKey } from "../src/amenities.ts";

test("22 amenities, every one in a known group, unique keys", () => {
  assert.equal(AMENITY_COUNT, 22);
  assert.equal(new Set(AMENITIES.map((a) => a.key)).size, 22);
  const groups = new Set(AMENITY_GROUPS.map((g) => g.key));
  assert.ok(AMENITIES.every((a) => groups.has(a.group)));
});
test("nothing is left to guess: missing list shrinks to zero", () => {
  const map: Record<string, any> = {};
  assert.equal(missingAmenities(map).length, 22);
  for (const a of AMENITIES) map[a.key] = { amenity_key: a.key, state: "included" };
  assert.equal(missingAmenities(map).length, 0);
});
test("describe: included spec, paid cost, not offered, missing", () => {
  assert.deepEqual(describeAmenity(amenityByKey.wifi, { amenity_key: "wifi", state: "included", spec_value: 40 }), { state: "included", text: "Included", detail: "40 Mbps tested" });
  assert.equal(describeAmenity(amenityByKey.washing_machine, { amenity_key: "washing_machine", state: "paid", extra_cost_ngn: 3000 }).detail, "₦3,000");
  assert.equal(describeAmenity(amenityByKey.pets, { amenity_key: "pets", state: "not_offered" }).text, "Not offered");
  assert.equal(describeAmenity(amenityByKey.pets, undefined).state, "missing");
});
test("glance tiles always say something plain", () => {
  const g = glanceFor({
    grid_power: { amenity_key: "grid_power", state: "included", spec_value: 20 }, backup_power: { amenity_key: "backup_power", state: "included" },
    running_water: { amenity_key: "running_water", state: "included", note: "Borehole" }, hot_water: { amenity_key: "hot_water", state: "included" },
    wifi: { amenity_key: "wifi", state: "included", spec_value: 40 }, gate: { amenity_key: "gate", state: "included" }, guard: { amenity_key: "guard", state: "included" }, cctv: { amenity_key: "cctv", state: "not_offered" },
  });
  assert.deepEqual(g.map((x) => x.value), ["Grid 20 h + backup", "Borehole, hot water", "40 Mbps tested", "Gate, Guard"]);
  assert.equal(glanceFor({}).every((x) => x.value.length > 0), true);
});
