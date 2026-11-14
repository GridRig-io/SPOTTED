import type { RoomKind } from "./types";

export type SortKey = "recommended" | "price_asc" | "price_desc" | "newest";

export interface SearchFilters {
  area?: string;         // area slug
  q?: string;
  checkIn?: string;      // YYYY-MM-DD
  checkOut?: string;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];  // must be "included"
  kind?: RoomKind;
  sort?: SortKey;
}

export const SORT_LABEL: Record<SortKey, string> = {
  recommended: "Recommended", price_asc: "Price, low to high", price_desc: "Price, high to low", newest: "Newest",
};

const num = (v: string | null | undefined) => {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};
const day = (v: string | null | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

/** Same URL/query format on the website and in the app, so a search link opens the same results everywhere. */
export function filtersFromParams(get: (k: string) => string | null | undefined): SearchFilters {
  const sort = get("sort") as SortKey | null | undefined;
  const kind = get("kind") as RoomKind | null | undefined;
  const am = get("amenities");
  return {
    area: get("area") || undefined,
    q: get("q") || undefined,
    checkIn: day(get("in")),
    checkOut: day(get("out")),
    guests: num(get("guests")),
    minPrice: num(get("min")),
    maxPrice: num(get("max")),
    amenities: am ? am.split(",").filter(Boolean) : undefined,
    kind: kind && ["whole_flat", "master_room", "guest_room", "studio"].includes(kind) ? kind : undefined,
    sort: sort && sort in SORT_LABEL ? sort : undefined,
  };
}

export function filtersToParams(f: SearchFilters): Record<string, string> {
  const o: Record<string, string> = {};
  if (f.area) o.area = f.area;
  if (f.q) o.q = f.q;
  if (f.checkIn) o.in = f.checkIn;
  if (f.checkOut) o.out = f.checkOut;
  if (f.guests) o.guests = String(f.guests);
  if (f.minPrice) o.min = String(f.minPrice);
  if (f.maxPrice) o.max = String(f.maxPrice);
  if (f.amenities?.length) o.amenities = f.amenities.join(",");
  if (f.kind) o.kind = f.kind;
  if (f.sort && f.sort !== "recommended") o.sort = f.sort;
  return o;
}

export function toQueryString(f: SearchFilters): string {
  const p = filtersToParams(f);
  const s = Object.entries(p).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  return s ? `?${s}` : "";
}

/** Arguments for the search_rooms database function. */
export function filtersToRpc(f: SearchFilters, page = 0, pageSize = 24) {
  return {
    p_area: f.area ?? null,
    p_q: f.q ?? null,
    p_check_in: f.checkIn && f.checkOut ? f.checkIn : null,
    p_check_out: f.checkIn && f.checkOut ? f.checkOut : null,
    p_guests: f.guests ?? null,
    p_min: f.minPrice ?? null,
    p_max: f.maxPrice ?? null,
    p_amenities: f.amenities ?? [],
    p_kind: f.kind ?? null,
    p_sort: f.sort ?? "recommended",
    p_limit: pageSize,
    p_offset: page * pageSize,
  };
}

/** How many filters are active (for the badge on the Filters button). */
export function activeFilterCount(f: SearchFilters): number {
  return [f.minPrice || f.maxPrice, f.kind, f.guests, f.checkIn && f.checkOut, f.amenities?.length].filter(Boolean).length;
}

export const PRICE_PRESETS = [
  { label: "Under ₦30,000", max: 30000 },
  { label: "₦30,000 to ₦60,000", min: 30000, max: 60000 },
  { label: "₦60,000 to ₦100,000", min: 60000, max: 100000 },
  { label: "Over ₦100,000", min: 100000 },
] as const;
