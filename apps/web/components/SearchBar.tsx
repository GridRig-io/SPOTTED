"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatDay, filtersToParams, plural, type Area, type SearchFilters, type State } from "@spotted/core";
import { DateCalendar } from "./DateCalendar";
import { Icon } from "./Icon";
import { Sheet } from "./Sheet";
import { StatePicker } from "./StatePicker";

/**
 * Where / when / who.
 * Phones get one tap target ("Where to in Lagos?") that opens a full search sheet, like the app.
 * Laptops get the inline bar with a calendar popover. The state picker sits on its own above both.
 */
export function SearchBar({ states, areas, stateSlug, initial = {}, variant = "hero" }: {
  states: State[]; areas: Area[]; stateSlug: string; initial?: SearchFilters; variant?: "hero" | "bar";
}) {
  const router = useRouter();
  const state = states.find((s) => s.slug === stateSlug) ?? states[0];
  const [area, setArea] = useState(initial.area ?? "");
  const [checkIn, setIn] = useState(initial.checkIn ?? "");
  const [checkOut, setOut] = useState(initial.checkOut ?? "");
  const [guests, setGuests] = useState(initial.guests ?? 2);
  const [sheet, setSheet] = useState(false);
  const [cal, setCal] = useState(false);
  const calRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cal) return;
    const close = (e: MouseEvent) => { if (calRef.current && !calRef.current.contains(e.target as Node)) setCal(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setCal(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [cal]);

  function go() {
    const both = checkIn && checkOut;
    const f: SearchFilters = { ...initial, state: state?.slug, area: area || undefined, checkIn: both ? checkIn : undefined, checkOut: both ? checkOut : undefined, guests };
    const p = new URLSearchParams(filtersToParams(f));
    setSheet(false); setCal(false);
    router.push(`/search?${p.toString()}`);
  }

  const areaName = areas.find((a) => a.slug === area)?.name;
  const dates = checkIn && checkOut ? `${formatDay(checkIn)} to ${formatDay(checkOut)}` : checkIn ? `${formatDay(checkIn)} to …` : "";
  const summary = [areaName ?? "Any area", dates || "Any dates", plural(guests, "guest")].join(" · ");

  return (
    <div className={`search-wrap sw-${variant}`}>
      <div className="search-state"><StatePicker states={states} current={state?.slug ?? ""} tone={variant === "hero" ? "dark" : "light"} /></div>

      {/* phones */}
      <button type="button" className="search-pill" onClick={() => setSheet(true)} aria-haspopup="dialog">
        <Icon name="search" size={20} />
        <span className="stack grow" style={{ textAlign: "left", minWidth: 0 }}>
          <b>Where to in {state?.city ?? "Nigeria"}?</b>
          <span className="small muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{summary}</span>
        </span>
        <span className="search-pill-go" aria-hidden="true"><Icon name="sliders-horizontal" size={18} /></span>
      </button>

      {/* laptops and tablets in landscape */}
      <form className="searchbox" role="search" aria-label="Search places" onSubmit={(e) => { e.preventDefault(); go(); }}>
        <div className="field"><label htmlFor="sb-area">Area in {state?.city}</label>
          <select id="sb-area" className="select" value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">All areas</option>
            {areas.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
          </select></div>
        <div className="field" ref={calRef} style={{ position: "relative" }}>
          <span className="label" id="sb-dates-l">Dates</span>
          <button type="button" className="date-trigger" aria-labelledby="sb-dates-l" aria-expanded={cal} onClick={() => setCal((v) => !v)}>
            <Icon name="calendar" size={16} /> {dates || "Add dates"}
          </button>
          {cal ? (
            <div className="popover" role="dialog" aria-label="Choose dates">
              <DateCalendar months={2} checkIn={checkIn} checkOut={checkOut} onChange={(a, b) => { setIn(a); setOut(b); }} />
              <div className="row between gap-2" style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => { setIn(""); setOut(""); }}>Clear</button>
                <button type="button" className="btn btn-sm" onClick={() => setCal(false)} disabled={Boolean(checkIn) && !checkOut}>Done</button>
              </div>
            </div>
          ) : null}
        </div>
        <div className="field"><span className="label" id="sb-guests-l">Guests</span><Stepper value={guests} min={1} max={16} onChange={setGuests} labelledBy="sb-guests-l" /></div>
        <button className="btn btn-accent" type="submit"><Icon name="search" size={20} /> Search</button>
      </form>

      <Sheet open={sheet} onClose={() => setSheet(false)} title={`Search ${state?.short_name ?? ""}`}
        footer={<div className="row gap-3"><button type="button" className="btn btn-quiet" onClick={() => { setArea(""); setIn(""); setOut(""); setGuests(2); }}>Clear</button><button type="button" className="btn btn-accent grow" onClick={go} disabled={Boolean(checkIn) && !checkOut}><Icon name="search" size={18} /> Search</button></div>}>
        <div className="stack gap-6">
          <section className="stack gap-2"><span className="label">State</span><StatePicker states={states} current={state?.slug ?? ""} compact /></section>
          <section className="stack gap-2"><span className="label">Area</span>
            <div className="row wrap gap-2">
              <button type="button" className="chip" aria-pressed={!area} onClick={() => setArea("")}>All of {state?.city}</button>
              {areas.map((a) => <button key={a.slug} type="button" className="chip" aria-pressed={area === a.slug} onClick={() => setArea(area === a.slug ? "" : a.slug)}>{a.name}</button>)}
            </div></section>
          <section className="stack gap-2"><span className="label">Dates</span>
            <DateCalendar checkIn={checkIn} checkOut={checkOut} onChange={(a, b) => { setIn(a); setOut(b); }} /></section>
          <section className="row between"><span className="stack"><b>Guests</b><span className="small muted">Adults and children</span></span><Stepper value={guests} min={1} max={16} onChange={setGuests} label="Guests" /></section>
        </div>
      </Sheet>
    </div>
  );
}

export function Stepper({ value, min, max, onChange, label, labelledBy }: { value: number; min: number; max: number; onChange: (n: number) => void; label?: string; labelledBy?: string }) {
  return (
    <div className="stepper" role="group" aria-label={label} aria-labelledby={labelledBy}>
      <button type="button" className="icon-btn" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Fewer"><Icon name="minus" size={16} /></button>
      <output aria-live="polite">{value}</output>
      <button type="button" className="icon-btn" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="More"><Icon name="plus" size={16} /></button>
    </div>
  );
}
