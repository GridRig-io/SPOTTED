"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatNaira, formatRange, hostBookings, listAreas, myListings, plural, todayInLagos, type Area, type HostBooking, type ListingSummary, type Profile } from "@spotted/core";
import { useAuth } from "@/components/AuthProvider";
import { Icon } from "@/components/Icon";
import { HostGate, STATUS_LABEL } from "./HostGate";

export function HostDashboard() { return <HostGate>{(p) => <Dashboard profile={p} />}</HostGate>; }

function Dashboard({ profile }: { profile: Profile }) {
  const { db } = useAuth();
  const [listings, setListings] = useState<ListingSummary[] | null>(null);
  const [bookings, setBookings] = useState<HostBooking[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!db) return;
    Promise.all([myListings(db), hostBookings(db), listAreas(db)])
      .then(([l, b, a]) => { setListings(l); setBookings(b); setAreas(a); })
      .catch((e: Error) => { setErr(e.message); setListings([]); });
  }, [db]);

  const today = todayInLagos();
  const upcoming = bookings.filter((b) => b.check_out >= today && (b.status === "confirmed" || b.status === "pending_payment")).sort((a, b) => a.check_in.localeCompare(b.check_in));
  const earned = bookings.filter((b) => b.status === "confirmed" || b.status === "completed").reduce((s, b) => s + b.total_ngn, 0);
  const areaName = (id: number) => areas.find((a) => a.id === id)?.name ?? "";
  const first = profile.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="container section stack gap-8">
      <div className="row between wrap gap-3">
        <div className="stack gap-1"><span className="eyebrow">Host dashboard</span><h1>Welcome, {first}</h1></div>
        <Link href="/host/listings/new" className="btn btn-accent"><Icon name="plus" size={18} /> Add a place</Link>
      </div>
      {err ? <p className="alert" role="alert">{err}</p> : null}

      <div className="glance" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div className="tile"><span className="iconbox"><Icon name="house" size={22} /></span><div className="stack"><span className="label">Listings</span><b>{listings?.length ?? "…"}</b></div></div>
        <div className="tile"><span className="iconbox"><Icon name="calendar" size={22} /></span><div className="stack"><span className="label">Upcoming stays</span><b>{upcoming.length}</b></div></div>
        <div className="tile"><span className="iconbox"><Icon name="star" size={22} /></span><div className="stack"><span className="label">Booked value</span><b>{formatNaira(earned)}</b></div></div>
      </div>

      <section className="stack gap-3">
        <h2>Your places</h2>
        {listings === null ? <div className="skeleton" style={{ height: 120 }} /> : listings.length === 0 ? (
          <div className="card pad stack gap-3" style={{ maxWidth: 560 }}>
            <h3>Add your first place</h3>
            <p className="muted">Start with the name and area. You can add rooms, photos and the 22 answers in any order, and save as you go.</p>
            <Link href="/host/listings/new" className="btn btn-accent" style={{ alignSelf: "flex-start" }}>Add a place</Link>
          </div>
        ) : (
          <div className="stack gap-3">
            {listings.map((l) => (
              <div key={l.id} className="card pad stack gap-2">
                <div className="row between wrap gap-2">
                  <div className="stack"><b style={{ fontSize: 18 }}>{l.name}</b><span className="small muted">{areaName(l.area_id)}</span></div>
                  <span className={`status-pill ${l.status}`}>{STATUS_LABEL[l.status] ?? l.status}</span>
                </div>
                {l.review_note && l.status === "draft" ? <p className="notice"><b>From the Spotted reviewer:</b> {l.review_note}</p> : null}
                {l.status === "pending_review" ? <p className="small muted">Submitted. A reviewer will check it soon; you will see it go Live here.</p> : null}
                <div className="row wrap gap-2">
                  <Link className="btn btn-sm" href={`/host/listings/${l.id}`}><Icon name="pencil" size={16} /> {l.status === "draft" ? "Continue" : "Edit"}</Link>
                  <Link className="btn btn-quiet btn-sm" href={`/host/listings/${l.id}?tab=calendar`}><Icon name="calendar-x" size={16} /> Calendar</Link>
                  {l.status === "published" ? <Link className="btn btn-quiet btn-sm" href={`/place/${l.slug}`}><Icon name="eye" size={16} /> View as guest</Link> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="stack gap-3">
        <h2>Upcoming stays</h2>
        {upcoming.length === 0 ? <p className="muted">No upcoming stays yet. Once your place is live, bookings appear here.</p> : (
          <div className="card pad table-list">
            {upcoming.map((b) => (
              <div key={b.id} className="row between wrap gap-3">
                <div className="stack">
                  <b>{b.guest_first_name} · {plural(b.guests, "guest")}</b>
                  <span className="small muted">{b.property_name}, {b.room_name} · {formatRange(b.check_in, b.check_out)} · {b.code}</span>
                </div>
                <div className="row gap-3">
                  <span className={`status-pill ${b.status === "confirmed" ? "published" : "pending_review"}`}>{b.status === "confirmed" ? "Paid" : "Waiting for payment"}</span>
                  <b>{formatNaira(b.total_ngn)}</b>
                  {b.guest_phone ? <a className="icon-btn" href={`tel:${b.guest_phone}`} aria-label={`Call ${b.guest_first_name}`}><Icon name="phone" size={18} /></a> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
