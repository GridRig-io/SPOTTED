"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getListing, listAreas, pendingListings, reviewListing, type Area, type ListingBundle, type PendingListing } from "@spotted/core";
import { AMENITY_COUNT } from "@spotted/tokens";
import { useAuth } from "@/components/AuthProvider";
import { Icon } from "@/components/Icon";
import { MapView } from "@/components/MapView";
import { HostGate } from "./HostGate";

/** Spotted's own check before a listing goes live. Only accounts with the admin role can use this. */
export function AdminReview() { return <HostGate>{(p) => (p.role === "admin" ? <Queue /> : <div className="container section"><p className="alert">This page is for Spotted reviewers.</p></div>)}</HostGate>; }

function Queue() {
  const { db } = useAuth();
  const [items, setItems] = useState<PendingListing[] | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(async () => { if (db) { const [p, a] = await Promise.all([pendingListings(db), listAreas(db)]); setItems(p); setAreas(a); } }, [db]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  return (
    <div className="container section stack gap-6">
      <div className="stack gap-1"><span className="eyebrow">Spotted reviewers</span><h1>Listings waiting for review</h1></div>
      {items === null ? <div className="skeleton" style={{ height: 160 }} /> : items.length === 0 ? <p className="muted">Nothing waiting. Nice.</p> : items.map((it) => (
        <div key={it.id} className="card pad stack gap-3">
          <div className="row between wrap gap-2"><div className="stack"><b style={{ fontSize: 18 }}>{it.name}</b><span className="small muted">{areas.find((a) => a.id === it.area_id)?.name} · submitted {it.submitted_at ? new Date(it.submitted_at).toLocaleString("en-NG") : ""}</span></div>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setOpen(open === it.id ? null : it.id)}>{open === it.id ? "Hide" : "Check it"}</button></div>
          {open === it.id ? <Check id={it.id} onDone={load} /> : null}
        </div>
      ))}
    </div>
  );
}

function Check({ id, onDone }: { id: string; onDone: () => Promise<void> }) {
  const { db } = useAuth();
  const [b, setB] = useState<ListingBundle | null>(null);
  const [note, setNote] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (db) getListing(db, id).then(setB).catch((e: Error) => setErr(e.message)); }, [db, id]);
  if (!b) return err ? <p className="alert">{err}</p> : <div className="skeleton" style={{ height: 200 }} />;
  async function decide(approve: boolean) {
    if (!db) return; setBusy(true); setErr("");
    try { await reviewListing(db, id, approve, note); await onDone(); } catch (e) { setErr(e instanceof Error ? e.message : "Could not save."); setBusy(false); }
  }
  return (
    <div className="stack gap-4">
      <p>{b.property.description}</p>
      <div className="row wrap gap-6 small">
        <span><b>Address:</b> {b.priv?.street_address ?? "missing"}</span>
        <span><b>Landmark:</b> {b.priv?.landmark ?? "none"}</span>
        <span><b>Phone:</b> {b.priv?.host_phone ?? "missing"}</span>
        <span><b>Policy:</b> {b.property.cancellation_policy}</span>
      </div>
      {b.priv?.lat && b.priv?.lng ? <MapView mode="exact" center={{ lat: Number(b.priv.lat), lng: Number(b.priv.lng) }} height={240} ariaLabel="Exact pin" /> : <p className="alert">No pin.</p>}
      {b.rooms.map((r) => {
        const ph = b.photos.filter((p) => p.room_id === r.id);
        return (
          <div key={r.id} className="stack gap-2">
            <b>{r.name} · ₦{r.price_per_night.toLocaleString("en-NG")} · {ph.length} photos · {b.answers.filter((a) => a.room_id === r.id || a.room_id === null).length}/{AMENITY_COUNT} answers</b>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="photo-grid">{ph.map((p) => <div key={p.id} className="photo-tile">{p.url ? <img src={p.url} alt="" /> : null}</div>)}</div>
          </div>
        );
      })}
      <Link className="small link" href={`/host/listings/${id}`}>Open the full listing editor</Link>
      <div className="field"><label htmlFor="rv-n">Note to the host (needed if you send it back)</label><textarea id="rv-n" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Photo 3 of the master room is blurry; the pin is on the next street…" /></div>
      {err ? <p className="alert" role="alert">{err}</p> : null}
      <div className="row wrap gap-2">
        <button type="button" className="btn btn-accent" disabled={busy} onClick={() => decide(true)}><Icon name="badge-check" size={18} /> Approve and publish</button>
        <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => decide(false)}>Send back with note</button>
      </div>
    </div>
  );
}
