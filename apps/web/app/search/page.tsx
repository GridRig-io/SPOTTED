import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { plural, distanceKm, filtersFromParams, filtersToParams, formatDistance, formatNaira, formatRange, listUnclaimed, searchRooms, type NearPoint, type SearchFilters } from "@spotted/core";
import { CardsSkeleton, Empty, ErrorNote, SetupNotice, UnclaimedCard } from "@/components/Bits";
import { FilterBar } from "@/components/FilterBar";
import { Icon } from "@/components/Icon";
import { MapView } from "@/components/MapView";
import { RoomCard } from "@/components/RoomCard";
import { SearchBar } from "@/components/SearchBar";
import { hasSupabase } from "@/lib/env";
import { publicDb } from "@/lib/supabase-server";
import { resolveState } from "@/lib/state-server";

export const metadata: Metadata = { title: "Find a place" };
const PAGE = 24;

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="container section stack gap-6">
      {hasSupabase ? (
        <Suspense fallback={<><div className="skeleton" style={{ height: 80 }} /><CardsSkeleton /></>}>
          <Results searchParams={searchParams} />
        </Suspense>
      ) : <SetupNotice />}
    </div>
  );
}

function parseNear(v?: string): NearPoint | null {
  const m = /^(-?\d{1,2}\.\d{1,3}),(-?\d{1,2}\.\d{1,3})$/.exec(v ?? "");
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null;
}

async function load(filters: SearchFilters, page: number, near: NearPoint | null) {
  try {
    const db = publicDb();
    const { states, state, areas } = await resolveState(db, filters.state);
    const f = { ...filters, state: state?.slug };
    const [rooms, unclaimed] = await Promise.all([searchRooms(db, f, page, PAGE + 1, near), page === 0 ? listUnclaimed(db, f.area) : Promise.resolve([])]);
    return { ok: true as const, states, state, areas, rooms, unclaimed: unclaimed.filter((u) => u.state_slug === state?.slug), filters: f };
  } catch (e) {
    return { ok: false as const, message: e instanceof Error ? e.message : "Please try again." };
  }
}

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const sp = await searchParams;
  const first = (k: string) => { const v = sp[k]; return Array.isArray(v) ? v[0] : v; };
  const page = Math.max(0, Number(first("page") ?? 0) || 0);
  const near = parseNear(first("near"));
  const view = first("view") === "map" ? "map" : "list";
  const r = await load(filtersFromParams(first), page, near);
  if (!r.ok) return <ErrorNote message={r.message} />;
  const { states, state, areas, rooms, unclaimed, filters } = r;
  const more = rooms.length > PAGE;
  const cards = rooms.slice(0, PAGE);
  const area = areas.find((a) => a.slug === filters.area);
  const place = area ? area.name : state?.city ?? "Nigeria";
  const query = new URLSearchParams(filtersToParams({ checkIn: filters.checkIn, checkOut: filters.checkOut, guests: filters.guests })).toString();
  const base = () => { const p = new URLSearchParams(filtersToParams(filters)); if (near) p.set("near", `${near.lat},${near.lng}`); return p; };
  const pageHref = (n: number) => { const p = base(); if (view === "map") p.set("view", "map"); if (n) p.set("page", String(n)); return `/search?${p.toString()}`; };
  const viewHref = (v: "list" | "map") => { const p = base(); if (v === "map") p.set("view", "map"); return `/search?${p.toString()}`; };
  const dist = (c: (typeof cards)[number]) => (near && c.lat !== null && c.lng !== null ? formatDistance(distanceKm(near, { lat: Number(c.lat), lng: Number(c.lng) })) : undefined);
  const nights = filters.checkIn && filters.checkOut;

  return (
    <>
      <SearchBar key={`${state?.slug}|${filters.area}`} states={states} areas={areas} stateSlug={state?.slug ?? ""} initial={filters} variant="bar" />
      <FilterBar filters={filters} near={near} />
      <div className="row between wrap gap-3">
        <div className="stack">
          <h1 style={{ fontSize: 28, lineHeight: "36px" }}>Places in {place}</h1>
          <p className="muted small" aria-live="polite">
            {cards.length ? `${plural(page * PAGE + cards.length, "place")}${more ? "+" : ""}` : "No places"}
            {nights ? ` free ${formatRange(filters.checkIn!, filters.checkOut!)} · prices are for the whole stay` : ""}
          </p>
        </div>
        <div className="seg" role="tablist" aria-label="Show as">
          <Link role="tab" aria-selected={view === "list"} className="seg-btn" href={viewHref("list")} scroll={false}><Icon name="menu" size={16} /> List</Link>
          <Link role="tab" aria-selected={view === "map"} className="seg-btn" href={viewHref("map")} scroll={false}><Icon name="map-pin" size={16} /> Map</Link>
        </div>
      </div>

      {view === "map" ? (
        <div className="stack gap-2">
          <MapView mode="results" height="min(62vh, 560px)" center={{ lat: Number(area?.lat ?? state?.lat ?? 9.07), lng: Number(area?.lng ?? state?.lng ?? 7.4) }} me={near}
            ariaLabel={`Map of places in ${place}`}
            markers={cards.filter((c) => c.lat !== null && c.lng !== null).map((c) => ({
              id: c.room_id, lat: Number(c.lat), lng: Number(c.lng), label: formatNaira(c.price_per_night),
              title: `${c.property_name}, ${c.room_name}`, href: `/place/${c.property_slug}?room=${c.room_id}${query ? "&" + query : ""}`,
            }))} />
          <p className="caption muted row gap-2"><Icon name="info" size={14} /> Spots are approximate (about 1 km) to keep hosts and guests safe. The exact pin and directions unlock once you book.</p>
        </div>
      ) : null}

      {cards.length ? (
        <div className="cards four">{cards.map((c) => <RoomCard key={c.room_id} card={c} query={query} checkIn={filters.checkIn} checkOut={filters.checkOut} distance={dist(c)} />)}</div>
      ) : (
        <Empty title={`Nothing matches in ${place} yet`}>
          Try other dates, remove a must-have, or look at another area. Filters only show rooms that <b>include</b> what you pick.
          <div className="row center wrap gap-2" style={{ marginTop: 16 }}>
            <Link className="btn" href={`/search?state=${state?.slug ?? ""}`}>Clear filters</Link>
            <Link className="btn btn-quiet" href="/host/start">Own a place here? List it</Link>
          </div>
        </Empty>
      )}
      {(page > 0 || more) ? (
        <div className="row center gap-3">
          {page > 0 ? <Link className="btn btn-quiet" href={pageHref(page - 1)}>Previous</Link> : null}
          {more ? <Link className="btn" href={pageHref(page + 1)}>Show more</Link> : null}
        </div>
      ) : null}
      {unclaimed.length ? (
        <section className="stack gap-3" style={{ marginTop: 16 }}>
          <h2>Also in {place}, not on Spotted yet</h2>
          <p className="muted small">These places exist but nobody has claimed them, so we cannot show verified amenities or take bookings.</p>
          <div className="cards">{unclaimed.map((u) => <UnclaimedCard key={u.id} p={u} />)}</div>
        </section>
      ) : null}
    </>
  );
}
