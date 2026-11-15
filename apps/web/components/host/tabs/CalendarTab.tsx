"use client";
import { useState } from "react";
import { addBlock, deleteBlock, formatRange, nightsBetween, plural, type BlockedRange } from "@spotted/core";
import { DateCalendar } from "@/components/DateCalendar";
import { Icon } from "@/components/Icon";
import type { TabProps } from "../ListingEditor";

/** Close dates for family, repairs or bookings taken elsewhere. Blocking the whole flat closes every room in it, and the reverse. */
export function CalendarTab({ b, reload, db }: TabProps) {
  const [room, setRoom] = useState(b.rooms[0]?.id ?? "");
  const [a, setA] = useState(""); const [z, setZ] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  if (!b.rooms.length) return <section className="stack gap-4"><h2>Calendar</h2><p className="notice">Add a room first.</p></section>;
  const blocks = b.blocks.filter((x) => x.room_id === room);
  const asRanges: BlockedRange[] = blocks.map((x) => ({ check_in: x.start_date, check_out: x.end_date }));

  async function block() {
    if (!a || !z) return;
    setBusy(true); setErr("");
    try { await addBlock(db, { room_id: room, property_id: b.property.id, start_date: a, end_date: z, note }); setA(""); setZ(""); setNote(""); await reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Could not block those dates."); }
    setBusy(false);
  }

  return (
    <section className="stack gap-4">
      <h2>Calendar</h2>
      <p className="muted">Pick the first night and the morning you are free again, then block. Guests cannot book blocked nights. Paid bookings block themselves automatically.</p>
      <div className="row wrap gap-2" role="tablist" aria-label="Room">
        {b.rooms.map((x) => <button key={x.id} type="button" role="tab" className="chip" aria-selected={room === x.id} onClick={() => setRoom(x.id)}>{x.name}</button>)}
      </div>
      <div className="card pad stack gap-3">
        <DateCalendar months={1} checkIn={a} checkOut={z} blocked={asRanges} maxNights={366} onChange={(x, y) => { setA(x); setZ(y); }} />
        <div className="field"><label htmlFor="c-n">Reason (only you see this)</label><input id="c-n" className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Family visiting, repairs, booked elsewhere…" /></div>
        {err ? <p className="alert" role="alert">{err}</p> : null}
        <button type="button" className="btn" style={{ alignSelf: "flex-start" }} disabled={!a || !z || busy} onClick={block}><Icon name="calendar-x" size={18} /> {a && z ? `Block ${plural(nightsBetween(a, z), "night")}` : "Pick dates to block"}</button>
      </div>
      <div className="card pad">
        <h3 style={{ marginBottom: 8 }}>Blocked dates</h3>
        {blocks.length === 0 ? <p className="muted small">Nothing blocked for this room.</p> : (
          <div className="table-list">
            {blocks.map((x) => (
              <div key={x.id} className="row between gap-3">
                <span className="stack"><b>{formatRange(x.start_date, x.end_date)}</b>{x.note ? <span className="small muted">{x.note}</span> : null}</span>
                <button type="button" className="btn btn-quiet btn-sm" onClick={async () => { try { await deleteBlock(db, x.id); await reload(); } catch (e) { setErr(e instanceof Error ? e.message : "Could not remove."); } }}>Unblock</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
