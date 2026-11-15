import Link from "next/link";
import { Suspense } from "react";
import { searchRooms } from "@spotted/core";
import { PinMark } from "@/components/Logo";
import { Icon } from "@/components/Icon";
import { RoomCard } from "@/components/RoomCard";
import { SearchBar } from "@/components/SearchBar";
import { CardsSkeleton, ErrorNote, SetupNotice } from "@/components/Bits";
import { hasSupabase } from "@/lib/env";
import { publicDb } from "@/lib/supabase-server";
import { resolveState } from "@/lib/state-server";

const TRUST = [
  { icon: "zap", t: "Power", d: "Hours of grid light a day, and what backs it up." },
  { icon: "droplets", t: "Water", d: "Running or not, hot or not. No surprises at 6am." },
  { icon: "wifi", t: "Wifi", d: "A tested speed, not just the word wifi." },
  { icon: "shield-check", t: "Security", d: "Gate, guard and CCTV, each one stated." },
];

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <section className="hero">
        <div className="hero-pin" aria-hidden="true"><PinMark size={360} color="#F5480F" /></div>
        <div className="container stack gap-4" style={{ position: "relative" }}>
          <h1>Places worth staying.</h1>
          <p className="lead">Apartments and guest houses across Nigeria, with the power, water, wifi and security spelled out before you book.</p>
          {hasSupabase ? <Suspense fallback={<div className="skeleton" style={{ height: 120, borderRadius: 20, marginTop: 20, opacity: .3 }} />}><HeroSearch searchParams={searchParams} /></Suspense> : null}
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
          <Featured searchParams={searchParams} />
        </Suspense>
      ) : <SetupNotice />}

      <section className="container section">
        <div className="host-cta">
          <div className="stack gap-2" style={{ maxWidth: 560 }}>
            <span className="badge" style={{ alignSelf: "flex-start", background: "rgba(250,245,233,.14)", color: "var(--c-cream)" }}>For owners and managers</span>
            <h2 style={{ color: "var(--c-cream)" }}>Own a flat, guest house or short-let?</h2>
            <p style={{ color: "var(--c-sage)" }}>List it free for your first 2 months. Add your rooms and photos, answer 22 plain questions, drop a pin on the map, and guests find you.</p>
          </div>
          <div className="row wrap gap-3">
            <Link href="/host/start" className="btn btn-accent">List your place</Link>
            <Link href="/host" className="btn btn-ghost" style={{ color: "var(--c-cream)", borderColor: "var(--c-sage)" }}>How it works</Link>
          </div>
        </div>
      </section>
    </>
  );
}

type SP = PageProps<"/">["searchParams"];
const pick = async (sp: SP, k: string) => { const v = (await sp)[k]; return Array.isArray(v) ? v[0] : v; };

async function HeroSearch({ searchParams }: { searchParams: SP }) {
  const r = await resolveState(publicDb(), await pick(searchParams, "state")).catch(() => null);
  if (!r) return null;
  return <SearchBar states={r.states} areas={r.areas} stateSlug={r.state?.slug ?? ""} />;
}

async function loadFeatured(stateFromUrl?: string) {
  try {
    const db = publicDb();
    const { state, areas } = await resolveState(db, stateFromUrl);
    const cards = await searchRooms(db, { state: state?.slug }, 0, 6);
    return { ok: true as const, state, areas, cards };
  } catch (e) {
    return { ok: false as const, message: e instanceof Error ? e.message : "Please try again in a moment." };
  }
}

async function Featured({ searchParams }: { searchParams: SP }) {
  const r = await loadFeatured(await pick(searchParams, "state"));
  if (!r.ok) return <ErrorNote message={r.message} />;
  const { state, areas, cards } = r;
  const s = state?.slug ?? "";
  const city = state?.city ?? "Nigeria";
  return (
    <>
      <section className="container section stack gap-4">
        <h2>Popular areas in {city}</h2>
        <div className="row wrap gap-2">
          {areas.filter((a) => !a.slug.endsWith("-other")).slice(0, 12).map((a) => <Link key={a.slug} href={`/search?state=${s}&area=${a.slug}`} className="chip"><Icon name="map-pin" size={16} /> {a.name}</Link>)}
        </div>
      </section>
      <section className="container stack gap-4" style={{ paddingBottom: 16 }}>
        <div className="row between"><h2>Places to stay in {city}</h2>{cards.length ? <Link href={`/search?state=${s}`} className="strong" style={{ color: "var(--c-forest)" }}>See all</Link> : null}</div>
        {cards.length ? <div className="cards">{cards.map((c) => <RoomCard key={c.room_id} card={c} />)}</div> : (
          <div className="card pad stack gap-3" style={{ maxWidth: 640 }}>
            <span className="iconbox"><Icon name="house" size={22} /></span>
            <h3>No places in {state?.short_name ?? "this state"} yet</h3>
            <p className="muted">We are just opening here. If you own or manage a flat or guest house in {city}, list it free and be one of the first guests see.</p>
            <div className="row wrap gap-2"><Link className="btn btn-accent" href="/host/start">List your place</Link><Link className="btn btn-quiet" href="/?state=fct">Browse Abuja (FCT)</Link></div>
          </div>
        )}
      </section>
    </>
  );
}
