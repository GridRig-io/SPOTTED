import type { AmenityMap } from "@spotted/tokens";

export type RoomKind = "whole_flat" | "master_room" | "guest_room" | "studio";
export type PropertyKind = "entire_flat" | "guest_house" | "room_in_home" | "hotel_apartment";
export type BookingStatus = "pending_payment" | "confirmed" | "cancelled" | "completed" | "expired";
export type PaymentProviderName = "paystack" | "flutterwave" | "test";

export interface Photo { url: string | null; scene: string | null; caption: string | null }

/** One row of v_room_cards: everything a result card or listing header needs. */
export interface RoomCard {
  room_id: string;
  property_id: string;
  room_name: string;
  room_kind: RoomKind;
  price_per_night: number;
  cleaning_fee: number;
  max_guests: number;
  beds: number;
  bathrooms: number;
  min_nights: number;
  max_nights: number;
  property_name: string;
  property_slug: string;
  property_kind: PropertyKind;
  area_hint: string | null;
  lat: number | null;
  lng: number | null;
  rating_avg: number;
  rating_count: number;
  subdomain: string | null;
  area_id: number;
  area_slug: string;
  area_name: string;
  rooms_in_property: number;
  photo_count: number;
  photos: Photo[];
  included_keys: string[];
  amenities: AmenityMap;
}

export interface Area { id: number; slug: string; name: string; lat: number; lng: number }

export interface UnclaimedPlace { id: string; name: string; slug: string; kind: PropertyKind; area_hint: string | null; lat: number | null; lng: number | null; area_slug: string; area_name: string }

export interface Quote {
  room_id: string; check_in: string; check_out: string; nights: number; guests: number;
  nightly_ngn: number; subtotal_ngn: number; cleaning_fee_ngn: number; service_fee_ngn: number; total_ngn: number; commission_ngn: number;
  available: boolean;
}

export interface Booking {
  id: string; code: string; room_id: string; property_id: string; guest_id: string;
  check_in: string; check_out: string; nights: number; guests: number;
  nightly_ngn: number; subtotal_ngn: number; cleaning_fee_ngn: number; service_fee_ngn: number; total_ngn: number;
  status: BookingStatus; expires_at: string | null; created_at: string;
}

export interface BookingWithPlace extends Booking {
  room: { name: string; kind: RoomKind } | null;
  property: { name: string; slug: string; area_hint: string | null; check_in_from: string; check_out_by: string; area: { name: string } | null } | null;
}

export interface PrivateDetails { street_address: string | null; gate_instructions: string | null; wifi_name: string | null; wifi_password: string | null; host_phone: string | null }

export interface Review { id: string; property_id: string; room_id: string; rating: number; comment: string | null; created_at: string; guest_first_name: string }

export interface Profile { id: string; full_name: string | null; phone: string | null; avatar_url: string | null; role: "guest" | "owner" | "admin" }

export interface PropertyDetail {
  id: string; name: string; slug: string; kind: PropertyKind; description: string; house_rules: string;
  area_hint: string | null; lat: number | null; lng: number | null; status: string;
  check_in_from: string; check_out_by: string; rating_avg: number; rating_count: number; subdomain: string | null;
  area: { name: string; slug: string } | null;
}

export interface BlockedRange { check_in: string; check_out: string }

export interface RoomAmenityRow {
  room_id: string; amenity_key: string; group_key: string; label: string; icon: string; scope: "shared" | "room"; sort: number;
  state: "included" | "paid" | "not_offered" | null; spec_value: number | null; note: string | null; extra_cost_ngn: number | null;
  evidence: "declared" | "checked" | "guests" | null;
}
