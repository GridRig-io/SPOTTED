"use client";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AMENITIES } from "@spotted/tokens";
import { PRICE_PRESETS, ROOM_KIND_LABEL, SORT_LABEL, activeFilterCount, filtersToParams, type SearchFilters, type SortKey } from "@spotted/core";
import { Icon } from "./Icon";

const KINDS = ["whole_flat", "master_room", "guest_room", "studio"] as const;
const FILTER_AMENITIES = AMENITIES.filter((a) => a.filterable);

/** Quick chips under the search bar + a full filter sheet. Everything lives in the URL so results can be shared. */
export function FilterBar({ filters }: { filters: SearchFilters }) {
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SearchFilters>(filters);

  const go = (f: SearchFilters) => {
    const p = new URLSearchParams(filtersToParams(f)).toString();
    router.push(`${path}${p ? "?" + p : ""}`);
  };
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
        <select className="select" style={{ width: "auto", minHeight: 40, borderRadius: 999 }} aria-label="Sort results" value={filters.sort ?? "recommended"} onChange={(e) => go({ ...filters, sort: e.target.value as SortKey })}>
          {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => <option key={k} value={k}>{SORT_LABEL[k]}</option>)}
        </select>
      </div>

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
              <button className="btn btn-quiet grow" type="button" onClick={() => { const c = { area: filters.area, q: filters.q, checkIn: filters.checkIn, checkOut: filters.checkOut, guests: filters.guests }; setOpen(false); go(c); }}>Clear all</button>
              <button className="btn grow" type="button" onClick={() => { setOpen(false); go(draft); }}>Show places</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
