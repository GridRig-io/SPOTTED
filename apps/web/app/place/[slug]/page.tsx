import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  getBlockedRanges, getProperty, getReviews, getRoomAmenities, getRoomPhotos, getRoomsOfProperty, PROPERTY_KIND_LABEL, ROOM_KIND_LABEL,
  formatTime, plural, type Photo as PhotoT,
} from "@spotted/core";
import { AmenityList, GlanceTiles } from "@/components/AmenityList";
import { BookingBox } from "@/components/BookingBox";
import { Empty, ErrorNote, SetupNotice } from "@/components/Bits";
import { Icon } from "@/components/Icon";
import { formatNaira } from "@spotted/core";
import { Photo } from "@/components/Photo";
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
    const [photos, amenityRows, reviews, blocked] = await Promise.all([
      getRoomPhotos(db, room.room_id), getRoomAmenities(db, room.room_id), getReviews(db, property.id, 6), getBlockedRanges(db, room.room_id),
    ]);
    return { kind: "ok" as const, property, rooms, room, photos, amenityRows, reviews, blocked };
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
        <Link href="/search" className="row gap-1 muted small"><Icon name="chevron-left" size={16} /> Back to results</Link>
        <span className="badge badge-warn" style={{ alignSelf: "flex-start" }}>Not claimed yet</span>
        <h1>{property.name}</h1>
        <p className="muted">{PROPERTY_KIND_LABEL[property.kind]} · {property.area?.name}{property.area_hint ? ` · ${property.area_hint}` : ""}</p>
        <div className="notice">Nobody has claimed this place on Spotted, so we have no verified photos or amenities and it cannot be booked here. If you own or manage it, claim it and guests can start booking.</div>
        <ClaimBox propertyId={property.id} />
      </div>
    );
  }
  const { property, rooms, room, photos, amenityRows, reviews, blocked } = r;
    const keep = new URLSearchParams(); for (const k of ["in", "out", "guests"]) { const v = one(k); if (v) keep.set(k, v); }
    const roomHref = (id: string) => `/place/${property.slug}?${new URLSearchParams({ room: id, ...Object.fromEntries(keep) })}`;
    const shown: (PhotoT | null)[] = photos.length ? photos.slice(0, 5) : [null];

    return (
      <div className="container section stack gap-6">
        <div className="row between wrap gap-3">
          <div className="stack gap-2">
            <Link href="/search" className="row gap-1 muted small"><Icon name="chevron-left" size={16} /> Back to results</Link>
            <h1>{property.name}</h1>
            <p className="muted row wrap gap-2 small">
              <span>{PROPERTY_KIND_LABEL[property.kind]}</span>·<span className="row gap-1"><Icon name="map-pin" size={14} /> {property.area?.name}{property.area_hint ? `, ${property.area_hint}` : ""}</span>
              {property.rating_count > 0 ? <>·<span className="row gap-1 bold"><Icon name="star" size={14} fill="var(--c-gold)" color="var(--c-gold)" /> {Number(property.rating_avg).toFixed(1)} ({property.rating_count})</span></> : <>·<span className="badge">New</span></>}
            </p>
          </div>
          <SaveButton propertyId={property.id} className="btn btn-quiet btn-sm" label />
        </div>

        <div className="gallery" aria-label="Photos">
          {shown.map((p, i) => <Photo key={i} photo={p} seed={room.room_id} index={i} alt={`${room.room_name} photo ${i + 1}`} priority={i === 0} />)}
        </div>
        {rooms.length > 0 ? (
          <div className="stack gap-2" aria-label="Choose a room">
            <span className="eyebrow">Showing amenities for</span>
            <div className="hscroll">
              {[...rooms].sort((a, b) => Number(b.room_kind === "whole_flat") - Number(a.room_kind === "whole_flat")).map((r) => <Link key={r.room_id} href={roomHref(r.room_id)} scroll={false} className="chip" aria-current={r.room_id === room.room_id ? "true" : undefined}>{r.room_name}</Link>)}
            </div>
          </div>
        ) : null}

        <div className="layout-2">
          <div className="stack gap-8">
            <section className="stack gap-3">
              <h2>{room.room_name}</h2>
              <p className="muted row wrap gap-2 small"><span>{ROOM_KIND_LABEL[room.room_kind]}</span>·<span>Sleeps {room.max_guests}</span>·<span>{plural(room.beds, "bed")}</span>·<span>{plural(room.bathrooms, "bathroom")}</span>·<span>Check in {formatTime(property.check_in_from)}, out by {formatTime(property.check_out_by)}</span></p>
              <p>{property.description}</p>
            </section>

            <section className="stack gap-4" aria-label="What this place offers">
              <h2>What this place offers</h2>
              <GlanceTiles rows={amenityRows} />
              <AmenityList rows={amenityRows} />
            </section>

            {property.house_rules ? <section className="stack gap-2"><h2>House rules</h2><p>{property.house_rules}</p></section> : null}

            <section className="stack gap-3">
              <h2>Where it is</h2>
              <p className="muted">{property.area?.name}{property.area_hint ? `, ${property.area_hint}` : ""}. The exact address and gate instructions are sent after your booking is confirmed.</p>
              {property.lat && property.lng ? <a className="btn btn-quiet btn-sm" style={{ alignSelf: "flex-start" }} href={`https://www.google.com/maps/search/?api=1&query=${property.lat},${property.lng}`} target="_blank" rel="noreferrer"><Icon name="map-pin" size={16} /> See the area on a map</a> : null}
            </section>

            <section className="stack gap-3">
              <h2>Guest reviews</h2>
              {reviews.length ? reviews.map((r) => (
                <div key={r.id} className="card pad stack gap-2">
                  <div className="row between"><span className="bold">{r.guest_first_name}</span><span className="row gap-1 small bold"><Icon name="star" size={14} fill="var(--c-gold)" color="var(--c-gold)" /> {r.rating}</span></div>
                  {r.comment ? <p>{r.comment}</p> : null}
                </div>
              )) : <p className="muted">No reviews yet. Reviews can only come from guests who stayed.</p>}
            </section>
          </div>

          <aside className="sticky-box">
            <BookingBox roomId={room.room_id} price={room.price_per_night} maxGuests={room.max_guests} minNights={room.min_nights} maxNights={room.max_nights}
              blocked={blocked} initialIn={one("in")} initialOut={one("out")} initialGuests={Number(one("guests")) || undefined} />
          </aside>
        </div>
        <div className="mobile-reserve"><span><b style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>{formatNaira(room.price_per_night)}</b> <span className="muted small">a night</span></span><a className="btn btn-accent btn-sm" href="#book">Check dates</a></div>
      </div>
    );
}
