/** ₦ 45,000 — whole naira, Nigerian grouping, never decimals. */
export function formatNaira(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "₦—";
  return "₦" + Math.round(n).toLocaleString("en-NG");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Parse "YYYY-MM-DD" as a calendar day (no timezone shifting). */
export function parseDay(s: string): { y: number; m: number; d: number } {
  const [y, m, d] = s.split("-").map(Number);
  return { y, m, d };
}

export function toDayString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today's date in Abuja (Africa/Lagos), as YYYY-MM-DD, whatever the device timezone is. */
export function todayInLagos(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return parts; // en-CA gives YYYY-MM-DD
}

export function addDays(day: string, n: number): string {
  const { y, m, d } = parseDay(day);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function nightsBetween(a: string, b: string): number {
  const A = parseDay(a), B = parseDay(b);
  return Math.round((Date.UTC(B.y, B.m - 1, B.d) - Date.UTC(A.y, A.m - 1, A.d)) / 864e5);
}

export function formatDay(day: string, withYear = false): string {
  const { y, m, d } = parseDay(day);
  return `${d} ${MONTHS[m - 1]}${withYear ? " " + y : ""}`;
}

/** "12 Dec to 15 Dec" or "28 Dec to 2 Jan". */
export function formatRange(a: string, b: string): string {
  return `${formatDay(a)} to ${formatDay(b)}`;
}

export function plural(n: number, one: string, many = one + "s"): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "pm" : "am";
  const hh = ((h + 11) % 12) + 1;
  return m ? `${hh}:${String(m).padStart(2, "0")}${ap}` : `${hh}${ap}`;
}

export const ROOM_KIND_LABEL: Record<string, string> = {
  whole_flat: "Whole flat", master_room: "Master room", guest_room: "Guest room", studio: "Studio",
};
export const PROPERTY_KIND_LABEL: Record<string, string> = {
  entire_flat: "Entire flat", guest_house: "Guest house", room_in_home: "Room in a home", hotel_apartment: "Apartment hotel",
};
