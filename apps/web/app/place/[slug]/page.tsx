import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  getBlockedRanges, getProperty, getPropertyHost, getReviews, getRoomAmenities, getRoomPhotos, getRoomsOfProperty, PROPERTY_KIND_LABEL, ROOM_KIND_LABEL,
  POLICIES, formatTime, plural,
} from "@spotted/core";
import { AmenityDetails, AmenityExceptions, GlanceTiles } from "@/components/AmenityList";
import { Gallery } from "@/components/Gallery";
import { MapView } from "@/components/MapView";
import { ShareButton } from "@/components/ShareButton";
import { BookingBox } from "@/components/BookingBox";
import { Empty, ErrorNote, SetupNotice } from "@/components/Bits";
import { Icon } from "@/components/Icon";
import { SaveButton } from "@/components/SaveButton";
import { ClaimBox } from "@/components/ClaimBox";
import { hasSupabase } from "@/lib/env";
import { publicDb } from "@/lib/supabase-server";

export async function generateMetadata({ params }: PageProps<"/place/[slug]">): Promise<Metadata> {
  if (!hasSupabase) return { title: "Place" };
  try {
    const { slug } = await params;
    const p = await getProperty(publicDb(), slug);
    return p ? { title: p.name, description: `${p.name} in ${p.area?.name ?? "Abuja"}. Power, water, wifi and security stated before you book.` } : { title: "Place not found" };
  } catch { return { title: "Place" }; }
}

export default function PlacePage({ params, searchParams }: PageProps<"/place/[slug]">) {
  return hasSupabase
    ? <Suspense fallback={<div className="container section"><div className="skeleton" style={{ height: 420 }} /></div>}><PlaceContent params={params} searchParams={searchParams} /></Suspense>
    : <SetupNotice />;
}

async function loadPlace(slug: string, wanted: string | undefined) {
  try {
    const db = publicDb();
    const property = await getProperty(db, slug);
    if (!property) return { kind: "missing" as const };
    if (property.status === "unclaimed") return { kind: "unclaimed" as const, property };
    const rooms = await getRoomsOfProperty(db, property.id);
    if (!rooms.length) return { kind: "norooms" as const };
    const room = rooms.find((r) => r.room_id === wanted) ?? rooms.find((r) => r.room_kind === "whole_flat") ?? rooms[0];
    const [photos, amenityRows, reviews, blocked, host] = await Promise.all([
      getRoomPhotos(db, room.room_id), getRoomAmenities(db, room.room_id), getReviews(db, property.id, 6), getBlockedRanges(db, room.room_id),
      getPropertyHost(db, property.id).catch(() => null),
    ]);
    return { kind: "ok" as const, property, rooms, room, photos, amenityRows, reviews, blocked, host };
  } catch (e) {
    return { kind: "error" as const, message: e instanceof Error ? e.message : "Please try again." };
  }
}

async function PlaceContent({ params, searchParams }: { params: PageProps<"/place/[slug]">["params"]; searchParams: PageProps<"/place/[slug]">["searchParams"] }) {
  const { slug } = await params;
  const sp = await searchParams;
  const one = (k: string) => { const v = sp[k]; return Array.isArray(v) ? v[0] : v; };
  const r = await loadPlace(slug, one("room"));
  if (r.kind === "missing") notFound();
  if (r.kind === "error") return <ErrorNote message={r.message} />;
  if (r.kind === "norooms") return <div className="container section"><Empty icon="bed" title="No rooms are open right now">This place has no rooms available to book at the moment.</Empty></div>;
  if (r.kind === "unclaimed") {
    const { property } = r;
    return (
      <div className="container section stack gap-6" style={{ maxWidth: 760 }}>
        <Link href="/search" className="row gap-1 muted small"><Icon name="chevron-left" size={16} /> Back to search</Link>
        <span className="badge badge-warn" style={{ alignSelf: "flex-start" }}>Not claimed yet</span>
        <h1>{property.name}</h1>
        <p className="muted">{PROPERTY_KIND_LABEL[property.kind]} · {property.area?.name}{property.area_hint ? ` · ${property.area_hint}` : ""}</p>
        <div className="notice">Nobody has claimed this place on Spotted, so we have no verified photos or amenities and it cannot be booked here. If you own or manage it, claim it and guests can start booking.</div>
        <ClaimBox propertyId={property.id} />
      </div>
    );
  }
  const { property, rooms, room, photos, amenityRows, reviews, blocked, host } = r;
  const keep = new URLSearchParams(); for (const k of ["in", "out", "guests"]) { const v = one(k); if (v) keep.set(k, v); }
  const roomHref = (id: string) => `/place/${property.slug}?${new URLSearchParams({ room: id, ...Object.fromEntries(keep) })}`;
  const where = `${property.area?.name ?? ""}${property.area_hint ? `, ${property.area_hint}` : ""}`;
  const stateName = property.area?.state?.short_name;
  const policy = POLICIES[property.cancellation_policy ?? "moderate"];
  const since = host ? new Date(host.host_since).getFullYear() : null;

  return (
    <div className="container section stack gap-6 place">
      <div className="stack gap-2">
        <Link href={`/search?state=${property.area?.state?.slug ?? ""}`} className="row gap-1 muted small"><Icon name="chevron-left" size={16} /> Back to {stateName ?? "search"}</Link>
        <div className="row between wrap gap-3" style={{ alignItems: "flex-end" }}>
          <div className="stack gap-2">
            <h1>{property.name}</h1>
            <p className="muted small place-meta">
              <span>{PROPERTY_KIND_LABEL[property.kind]}</span>
              {property.rating_count > 0 ? <span className="row gap-1 bold" style={{ color: "var(--c-ink)" }}><Icon name="star" size={14} fill="var(--c-gold)" color="var(--c-gold)" /> {Number(property.rating_avg).toFixed(1)} ({property.rating_count})</span> : <span className="badge">New</span>}
              <span className="row gap-1 place-where"><Icon name="map-pin" size={14} /> {where}{stateName ? ` · ${stateName}` : ""}</span>
            </p>
          </div>
          <div className="row gap-2"><ShareButton title={property.name} text={`${property.name} on Spotted`} /><SaveButton propertyId={property.id} className="btn btn-quiet btn-sm" label /></div>
        </div>
      </div>

      <Gallery photos={photos} seed={room.room_id} name={`${property.name}, ${room.room_name}`} />

      {rooms.length > 1 ? (
        <div className="stack gap-2" aria-label="Choose a room">
          <span className="eyebrow">{plural(rooms.length, "room")} at this place</span>
          <div className="hscroll">
            {[...rooms].sort((a, b) => Number(b.room_kind === "whole_flat") - Number(a.room_kind === "whole_flat")).map((x) => (
              <Link key={x.room_id} href={roomHref(x.room_id)} scroll={false} className="chip" aria-current={x.room_id === room.room_id ? "true" : undefined}>
                {x.room_name} · {formatNairaShort(x.price_per_night)}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="layout-2">
        <div className="stack gap-8">
          <section className="stack gap-3">
            <h2>{room.room_name}</h2>
            <p className="muted row wrap gap-2 small"><span>{ROOM_KIND_LABEL[room.room_kind]}</span>·<span>Sleeps {room.max_guests}</span>·<span>{plural(room.beds, "bed")}</span>·<span>{plural(room.bathrooms, "bathroom")}</span>{room.min_nights > 1 ? <>·<span>{room.min_nights} nights minimum</span></> : null}</p>
            <p>{property.description}</p>
          </section>

          {host ? (
            <section className="host-card" aria-label="Your host">
              <span className="avatar" aria-hidden="true">{host.first_name.slice(0, 1).toUpperCase()}</span>
              <div className="stack grow">
                <b>Hosted by {host.first_name}{host.business_name ? ` · ${host.business_name}` : ""}</b>
                <span className="small muted">On Spotted since {since}{host.has_phone ? " · Phone number on file" : ""}</span>
              </div>
              <span className="badge"><Icon name="badge-check" size={14} /> Reviewed by Spotted</span>
            </section>
          ) : null}

          <section className="stack gap-4" aria-label="What this place offers">
            <h2>What this place offers</h2>
            <GlanceTiles rows={amenityRows} />
            <AmenityExceptions rows={amenityRows} />
            <AmenityDetails rows={amenityRows} />
          </section>

          <section className="stack gap-3">
            <h2>Times and rules</h2>
            <div className="facts">
              <div><Icon name="clock" size={20} /><span><b>Check in</b> from {formatTime(property.check_in_from)}</span></div>
              <div><Icon name="clock-3" size={20} /><span><b>Check out</b> by {formatTime(property.check_out_by)}</span></div>
            </div>
            {property.house_rules ? <p>{property.house_rules}</p> : null}
          </section>

          <section className="stack gap-3" id="policy">
            <h2>Cancellation</h2>
            <div className="card pad stack gap-2">
              <span className="badge" style={{ alignSelf: "flex-start" }}>{policy.label}</span>
              <p>{policy.long}</p>
              <p className="small muted">The exact last day for a free cancellation is shown when you pick dates.</p>
            </div>
          </section>

          <section className="stack gap-3">
            <h2>Where it is</h2>
            <p className="muted">{where}{stateName ? `, ${stateName}` : ""}. The circle shows the rough area. The exact pin, landmark and turn-by-turn directions appear on your booking from the day before check-in.</p>
            {property.lat !== null && property.lng !== null ? <MapView mode="area" center={{ lat: Number(property.lat), lng: Number(property.lng) }} height={300} ariaLabel={`Rough area of ${property.name}`} /> : null}
          </section>

          <section className="stack gap-3">
            <h2>Guest reviews</h2>
            {reviews.length ? reviews.map((rv) => (
              <div key={rv.id} className="card pad stack gap-2">
                <div className="row between"><span className="bold">{rv.guest_first_name}</span><span className="row gap-1 small bold"><Icon name="star" size={14} fill="var(--c-gold)" color="var(--c-gold)" /> {rv.rating}</span></div>
                {rv.comment ? <p>{rv.comment}</p> : null}
              </div>
            )) : <p className="muted">No reviews yet. Reviews can only come from guests who stayed.</p>}
          </section>
        </div>

        <aside className="sticky-box">
          <BookingBox roomId={room.room_id} price={room.price_per_night} cleaningFee={room.cleaning_fee} maxGuests={room.max_guests} minNights={room.min_nights} maxNights={room.max_nights}
            blocked={blocked} policy={property.cancellation_policy ?? "moderate"} initialIn={one("in")} initialOut={one("out")} initialGuests={Number(one("guests")) || undefined} />
        </aside>
      </div>
    </div>
  );
}

function formatNairaShort(n: number) { return n >= 1000 ? `₦${Math.round(n / 1000)}k` : `₦${n}`; }
