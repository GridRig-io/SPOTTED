import Link from "next/link";
import { Suspense } from "react";
import { listAreas, searchRooms, type Area } from "@spotted/core";
import { PinMark } from "@/components/Logo";
import { Icon } from "@/components/Icon";
import { RoomCard } from "@/components/RoomCard";
import { SearchBar } from "@/components/SearchBar";
import { CardsSkeleton, ErrorNote, SetupNotice } from "@/components/Bits";
import { hasSupabase } from "@/lib/env";
import { publicDb } from "@/lib/supabase-server";

const TRUST = [
  { icon: "zap", t: "Power", d: "Hours of grid light a day, and what backs it up." },
  { icon: "droplets", t: "Water", d: "Running or not, hot or not. No surprises at 6am." },
  { icon: "wifi", t: "Wifi", d: "A tested speed, not just the word wifi." },
  { icon: "shield-check", t: "Security", d: "Gate, guard and CCTV, each one stated." },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-pin" aria-hidden="true"><PinMark size={360} color="#F5480F" /></div>
        <div className="container stack gap-4" style={{ position: "relative" }}>
          <span className="badge" style={{ alignSelf: "flex-start", background: "rgba(250,245,233,.14)", color: "var(--c-cream)" }}>Abuja, Nigeria</span>
          <h1>Places worth staying.</h1>
          <p className="lead">Apartments and guest houses where the power, water, wifi and security are spelled out before you book.</p>
          {hasSupabase ? <Suspense fallback={<div className="searchbox skeleton" style={{ height: 96 }} />}><HeroSearch /></Suspense> : null}
        </div>
      </section>

      <div className="container">
        <div className="trust" role="list" aria-label="What every listing tells you">
          {TRUST.map((t) => (
            <div key={t.t} className="card tile" role="listitem">
              <span className="iconbox"><Icon name={t.icon} size={22} /></span>
              <h4>{t.t}</h4>
              <p className="small muted">{t.d}</p>
            </div>
          ))}
        </div>
      </div>

      {hasSupabase ? (
        <Suspense fallback={<div className="container section"><CardsSkeleton n={3} /></div>}>
          <Featured />
        </Suspense>
      ) : <SetupNotice />}

      <section className="container section">
        <div className="card pad row wrap between gap-4" style={{ background: "var(--c-forest)", borderColor: "var(--c-forest)" }}>
          <div className="stack gap-2" style={{ maxWidth: 560 }}>
            <h2 style={{ color: "var(--c-cream)" }}>Own a flat or guest house in Abuja?</h2>
            <p style={{ color: "var(--c-sage)" }}>List it free for your first 2 months. Post at least 5 photos per room, answer 22 plain questions, and guests find you.</p>
          </div>
          <Link href="/help#hosts" className="btn btn-accent">How hosting works</Link>
        </div>
      </section>
    </>
  );
}

async function HeroSearch() {
  let areas: Area[] = [];
  try { areas = await listAreas(publicDb()); } catch { /* the form still works with "All of Abuja" */ }
  return <SearchBar areas={areas} />;
}

async function loadFeatured() {
  try {
    const db = publicDb();
    const [areas, cards] = await Promise.all([listAreas(db), searchRooms(db, {}, 0, 6)]);
    return { ok: true as const, areas, cards };
  } catch (e) {
    return { ok: false as const, message: e instanceof Error ? e.message : "Please try again in a moment." };
  }
}

async function Featured() {
  const r = await loadFeatured();
  if (!r.ok) return <ErrorNote message={r.message} />;
  const { areas, cards } = r;
  return (
    <>
      <section className="container section stack gap-4">
        <h2>Popular areas</h2>
        <div className="row wrap gap-2">
          {areas.slice(0, 10).map((a) => <Link key={a.slug} href={`/search?area=${a.slug}`} className="chip"><Icon name="map-pin" size={16} /> {a.name}</Link>)}
        </div>
      </section>
      <section className="container stack gap-4" style={{ paddingBottom: 16 }}>
        <div className="row between"><h2>Places to stay now</h2><Link href="/search" className="strong" style={{ color: "var(--c-forest)" }}>See all</Link></div>
        {cards.length ? <div className="cards">{cards.map((c) => <RoomCard key={c.room_id} card={c} />)}</div> : <p className="muted">No places are listed yet. Check back soon.</p>}
      </section>
    </>
  );
}
