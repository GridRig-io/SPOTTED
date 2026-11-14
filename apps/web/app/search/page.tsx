import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { filtersFromParams, listAreas, listUnclaimed, searchRooms, filtersToParams, formatRange, type SearchFilters } from "@spotted/core";
import { CardsSkeleton, Empty, ErrorNote, SetupNotice, UnclaimedCard } from "@/components/Bits";
import { FilterBar } from "@/components/FilterBar";
import { RoomCard } from "@/components/RoomCard";
import { SearchBar } from "@/components/SearchBar";
import { hasSupabase } from "@/lib/env";
import { publicDb } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Find a place in Abuja" };
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

async function load(filters: SearchFilters, page: number) {
  try {
    const db = publicDb();
    const [areas, rooms, unclaimed] = await Promise.all([listAreas(db), searchRooms(db, filters, page, PAGE + 1), page === 0 ? listUnclaimed(db, filters.area) : Promise.resolve([])]);
    return { ok: true as const, areas, rooms, unclaimed };
  } catch (e) {
    return { ok: false as const, message: e instanceof Error ? e.message : "Please try again." };
  }
}

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const sp = await searchParams;
  const first = (k: string) => { const v = sp[k]; return Array.isArray(v) ? v[0] : v; };
  const filters: SearchFilters = filtersFromParams(first);
  const page = Math.max(0, Number(first("page") ?? 0) || 0);
  const r = await load(filters, page);
  if (!r.ok) return <ErrorNote message={r.message} />;
  const { areas, rooms, unclaimed } = r;
  const more = rooms.length > PAGE;
  const cards = rooms.slice(0, PAGE);
  const area = areas.find((a) => a.slug === filters.area);
  const query = new URLSearchParams(filtersToParams({ checkIn: filters.checkIn, checkOut: filters.checkOut, guests: filters.guests })).toString();
  const pageHref = (n: number) => { const p = new URLSearchParams(filtersToParams(filters)); if (n) p.set("page", String(n)); const q = p.toString(); return `/search${q ? "?" + q : ""}`; };
  return (
    <>
      <SearchBar areas={areas} initial={filters} variant="bar" />
      <FilterBar filters={filters} />
      <div className="row between wrap gap-2">
        <h1 style={{ fontSize: 28, lineHeight: "36px" }}>{area ? `Places in ${area.name}` : "Places in Abuja"}</h1>
        <p className="muted small" aria-live="polite">
          {cards.length ? `${page * PAGE + cards.length}${more ? "+" : ""} places` : "No places"}
          {filters.checkIn && filters.checkOut ? ` free ${formatRange(filters.checkIn, filters.checkOut)}` : ""}
        </p>
      </div>
      {cards.length ? (
        <div className="cards four">{cards.map((c) => <RoomCard key={c.room_id} card={c} query={query} />)}</div>
      ) : (
        <Empty title="Nothing matches that yet">
          Try other dates, remove a must-have, or look at a nearby area. Filters only show rooms that <b>include</b> what you pick.
          <div className="row center gap-2" style={{ marginTop: 16 }}><Link className="btn" href="/search">Clear everything</Link></div>
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
          <h2>Also in {area ? area.name : "Abuja"}, not on Spotted yet</h2>
          <p className="muted small">These places exist but nobody has claimed them, so we cannot show verified amenities or take bookings.</p>
          <div className="cards">{unclaimed.map((u) => <UnclaimedCard key={u.id} p={u} />)}</div>
        </section>
      ) : null}
    </>
  );
}
