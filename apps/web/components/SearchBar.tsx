"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addDays, filtersToParams, todayInLagos, type Area, type SearchFilters } from "@spotted/core";
import { Icon } from "./Icon";

/** Where / when / who. Used on the home page and at the top of search results. */
export function SearchBar({ areas, initial = {}, variant = "hero" }: { areas: Area[]; initial?: SearchFilters; variant?: "hero" | "bar" }) {
  const router = useRouter();
  const today = todayInLagos();
  const [area, setArea] = useState(initial.area ?? "");
  const [checkIn, setIn] = useState(initial.checkIn ?? "");
  const [checkOut, setOut] = useState(initial.checkOut ?? "");
  const [guests, setGuests] = useState(String(initial.guests ?? 2));
  const [err, setErr] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if ((checkIn && !checkOut) || (!checkIn && checkOut)) { setErr("Pick both dates, or leave both empty."); return; }
    if (checkIn && checkOut && checkOut <= checkIn) { setErr("Check-out must be after check-in."); return; }
    setErr("");
    const f: SearchFilters = { ...initial, area: area || undefined, checkIn: checkIn || undefined, checkOut: checkOut || undefined, guests: Number(guests) || undefined };
    const p = new URLSearchParams(filtersToParams(f)).toString();
    router.push(`/search${p ? "?" + p : ""}`);
  }

  return (
    <form onSubmit={submit} className={variant === "hero" ? "searchbox" : "searchbox bar"} role="search" aria-label="Search places">
      <div className="field"><label htmlFor="sb-area">Where</label>
        <select id="sb-area" className="select" value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">All of Abuja</option>
          {areas.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
        </select></div>
      <div className="field"><label htmlFor="sb-in">Check in</label>
        <input id="sb-in" className="input" type="date" min={today} value={checkIn} onChange={(e) => { setIn(e.target.value); if (checkOut && e.target.value >= checkOut) setOut(addDays(e.target.value, 1)); }} /></div>
      <div className="field"><label htmlFor="sb-out">Check out</label>
        <input id="sb-out" className="input" type="date" min={checkIn ? addDays(checkIn, 1) : today} value={checkOut} onChange={(e) => setOut(e.target.value)} /></div>
      <div className="field"><label htmlFor="sb-guests">Guests</label>
        <select id="sb-guests" className="select" value={guests} onChange={(e) => setGuests(e.target.value)}>
          {[1, 2, 3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>)}
        </select></div>
      <button className="btn btn-accent" type="submit"><Icon name="search" size={20} /> Search</button>
      {err ? <p className="alert" role="alert" style={{ gridColumn: "1 / -1" }}>{err}</p> : null}
    </form>
  );
}
