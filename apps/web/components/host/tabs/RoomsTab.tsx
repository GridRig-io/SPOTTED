"use client";
import { useState } from "react";
import { ROOM_KIND_LABEL, deleteRoom, formatNaira, newId, saveRoom, type HostRoom, type RoomKind } from "@spotted/core";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import type { TabProps } from "../ListingEditor";

const blank = (propertyId: string, first: boolean): HostRoom => ({
  id: newId(), property_id: propertyId, name: first ? "Whole flat" : "", kind: first ? "whole_flat" : "guest_room", description: "",
  max_guests: 2, beds: 1, bathrooms: 1, price_per_night: 0, cleaning_fee: 0, min_nights: 1, max_nights: 30, status: "draft",
});

export function RoomsTab({ b, reload, db, onNext }: TabProps) {
  const [edit, setEdit] = useState<{ room: HostRoom; isNew: boolean } | null>(null);
  const [err, setErr] = useState("");
  return (
    <section className="stack gap-4">
      <div className="row between wrap gap-2"><h2>Rooms and prices</h2><button type="button" className="btn btn-sm" onClick={() => setEdit({ room: blank(b.property.id, b.rooms.length === 0), isNew: true })}><Icon name="plus" size={16} /> Add a room</button></div>
      <p className="muted">Renting the whole flat? Add one room called Whole flat. Renting rooms separately? Add each one. If you also offer the whole flat, booking it blocks the rooms inside it, and the other way round.</p>
      {b.rooms.length === 0 ? <div className="card pad"><p className="muted">No rooms yet.</p></div> : (
        <div className="card pad table-list">
          {b.rooms.map((r) => (
            <div key={r.id} className="row between wrap gap-3">
              <div className="stack"><b>{r.name}</b><span className="small muted">{ROOM_KIND_LABEL[r.kind]} · sleeps {r.max_guests} · {formatNaira(r.price_per_night)} a night{r.min_nights > 1 ? ` · ${r.min_nights}+ nights` : ""}</span></div>
              <div className="row gap-2">
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEdit({ room: r, isNew: false })}><Icon name="pencil" size={16} /> Edit</button>
                <button type="button" className="icon-btn" aria-label={`Delete ${r.name}`} onClick={async () => { setErr(""); try { await deleteRoom(db, r.id); await reload(); } catch (e) { setErr(e instanceof Error ? e.message : "Could not delete."); } }}><Icon name="trash-2" size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {err ? <p className="alert" role="alert">{err}</p> : null}
      {onNext && b.rooms.length ? <button type="button" className="btn" style={{ alignSelf: "flex-end" }} onClick={onNext}>Continue <Icon name="chevron-right" size={18} /></button> : null}
      {edit ? <RoomForm key={edit.room.id} initial={edit.room} isNew={edit.isNew} onClose={() => setEdit(null)} onSaved={async () => { setEdit(null); await reload(); }} save={(r) => saveRoom(db, r, edit.isNew)} /> : null}
    </section>
  );
}

function RoomForm({ initial, isNew, onClose, onSaved, save }: { initial: HostRoom; isNew: boolean; onClose: () => void; onSaved: () => Promise<void>; save: (r: HostRoom) => Promise<void> }) {
  const [r, setR] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const num = (k: keyof HostRoom) => (e: React.ChangeEvent<HTMLInputElement>) => setR({ ...r, [k]: Math.max(0, Math.round(Number(e.target.value) || 0)) });
  async function submit() {
    setErr("");
    if (!r.name.trim()) { setErr("Give the room a name, like Master room."); return; }
    if (r.price_per_night < 1000) { setErr("Set a price per night of at least ₦1,000."); return; }
    if (r.max_guests < 1 || r.beds < 1) { setErr("A room sleeps at least 1 guest and has at least 1 bed."); return; }
    if (r.max_nights < r.min_nights) { setErr("Longest stay must be at least the shortest stay."); return; }
    setBusy(true);
    try { await save({ ...r, name: r.name.trim(), description: r.description.trim() }); await onSaved(); } catch (e) { setErr(e instanceof Error ? e.message : "Could not save."); setBusy(false); }
  }
  return (
    <Sheet open onClose={onClose} title={isNew ? "Add a room" : `Edit ${initial.name}`}
      footer={<div className="row gap-3"><button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button><button type="button" className="btn grow" disabled={busy} onClick={submit}>{busy ? "Saving…" : "Save room"}</button></div>}>
      <div className="stack gap-4">
        <div className="field"><label htmlFor="r-n">Room name</label><input id="r-n" className="input" value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} placeholder="Master room" maxLength={60} /></div>
        <div className="field"><span className="label">Type</span><div className="row wrap gap-2">{(Object.keys(ROOM_KIND_LABEL) as RoomKind[]).map((k) => <button key={k} type="button" className="chip" aria-pressed={r.kind === k} onClick={() => setR({ ...r, kind: k })}>{ROOM_KIND_LABEL[k]}</button>)}</div></div>
        <div className="form-grid two">
          <div className="field"><label htmlFor="r-p">Price per night (₦)</label><input id="r-p" className="input" inputMode="numeric" value={r.price_per_night || ""} onChange={num("price_per_night")} placeholder="45000" /></div>
          <div className="field"><label htmlFor="r-c">Cleaning fee (₦, once per stay)</label><input id="r-c" className="input" inputMode="numeric" value={r.cleaning_fee || ""} onChange={num("cleaning_fee")} placeholder="0" /></div>
        </div>
        <div className="form-grid three">
          <div className="field"><label htmlFor="r-g">Sleeps</label><input id="r-g" className="input" inputMode="numeric" value={r.max_guests} onChange={num("max_guests")} /></div>
          <div className="field"><label htmlFor="r-b">Beds</label><input id="r-b" className="input" inputMode="numeric" value={r.beds} onChange={num("beds")} /></div>
          <div className="field"><label htmlFor="r-ba">Bathrooms</label><input id="r-ba" className="input" inputMode="numeric" value={r.bathrooms} onChange={num("bathrooms")} /></div>
        </div>
        <div className="form-grid two">
          <div className="field"><label htmlFor="r-mn">Shortest stay (nights)</label><input id="r-mn" className="input" inputMode="numeric" value={r.min_nights} onChange={num("min_nights")} /></div>
          <div className="field"><label htmlFor="r-mx">Longest stay (nights)</label><input id="r-mx" className="input" inputMode="numeric" value={r.max_nights} onChange={num("max_nights")} /></div>
        </div>
        <div className="field"><label htmlFor="r-d">About this room (optional)</label><textarea id="r-d" className="input" value={r.description} onChange={(e) => setR({ ...r, description: e.target.value })} maxLength={800} /></div>
        {r.price_per_night >= 1000 ? <p className="small muted">A 2-night stay would show guests {formatNaira(r.price_per_night * 2 + r.cleaning_fee)} in total.</p> : null}
        {err ? <p className="alert" role="alert">{err}</p> : null}
      </div>
    </Sheet>
  );
}
