"use client";
import { useState } from "react";
import { MIN_PHOTOS, deletePhoto, setCoverPhoto, uploadRoomPhoto, type HostPhoto } from "@spotted/core";
import { Icon } from "@/components/Icon";
import { resizeImage } from "@/lib/resize";
import type { TabProps } from "../ListingEditor";

export function PhotosTab({ b, reload, db, onNext }: TabProps) {
  const [room, setRoom] = useState(b.rooms[0]?.id ?? "");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  if (!b.rooms.length) return <section className="stack gap-4"><h2>Photos</h2><p className="notice">Add a room first, then its photos.</p></section>;
  const photos = b.photos.filter((p) => p.room_id === room).sort((x, y) => x.position - y.position);
  const r = b.rooms.find((x) => x.id === room);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setErr("");
    let pos = photos.length;
    const list = [...files].slice(0, 20);
    for (let i = 0; i < list.length; i++) {
      setBusy(`Uploading ${i + 1} of ${list.length}…`);
      try { const blob = await resizeImage(list[i]); await uploadRoomPhoto(db, b.property.id, room, blob, "image/jpeg", pos++); }
      catch (e) { setErr(e instanceof Error ? e.message : "A photo did not upload."); }
    }
    setBusy(""); await reload();
  }
  async function act(fn: () => Promise<unknown>) { setErr(""); try { await fn(); await reload(); } catch (e) { setErr(e instanceof Error ? e.message : "Could not do that."); } }

  return (
    <section className="stack gap-4">
      <h2>Photos</h2>
      <p className="muted">At least {MIN_PHOTOS} real photos of each room: bedroom, bathroom, kitchen or sitting room, and the outside or gate. Daylight, lights on, no filters. The first photo is the cover.</p>
      <div className="row wrap gap-2" role="tablist" aria-label="Room">
        {b.rooms.map((x) => { const n = b.photos.filter((p) => p.room_id === x.id).length; return <button key={x.id} type="button" role="tab" className="chip" aria-selected={room === x.id} onClick={() => setRoom(x.id)}>{x.name} · {n}/{MIN_PHOTOS}{n >= MIN_PHOTOS ? " ✓" : ""}</button>; })}
      </div>
      <div className="photo-grid">
        {photos.map((p: HostPhoto, i) => (
          <div key={p.id} className="photo-tile">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.url ? <img src={p.url} alt={`${r?.name} photo ${i + 1}`} loading="lazy" /> : null}
            {i === 0 ? <span className="badge cover">Cover</span> : null}
            <div className="tile-actions">
              {i > 0 ? <button type="button" className="btn btn-quiet btn-sm" onClick={() => act(() => setCoverPhoto(db, photos, p.id))}>Make cover</button> : <span />}
              <button type="button" className="icon-btn" aria-label={`Delete photo ${i + 1}`} onClick={() => act(() => deletePhoto(db, p))}><Icon name="trash-2" size={16} /></button>
            </div>
          </div>
        ))}
        <label className="dropzone">
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => { void add(e.target.files); e.target.value = ""; }} disabled={Boolean(busy)} />
          <span className="stack gap-2" style={{ alignItems: "center" }}><Icon name="upload" size={26} />{busy || "Add photos"}<span className="caption">From your phone or computer</span></span>
        </label>
      </div>
      <p className={photos.length >= MIN_PHOTOS ? "small" : "notice"} style={photos.length >= MIN_PHOTOS ? { color: "var(--c-forest)", fontWeight: 600 } : undefined}>
        {photos.length >= MIN_PHOTOS ? `${r?.name} has enough photos.` : `${r?.name}: ${photos.length} of ${MIN_PHOTOS} photos. Add ${MIN_PHOTOS - photos.length} more.`}
      </p>
      {err ? <p className="alert" role="alert">{err}</p> : null}
      {onNext ? <button type="button" className="btn" style={{ alignSelf: "flex-end" }} onClick={onNext}>Continue <Icon name="chevron-right" size={18} /></button> : null}
    </section>
  );
}
