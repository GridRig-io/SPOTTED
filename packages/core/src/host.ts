// Host (owner) side: registration, listing editor, photos, calendar blocks, bookings, and the Spotted review queue.
// Every write goes through row-level security; the database also refuses anything a host should not control.
import type { Db } from "./client";
import { SpottedError } from "./api";
import type { CancellationPolicy, PrivateDetails, Profile, PropertyKind, PropertyStatus, RoomKind } from "./types";
import type { AmenityState } from "@spotted/tokens";

function fail(error: { message: string; code?: string } | null): never {
  const m = error?.message ?? "Something went wrong";
  if (/permission denied|row-level security/i.test(m)) throw new SpottedError("You do not have access to that.", error?.code);
  if (/Failed to fetch|Network request failed|fetch failed/i.test(m)) throw new SpottedError("No connection. Check your internet and try again.", "network");
  if (/duplicate key.*slug/i.test(m)) throw new SpottedError("That listing name is taken. Try a slightly different one.", error?.code);
  throw new SpottedError(m, error?.code);
}

async function uid(db: Db): Promise<string> {
  const { data } = await db.auth.getUser();
  if (!data.user) throw new SpottedError("Sign in first.", "auth");
  return data.user.id;
}

/** A random id made on the device, so a new row can be saved and referred to straight away. */
export function newId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** "Lekki Nest" → "lekki-nest-k3f9". The short tail keeps names unique without asking the host. */
export function makeSlug(name: string): string {
  const base = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "place";
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

// ───────── registration ─────────
export async function becomeHost(db: Db, fullName: string, phone: string, businessName?: string): Promise<Profile> {
  const { data, error } = await db.rpc("become_host", { p_full_name: fullName, p_phone: phone, p_business_name: businessName ?? null });
  if (error) fail(error);
  return data as Profile;
}

// ───────── listings ─────────
export interface ListingSummary {
  id: string; name: string; slug: string; status: PropertyStatus; review_note: string | null; submitted_at: string | null;
  kind: PropertyKind; area_id: number; created_at: string;
}

export async function myListings(db: Db): Promise<ListingSummary[]> {
  const me = await uid(db);
  const { data, error } = await db.from("properties")
    .select("id, name, slug, status, review_note, submitted_at, kind, area_id, created_at")
    .eq("owner_id", me).order("created_at", { ascending: false });
  if (error) fail(error);
  return (data ?? []) as ListingSummary[];
}

export interface ListingDraft {
  id: string; name: string; kind: PropertyKind; area_id: number; area_hint: string; description: string; house_rules: string;
  check_in_from: string; check_out_by: string; cancellation_policy: CancellationPolicy;
}

export interface HostRoom {
  id: string; property_id: string; name: string; kind: RoomKind; description: string; max_guests: number; beds: number; bathrooms: number;
  price_per_night: number; cleaning_fee: number; min_nights: number; max_nights: number; status: "draft" | "published" | "hidden";
}

export interface HostPhoto { id: string; property_id: string; room_id: string | null; url: string | null; scene: string | null; position: number }

export interface HostAnswer {
  amenity_key: string; room_id: string | null; state: AmenityState; spec_value: number | null; note: string | null; extra_cost_ngn: number | null;
}

export interface HostBlock { id: string; room_id: string; property_id: string; start_date: string; end_date: string; note: string | null }

export interface ListingBundle {
  property: ListingDraft & { slug: string; status: PropertyStatus; review_note: string | null; owner_id: string };
  priv: PrivateDetails | null;
  rooms: HostRoom[];
  photos: HostPhoto[];
  answers: HostAnswer[];
  blocks: HostBlock[];
}

export async function getListing(db: Db, id: string): Promise<ListingBundle | null> {
  const { data: property, error } = await db.from("properties")
    .select("id, owner_id, name, slug, kind, area_id, area_hint, description, house_rules, check_in_from, check_out_by, cancellation_policy, status, review_note")
    .eq("id", id).maybeSingle();
  if (error) fail(error);
  if (!property) return null;
  const [priv, rooms, photos, answers, blocks] = await Promise.all([
    db.from("property_private").select("*").eq("property_id", id).maybeSingle(),
    db.from("rooms").select("id, property_id, name, kind, description, max_guests, beds, bathrooms, price_per_night, cleaning_fee, min_nights, max_nights, status").eq("property_id", id).order("created_at"),
    db.from("room_photos").select("id, property_id, room_id, url, scene, position").eq("property_id", id).order("position"),
    db.from("amenity_answers").select("amenity_key, room_id, state, spec_value, note, extra_cost_ngn").eq("property_id", id),
    db.from("room_blocks").select("id, room_id, property_id, start_date, end_date, note").eq("property_id", id).order("start_date"),
  ]);
  for (const r of [priv, rooms, photos, answers, blocks]) if (r.error) fail(r.error);
  return {
    property: property as ListingBundle["property"],
    priv: (priv.data as PrivateDetails) ?? null,
    rooms: (rooms.data ?? []) as HostRoom[],
    photos: (photos.data ?? []) as HostPhoto[],
    answers: (answers.data ?? []) as HostAnswer[],
    blocks: (blocks.data ?? []) as HostBlock[],
  };
}

/** Creates a draft listing and returns its id. */
export async function createListing(db: Db, d: Omit<ListingDraft, "id">): Promise<string> {
  const me = await uid(db);
  const id = newId();
  const { error } = await db.from("properties").insert({ id, owner_id: me, slug: makeSlug(d.name), status: "draft", ...d });
  if (error) fail(error);
  return id;
}

export async function updateListing(db: Db, id: string, patch: Partial<Omit<ListingDraft, "id">>): Promise<void> {
  const { error } = await db.from("properties").update(patch).eq("id", id);
  if (error) fail(error);
}

/** Address, wifi, exact pin and directions. Only the host, Spotted, and a confirmed guest in their stay window can read these. */
export async function savePrivate(db: Db, propertyId: string, p: Partial<PrivateDetails>): Promise<void> {
  const { data: existing, error: e1 } = await db.from("property_private").select("property_id").eq("property_id", propertyId).maybeSingle();
  if (e1) fail(e1);
  const { error } = existing
    ? await db.from("property_private").update(p).eq("property_id", propertyId)
    : await db.from("property_private").insert({ property_id: propertyId, ...p });
  if (error) fail(error);
}

export async function saveRoom(db: Db, room: Omit<HostRoom, "status"> & { status?: HostRoom["status"] }, isNew: boolean): Promise<void> {
  const { status: _ignored, ...fields } = room;
  void _ignored;
  const { error } = isNew
    ? await db.from("rooms").insert({ ...fields, status: "draft" })
    : await db.from("rooms").update(fields).eq("id", room.id);
  if (error) fail(error);
}

export async function deleteRoom(db: Db, roomId: string): Promise<void> {
  const { error } = await db.from("rooms").delete().eq("id", roomId);
  if (error) {
    if (/foreign key|violates/i.test(error.message)) throw new SpottedError("This room has bookings, so it cannot be deleted. Hide it instead.", error.code);
    fail(error);
  }
}

/** Replace every answer for one scope: shared answers (roomId null) or one room's answers. */
export async function saveAnswers(db: Db, propertyId: string, roomId: string | null, answers: HostAnswer[]): Promise<void> {
  const del = db.from("amenity_answers").delete().eq("property_id", propertyId);
  const { error: e1 } = roomId ? await del.eq("room_id", roomId) : await del.is("room_id", null);
  if (e1) fail(e1);
  if (!answers.length) return;
  const rows = answers.map((a) => ({
    property_id: propertyId, room_id: roomId, amenity_key: a.amenity_key, state: a.state,
    spec_value: a.state === "included" ? a.spec_value : null, note: a.note?.trim() || null,
    extra_cost_ngn: a.state === "paid" ? a.extra_cost_ngn : null,
  }));
  const { error } = await db.from("amenity_answers").insert(rows);
  if (error) fail(error);
}

// ───────── photos ─────────
export const PHOTO_BUCKET = "room-photos";
export const MIN_PHOTOS = 5;

/** Uploads one photo to storage and records it against a room. The image should already be resized on the device. */
export async function uploadRoomPhoto(db: Db, propertyId: string, roomId: string, body: Blob | ArrayBuffer, contentType: string, position: number): Promise<HostPhoto> {
  const me = await uid(db);
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const path = `${me}/${propertyId}/${newId()}.${ext}`;
  const up = await db.storage.from(PHOTO_BUCKET).upload(path, body, { contentType, upsert: false, cacheControl: "31536000" });
  if (up.error) throw new SpottedError(/size|large/i.test(up.error.message) ? "That photo is too large. Try a smaller one." : up.error.message);
  const url = db.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
  const row: HostPhoto = { id: newId(), property_id: propertyId, room_id: roomId, url, scene: null, position };
  const { error } = await db.from("room_photos").insert(row);
  if (error) fail(error);
  return row;
}

export async function deletePhoto(db: Db, photo: HostPhoto): Promise<void> {
  const { error } = await db.from("room_photos").delete().eq("id", photo.id);
  if (error) fail(error);
  const marker = `/${PHOTO_BUCKET}/`;
  if (photo.url && photo.url.includes(marker)) await db.storage.from(PHOTO_BUCKET).remove([photo.url.split(marker)[1]]);
}

/** Makes one photo the cover (first) and keeps the rest in order. */
export async function setCoverPhoto(db: Db, photos: HostPhoto[], coverId: string): Promise<HostPhoto[]> {
  const ordered = [...photos.filter((p) => p.id === coverId), ...photos.filter((p) => p.id !== coverId)].map((p, i) => ({ ...p, position: i }));
  for (const p of ordered) {
    const { error } = await db.from("room_photos").update({ position: p.position }).eq("id", p.id);
    if (error) fail(error);
  }
  return ordered;
}

// ───────── submit and review ─────────
export async function submitListing(db: Db, propertyId: string): Promise<void> {
  const { error } = await db.rpc("submit_property", { p_property_id: propertyId });
  if (error) fail(error);
}

export interface PendingListing { id: string; name: string; slug: string; status: PropertyStatus; submitted_at: string | null; area_id: number; owner_id: string }

export async function pendingListings(db: Db): Promise<PendingListing[]> {
  const { data, error } = await db.from("properties").select("id, name, slug, status, submitted_at, area_id, owner_id").eq("status", "pending_review").order("submitted_at");
  if (error) fail(error);
  return (data ?? []) as PendingListing[];
}

export async function reviewListing(db: Db, propertyId: string, approve: boolean, note?: string): Promise<void> {
  const { error } = await db.rpc("review_property", { p_property_id: propertyId, p_approve: approve, p_note: note ?? null });
  if (error) fail(error);
}

// ───────── calendar ─────────
export async function addBlock(db: Db, b: Omit<HostBlock, "id">): Promise<HostBlock> {
  const row = { id: newId(), ...b, note: b.note?.trim() || null };
  const { error } = await db.from("room_blocks").insert(row);
  if (error) fail(error);
  return row;
}

export async function deleteBlock(db: Db, id: string): Promise<void> {
  const { error } = await db.from("room_blocks").delete().eq("id", id);
  if (error) fail(error);
}

// ───────── bookings ─────────
export interface HostBooking {
  id: string; code: string; property_id: string; property_name: string; room_id: string; room_name: string;
  check_in: string; check_out: string; nights: number; guests: number; total_ngn: number;
  status: "pending_payment" | "confirmed" | "completed" | "cancelled"; guest_first_name: string; guest_phone: string | null; created_at: string;
}

export async function hostBookings(db: Db): Promise<HostBooking[]> {
  const { data, error } = await db.rpc("host_bookings");
  if (error) fail(error);
  return (data ?? []) as HostBooking[];
}

/** What is still missing before a listing can be submitted. Mirrors submit_property and the room publish gate. */
export function listingChecklist(b: ListingBundle, amenityCount: number, sharedKeys: string[]): { key: string; label: string; done: boolean }[] {
  const shared = b.answers.filter((a) => a.room_id === null).length;
  const roomsReady = b.rooms.length > 0 && b.rooms.every((r) => {
    const photos = b.photos.filter((p) => p.room_id === r.id && p.url).length;
    const own = b.answers.filter((a) => a.room_id === r.id).length;
    return photos >= MIN_PHOTOS && own + shared >= amenityCount;
  });
  return [
    { key: "details", label: "Name, area and a short description", done: Boolean(b.property.name && b.property.description.trim().length >= 40) },
    { key: "location", label: "Exact location pin and street address", done: Boolean(b.priv?.lat && b.priv?.lng && b.priv?.street_address?.trim()) },
    { key: "phone", label: "A phone number guests can call after booking", done: Boolean(b.priv?.host_phone?.trim()) },
    { key: "rooms", label: "At least one room with a price", done: b.rooms.length > 0 },
    { key: "shared", label: `The ${sharedKeys.length} whole-place questions (power, water, wifi, security…)`, done: shared >= sharedKeys.length },
    { key: "roomsReady", label: `Every room: ${MIN_PHOTOS}+ photos and its own questions answered`, done: roomsReady },
  ];
}
