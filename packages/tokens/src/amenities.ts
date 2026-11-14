// The amenity standard: 22 fixed items, 3 states, no grey areas.
// A room cannot be published until every item has an answer. Same list drives the database seed, the web and the app.

export type AmenityState = "included" | "paid" | "not_offered";
export type Evidence = "declared" | "checked" | "guests";
export type AmenityScope = "shared" | "room"; // shared = whole property, room = this room only
export type SpecKind = "hours" | "mbps" | "count" | "text" | null;

export interface AmenityDef {
  key: string;
  group: GroupKey;
  label: string;
  icon: string; // Lucide icon name (kebab-case)
  scope: AmenityScope;
  spec: SpecKind;
  specLabel?: string;
  /** Short line shown when included and no owner note is given */
  hint?: string;
  /** Filter chip label on search */
  filterLabel?: string;
  /** Important enough to be "must have" in filters */
  filterable: boolean;
}

export type GroupKey = "power" | "water" | "internet" | "security" | "comfort" | "kitchen" | "rules";

export interface AmenityGroup {
  key: GroupKey;
  label: string;
  icon: string;
  evidence: Evidence; // typical evidence level for the group
}

export const AMENITY_GROUPS: AmenityGroup[] = [
  { key: "power", label: "Power", icon: "zap", evidence: "checked" },
  { key: "water", label: "Water", icon: "droplets", evidence: "checked" },
  { key: "internet", label: "Internet", icon: "wifi", evidence: "guests" },
  { key: "security", label: "Security", icon: "shield-check", evidence: "checked" },
  { key: "comfort", label: "Comfort", icon: "snowflake", evidence: "declared" },
  { key: "kitchen", label: "Kitchen", icon: "utensils", evidence: "declared" },
  { key: "rules", label: "Access and rules", icon: "key-round", evidence: "declared" },
];

export const AMENITIES: AmenityDef[] = [
  { key: "grid_power", group: "power", label: "Grid power", icon: "zap", scope: "shared", spec: "hours", specLabel: "Hours of grid power a day", filterable: true, filterLabel: "Grid 18h+" },
  { key: "backup_power", group: "power", label: "Backup power", icon: "battery-charging", scope: "shared", spec: "text", specLabel: "Type and how long it runs", filterable: true, filterLabel: "Backup power" },
  { key: "running_water", group: "water", label: "Running water", icon: "droplets", scope: "shared", spec: "text", specLabel: "Source (borehole, mains, tank)", filterable: true, filterLabel: "Running water" },
  { key: "hot_water", group: "water", label: "Hot water", icon: "thermometer-sun", scope: "room", spec: "text", specLabel: "How (heater, kettle, gas)", filterable: true, filterLabel: "Hot water" },
  { key: "wifi", group: "internet", label: "Wifi", icon: "wifi", scope: "shared", spec: "mbps", specLabel: "Tested speed in Mbps", filterable: true, filterLabel: "Wifi" },
  { key: "work_desk", group: "internet", label: "Work desk", icon: "briefcase", scope: "room", spec: null, filterable: true, filterLabel: "Work desk" },
  { key: "gate", group: "security", label: "Gate", icon: "door-closed", scope: "shared", spec: null, filterable: true, filterLabel: "Gated" },
  { key: "guard", group: "security", label: "Guard", icon: "shield-check", scope: "shared", spec: "text", specLabel: "Hours (for example 24 hours)", filterable: true, filterLabel: "Guard" },
  { key: "cctv", group: "security", label: "CCTV", icon: "cctv", scope: "shared", spec: "text", specLabel: "Where cameras cover", filterable: true, filterLabel: "CCTV" },
  { key: "air_conditioning", group: "comfort", label: "Air conditioning", icon: "snowflake", scope: "room", spec: null, filterable: true, filterLabel: "AC" },
  { key: "fan", group: "comfort", label: "Fan", icon: "fan", scope: "room", spec: null, filterable: false },
  { key: "tv", group: "comfort", label: "TV", icon: "tv", scope: "room", spec: "text", specLabel: "Cable or streaming", filterable: false },
  { key: "washing_machine", group: "comfort", label: "Washing machine", icon: "washing-machine", scope: "shared", spec: null, filterable: false },
  { key: "kitchen", group: "kitchen", label: "Kitchen", icon: "utensils", scope: "shared", spec: "text", specLabel: "Full or basic", filterable: true, filterLabel: "Kitchen" },
  { key: "fridge", group: "kitchen", label: "Fridge", icon: "refrigerator", scope: "shared", spec: null, filterable: false },
  { key: "gas_cooker", group: "kitchen", label: "Gas cooker", icon: "flame", scope: "shared", spec: null, filterable: false },
  { key: "microwave", group: "kitchen", label: "Microwave", icon: "microwave", scope: "shared", spec: null, filterable: false },
  { key: "parking", group: "rules", label: "Parking", icon: "car", scope: "shared", spec: "count", specLabel: "Number of cars", filterable: true, filterLabel: "Parking" },
  { key: "lift", group: "rules", label: "Lift", icon: "arrow-up-down", scope: "shared", spec: "text", specLabel: "Floor and stairs note", filterable: false },
  { key: "parties", group: "rules", label: "Parties and events", icon: "party-popper", scope: "shared", spec: null, filterable: true, filterLabel: "Parties allowed" },
  { key: "pets", group: "rules", label: "Pets", icon: "paw-print", scope: "shared", spec: null, filterable: true, filterLabel: "Pets allowed" },
  { key: "smoking", group: "rules", label: "Smoking", icon: "cigarette-off", scope: "shared", spec: null, filterable: false },
];

export const AMENITY_COUNT = AMENITIES.length; // 22
export const amenityByKey = Object.fromEntries(AMENITIES.map((a) => [a.key, a])) as Record<string, AmenityDef>;
export const amenitiesInGroup = (g: GroupKey) => AMENITIES.filter((a) => a.group === g);

export const STATE_LABEL: Record<AmenityState, string> = {
  included: "Included",
  paid: "Extra cost",
  not_offered: "Not offered",
};
export const EVIDENCE_LABEL: Record<Evidence, string> = {
  declared: "Declared by host",
  checked: "Checked by Spotted",
  guests: "Confirmed by guests",
};

/** The four "at a glance" tiles every listing shows first: the things Abuja guests ask about most. */
export const GLANCE = [
  { key: "power", label: "Power", icon: "zap" },
  { key: "water", label: "Water", icon: "droplets" },
  { key: "wifi", label: "Wifi", icon: "wifi" },
  { key: "security", label: "Security", icon: "shield-check" },
] as const;

export interface AmenityAnswer {
  amenity_key: string;
  state: AmenityState;
  spec_value?: number | null;
  note?: string | null;
  extra_cost_ngn?: number | null;
}

export type AmenityMap = Record<string, AmenityAnswer>;

const nz = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

/** One plain line for an amenity row, e.g. "Included · 40 Mbps tested" or "Extra cost · ₦3,000". */
export function describeAmenity(def: AmenityDef, a: AmenityAnswer | undefined): { state: AmenityState | "missing"; text: string; detail: string | null } {
  if (!a) return { state: "missing", text: "Not answered", detail: null };
  let detail: string | null = nz(a.note);
  if (a.state === "included") {
    if (def.spec === "mbps" && a.spec_value) detail = `${a.spec_value} Mbps tested${detail ? ` · ${detail}` : ""}`;
    else if (def.spec === "hours" && a.spec_value) detail = `${a.spec_value} hours a day${detail ? ` · ${detail}` : ""}`;
    else if (def.spec === "count" && a.spec_value) detail = `${a.spec_value} ${a.spec_value === 1 ? "car" : "cars"}${detail ? ` · ${detail}` : ""}`;
  }
  if (a.state === "paid" && a.extra_cost_ngn) {
    detail = `₦${a.extra_cost_ngn.toLocaleString("en-NG")}${detail ? ` · ${detail}` : ""}`;
  }
  return { state: a.state, text: STATE_LABEL[a.state], detail };
}

/** The 4 glance tiles for a listing's amenity answers. Always returns a value, never blank. */
export function glanceFor(map: AmenityMap): { key: string; label: string; icon: string; value: string }[] {
  const g = (k: string) => map[k];
  const inc = (k: string) => g(k)?.state === "included";
  const power = inc("grid_power")
    ? `Grid${g("grid_power")?.spec_value ? ` ${g("grid_power")!.spec_value} h` : ""}${inc("backup_power") ? " + backup" : ""}`
    : inc("backup_power") ? "Backup power only" : "No reliable power listed";
  const water = inc("running_water")
    ? `${nz(g("running_water")?.note) ?? "Running water"}${inc("hot_water") ? ", hot water" : ""}`
    : "No running water";
  const wifi = inc("wifi") ? (g("wifi")?.spec_value ? `${g("wifi")!.spec_value} Mbps tested` : "Included") : g("wifi")?.state === "paid" ? "Extra cost" : "No wifi";
  const sec = [inc("gate") && "Gate", inc("guard") && "Guard", inc("cctv") && "CCTV"].filter(Boolean).join(", ");
  return [
    { key: "power", label: "Power", icon: "zap", value: power },
    { key: "water", label: "Water", icon: "droplets", value: water },
    { key: "wifi", label: "Wifi", icon: "wifi", value: wifi },
    { key: "security", label: "Security", icon: "shield-check", value: sec || "No gate, guard or CCTV" },
  ];
}

/** Which amenity keys are still unanswered. Publishing is blocked until this is empty. */
export function missingAmenities(map: AmenityMap): string[] {
  return AMENITIES.filter((a) => !map[a.key]).map((a) => a.key);
}
