"use client";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AMENITIES } from "@spotted/tokens";
import { PRICE_PRESETS, ROOM_KIND_LABEL, SORT_LABEL, activeFilterCount, filtersToParams, inNigeria, type NearPoint, type SearchFilters, type SortKey } from "@spotted/core";
import { Icon } from "./Icon";

const KINDS = ["whole_flat", "master_room", "guest_room", "studio"] as const;
const FILTER_AMENITIES = AMENITIES.filter((a) => a.filterable);

/** Quick chips under the search bar + a full filter sheet. Everything lives in the URL so results can be shared. */
export function FilterBar({ filters, near }: { filters: SearchFilters; near?: NearPoint | null }) {
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SearchFilters>(filters);
  const [locating, setLocating] = useState(false);
  const [locErr, setLocErr] = useState("");

  const go = (f: SearchFilters, at: NearPoint | null | undefined = near) => {
    const p = new URLSearchParams(filtersToParams(f));
    if (f.sort === "nearest" && at) p.set("near", `${at.lat},${at.lng}`);
    const view = new URLSearchParams(window.location.search).get("view");
    if (view === "map") p.set("view", "map");
    const q = p.toString();
    router.push(`${path}${q ? "?" + q : ""}`);
  };

  /** Nearest to you: ask the phone or laptop for its location once, rounded to about 1 km before it leaves the device. */
  function sortBy(k: SortKey) {
    setLocErr("");
    if (k !== "nearest") { go({ ...filters, sort: k }, null); return; }
    if (!("geolocation" in navigator)) { setLocErr("This device cannot share its location."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const at = { lat: Math.round(pos.coords.latitude * 100) / 100, lng: Math.round(pos.coords.longitude * 100) / 100 };
        if (!inNigeria(at)) { setLocErr("You seem to be outside Nigeria, so distances would not help. Showing recommended instead."); return; }
        go({ ...filters, sort: "nearest" }, at);
      },
      (e) => { setLocating(false); setLocErr(e.code === 1 ? "Location is off for this site. Allow it in your browser settings to sort by distance." : "Could not find your location. Try again outside or near a window."); },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  }
  const toggleAm = (f: SearchFilters, k: string): SearchFilters => {
    const s = new Set(f.amenities ?? []);
    if (s.has(k)) s.delete(k); else s.add(k);
    return { ...f, amenities: [...s] };
  };
  const quick = ["grid_power", "backup_power", "wifi", "guard", "air_conditioning", "parking"];
  const n = activeFilterCount(filters);

  return (
    <>
      <div className="row gap-2" style={{ alignItems: "center" }}>
        <button className="chip" type="button" onClick={() => { setDraft(filters); setOpen(true); }} aria-haspopup="dialog">
          <Icon name="sliders-horizontal" size={18} /> Filters{n ? ` · ${n}` : ""}
        </button>
        <div className="hscroll grow" aria-label="Quick amenity filters">
          {quick.map((k) => {
            const a = AMENITIES.find((x) => x.key === k)!;
            const on = filters.amenities?.includes(k) ?? false;
            return (
              <button key={k} type="button" className="chip" aria-pressed={on} onClick={() => go(toggleAm(filters, k))}>
                <Icon name={a.icon} size={18} /> {a.filterLabel ?? a.label}
              </button>
            );
          })}
        </div>
        <select className="select sort-select" aria-label="Sort results" value={filters.sort === "nearest" && !near ? "recommended" : filters.sort ?? "recommended"} onChange={(e) => sortBy(e.target.value as SortKey)} disabled={locating}>
          {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => <option key={k} value={k}>{SORT_LABEL[k]}</option>)}
        </select>
      </div>
      {locating ? <p className="small muted" role="status">Finding where you are…</p> : null}
      {locErr ? <p className="notice" role="alert">{locErr}</p> : null}

      {open ? (
        <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Filters" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="sheet stack gap-6">
            <div className="row between"><h2>Filters</h2><button className="btn btn-quiet btn-sm" onClick={() => setOpen(false)} aria-label="Close filters"><Icon name="x" size={18} /></button></div>

            <section className="stack gap-3"><h4>Price a night</h4>
              <div className="row wrap gap-2">
                {PRICE_PRESETS.map((p) => {
                  const on = draft.minPrice === ("min" in p ? p.min : undefined) && draft.maxPrice === ("max" in p ? p.max : undefined);
                  return <button key={p.label} type="button" className="chip" aria-pressed={on} onClick={() => setDraft({ ...draft, minPrice: on ? undefined : "min" in p ? p.min : undefined, maxPrice: on ? undefined : "max" in p ? p.max : undefined })}>{p.label}</button>;
                })}
              </div></section>

            <section className="stack gap-3"><h4>Type of room</h4>
              <div className="row wrap gap-2">
                {KINDS.map((k) => <button key={k} type="button" className="chip" aria-pressed={draft.kind === k} onClick={() => setDraft({ ...draft, kind: draft.kind === k ? undefined : k })}>{ROOM_KIND_LABEL[k]}</button>)}
              </div></section>

            <section className="stack gap-3"><h4>Must have</h4>
              <p className="small muted">Only rooms that include these, not ones that charge extra.</p>
              <div className="row wrap gap-2">
                {FILTER_AMENITIES.map((a) => (
                  <button key={a.key} type="button" className="chip" aria-pressed={draft.amenities?.includes(a.key) ?? false} onClick={() => setDraft(toggleAm(draft, a.key))}>
                    <Icon name={a.icon} size={18} /> {a.filterLabel ?? a.label}
                  </button>
                ))}
              </div></section>

            <div className="row gap-3">
              <button className="btn btn-quiet grow" type="button" onClick={() => { const c = { state: filters.state, area: filters.area, q: filters.q, checkIn: filters.checkIn, checkOut: filters.checkOut, guests: filters.guests }; setOpen(false); go(c); }}>Clear all</button>
              <button className="btn grow" type="button" onClick={() => { setOpen(false); go(draft); }}>Show places</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
