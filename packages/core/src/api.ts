import type { Db } from "./client";
import { filtersToRpc, type SearchFilters } from "./filters";
import type {
  Area, BlockedRange, Booking, BookingWithPlace, Photo, PrivateDetails, Profile, PropertyDetail, Quote, RoomAmenityRow, RoomCard, Review, UnclaimedPlace,
} from "./types";

/** Turn a Supabase/Postgres error into a sentence a guest can read. */
export class SpottedError extends Error {
  code?: string;
  constructor(message: string, code?: string) { super(message); this.name = "SpottedError"; this.code = code; }
}

function fail(error: { message: string; code?: string } | null): never {
  const m = error?.message ?? "Something went wrong";
  if (/permission denied|row-level security/i.test(m)) throw new SpottedError("You do not have access to that.", error?.code);
  if (/Failed to fetch|Network request failed|fetch failed/i.test(m)) throw new SpottedError("No connection. Check your internet and try again.", "network");
  throw new SpottedError(m, error?.code);
}

async function rpc<T>(db: Db, fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.rpc(fn, args);
  if (error) fail(error);
  return data as T;
}

// ───────── browse ─────────
export async function listAreas(db: Db): Promise<Area[]> {
  const { data, error } = await db.from("areas").select("id, slug, name, lat, lng").order("name");
  if (error) fail(error);
  return (data ?? []) as Area[];
}

export async function searchRooms(db: Db, filters: SearchFilters = {}, page = 0, pageSize = 24): Promise<RoomCard[]> {
  return (await rpc<RoomCard[]>(db, "search_rooms", filtersToRpc(filters, page, pageSize))) ?? [];
}

export async function getRoomCard(db: Db, roomId: string): Promise<RoomCard | null> {
  const { data, error } = await db.from("v_room_cards").select("*").eq("room_id", roomId).maybeSingle();
  if (error) fail(error);
  return (data as RoomCard) ?? null;
}

/** All published rooms of one place, cheapest first. */
export async function getRoomsOfProperty(db: Db, propertyId: string): Promise<RoomCard[]> {
  const { data, error } = await db.from("v_room_cards").select("*").eq("property_id", propertyId).order("price_per_night");
  if (error) fail(error);
  return (data ?? []) as RoomCard[];
}

export async function getProperty(db: Db, idOrSlug: string): Promise<PropertyDetail | null> {
  const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(idOrSlug);
  const sel = "id, name, slug, kind, description, house_rules, area_hint, lat, lng, status, check_in_from, check_out_by, rating_avg, rating_count, subdomain, area:areas(name, slug)";
  const { data, error } = await db.from("properties").select(sel).eq(isId ? "id" : "slug", idOrSlug).maybeSingle();
  if (error) fail(error);
  return (data as unknown as PropertyDetail) ?? null;
}

export async function listUnclaimed(db: Db, areaSlug?: string): Promise<UnclaimedPlace[]> {
  let q = db.from("v_unclaimed_places").select("*");
  if (areaSlug) q = q.eq("area_slug", areaSlug);
  const { data, error } = await q.order("name");
  if (error) fail(error);
  return (data ?? []) as UnclaimedPlace[];
}

/** Every photo of a room, in order. */
export async function getRoomPhotos(db: Db, roomId: string): Promise<Photo[]> {
  const { data, error } = await db.from("room_photos").select("url, scene, caption").eq("room_id", roomId).order("position");
  if (error) fail(error);
  return (data ?? []) as Photo[];
}

/** All 22 amenities for a room, with the answer for each (shared and room-level merged). */
export async function getRoomAmenities(db: Db, roomId: string): Promise<RoomAmenityRow[]> {
  const { data, error } = await db.from("v_room_amenities").select("*").eq("room_id", roomId).order("sort");
  if (error) fail(error);
  return (data ?? []) as RoomAmenityRow[];
}

export async function getReviews(db: Db, propertyId: string, limit = 10): Promise<Review[]> {
  const { data, error } = await db.from("v_reviews").select("*").eq("property_id", propertyId).order("created_at", { ascending: false }).limit(limit);
  if (error) fail(error);
  return (data ?? []) as Review[];
}

export async function getBlockedRanges(db: Db, roomId: string): Promise<BlockedRange[]> {
  return (await rpc<BlockedRange[]>(db, "room_blocked_ranges", { p_room_id: roomId })) ?? [];
}

// ───────── booking ─────────
export async function quoteStay(db: Db, roomId: string, checkIn: string, checkOut: string, guests: number): Promise<Quote> {
  return rpc<Quote>(db, "quote_stay", { p_room_id: roomId, p_check_in: checkIn, p_check_out: checkOut, p_guests: guests });
}

export async function createBooking(db: Db, roomId: string, checkIn: string, checkOut: string, guests: number): Promise<Booking> {
  return rpc<Booking>(db, "create_booking", { p_room_id: roomId, p_check_in: checkIn, p_check_out: checkOut, p_guests: guests });
}

export async function cancelBooking(db: Db, code: string): Promise<Booking> {
  return rpc<Booking>(db, "cancel_booking", { p_code: code });
}

const BOOKING_SELECT =
  "*, room:rooms(name, kind), property:properties(name, slug, area_hint, check_in_from, check_out_by, area:areas(name))";

export async function myBookings(db: Db): Promise<BookingWithPlace[]> {
  const { data, error } = await db.from("bookings").select(BOOKING_SELECT).order("check_in", { ascending: false });
  if (error) fail(error);
  return (data ?? []) as unknown as BookingWithPlace[];
}

export async function getBooking(db: Db, code: string): Promise<BookingWithPlace | null> {
  const { data, error } = await db.from("bookings").select(BOOKING_SELECT).eq("code", code).maybeSingle();
  if (error) fail(error);
  return (data as unknown as BookingWithPlace) ?? null;
}

/** Address, gate instructions and wifi. The database only returns this to the owner and to a confirmed guest during their stay. */
export async function getPrivateDetails(db: Db, propertyId: string): Promise<PrivateDetails | null> {
  const { data, error } = await db.from("property_private").select("*").eq("property_id", propertyId).maybeSingle();
  if (error) fail(error);
  return (data as PrivateDetails) ?? null;
}

// ───────── saved ─────────
export async function savedIds(db: Db): Promise<string[]> {
  const { data, error } = await db.from("saved_places").select("property_id");
  if (error) fail(error);
  return (data ?? []).map((r: { property_id: string }) => r.property_id);
}

export async function savedRooms(db: Db): Promise<RoomCard[]> {
  const ids = await savedIds(db);
  if (!ids.length) return [];
  const { data, error } = await db.from("v_room_cards").select("*").in("property_id", ids).order("price_per_night");
  if (error) fail(error);
  // one card per property: the cheapest room
  const seen = new Set<string>();
  return ((data ?? []) as RoomCard[]).filter((c) => (seen.has(c.property_id) ? false : (seen.add(c.property_id), true)));
}

export async function setSaved(db: Db, propertyId: string, saved: boolean): Promise<void> {
  const { data: u } = await db.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new SpottedError("Sign in to save places.", "auth");
  const { error } = saved
    ? await db.from("saved_places").upsert({ user_id: uid, property_id: propertyId }, { onConflict: "user_id,property_id" })
    : await db.from("saved_places").delete().eq("user_id", uid).eq("property_id", propertyId);
  if (error) fail(error);
}

// ───────── account ─────────
export async function getMyProfile(db: Db): Promise<Profile | null> {
  const { data: u } = await db.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await db.from("profiles").select("id, full_name, phone, avatar_url, role").eq("id", u.user.id).maybeSingle();
  if (error) fail(error);
  return (data as Profile) ?? null;
}

export async function updateMyProfile(db: Db, patch: { full_name?: string; phone?: string }): Promise<void> {
  const { data: u } = await db.auth.getUser();
  if (!u.user) throw new SpottedError("Sign in first.", "auth");
  const { error } = await db.from("profiles").update(patch).eq("id", u.user.id);
  if (error) fail(error);
}

export async function claimPlace(db: Db, propertyId: string, note: string): Promise<void> {
  const { data: u } = await db.auth.getUser();
  if (!u.user) throw new SpottedError("Sign in to claim a place.", "auth");
  const { error } = await db.from("claim_requests").insert({ property_id: propertyId, user_id: u.user.id, note });
  if (error) {
    if (error.code === "23505") throw new SpottedError("You already asked to claim this place.", error.code);
    fail(error);
  }
}

// ───────── sign in ─────────
export async function sendPhoneCode(db: Db, phone: string): Promise<void> {
  const { error } = await db.auth.signInWithOtp({ phone });
  if (error) fail(error);
}

export async function verifyPhoneCode(db: Db, phone: string, token: string): Promise<void> {
  const { error } = await db.auth.verifyOtp({ phone, token, type: "sms" });
  if (error) throw new SpottedError(/expired|invalid/i.test(error.message) ? "That code is wrong or has expired." : error.message, error.code);
}

export async function sendEmailCode(db: Db, email: string): Promise<void> {
  const { error } = await db.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) fail(error);
}

export async function verifyEmailCode(db: Db, email: string, token: string): Promise<void> {
  const { error } = await db.auth.verifyOtp({ email, token, type: "email" });
  if (error) throw new SpottedError(/expired|invalid/i.test(error.message) ? "That code is wrong or has expired." : error.message, error.code);
}
