"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { addDays, createBooking, formatNaira, nightsBetween, plural, quoteStay, todayInLagos, type BlockedRange, type Quote } from "@spotted/core";
import { Icon } from "./Icon";
import { useAuth } from "./AuthProvider";

function overlaps(a: string, b: string, blocked: BlockedRange[]) {
  return blocked.some((r) => a < r.check_out && b > r.check_in);
}

export function BookingBox({ roomId, price, maxGuests, minNights, maxNights, blocked, initialIn, initialOut, initialGuests }: {
  roomId: string; price: number; maxGuests: number; minNights: number; maxNights: number;
  blocked: BlockedRange[]; initialIn?: string; initialOut?: string; initialGuests?: number;
}) {
  const router = useRouter();
  const { db, user, ready } = useAuth();
  const today = todayInLagos();
  const [checkIn, setIn] = useState(initialIn ?? "");
  const [checkOut, setOut] = useState(initialOut ?? "");
  const [guests, setGuests] = useState(Math.min(initialGuests ?? 1, maxGuests));
  const [result, setResult] = useState<{ key: string; quote: Quote | null; error: string } | null>(null);
  const [actionErr, setActionErr] = useState("");
  const [busy, setBusy] = useState(false);

  const local = useMemo(() => {
    if (!checkIn || !checkOut) return "";
    if (checkOut <= checkIn) return "Check-out must be after check-in.";
    const n = nightsBetween(checkIn, checkOut);
    if (n < minNights) return `This room needs at least ${plural(minNights, "night")}.`;
    if (n > maxNights) return `This room allows at most ${maxNights} nights.`;
    if (overlaps(checkIn, checkOut, blocked)) return "Those dates are taken. Try other dates.";
    return "";
  }, [checkIn, checkOut, minNights, maxNights, blocked]);

  const key = `${roomId}|${checkIn}|${checkOut}|${guests}`;
  const wantQuote = Boolean(db && checkIn && checkOut && !local);
  useEffect(() => {
    if (!db || !wantQuote) return;
    let live = true;
    quoteStay(db, roomId, checkIn, checkOut, guests)
      .then((quote) => { if (live) setResult({ key, quote, error: "" }); })
      .catch((e: Error) => { if (live) setResult({ key, quote: null, error: e.message }); });
    return () => { live = false; };
  }, [db, roomId, checkIn, checkOut, guests, wantQuote, key]);
  const current = result && result.key === key ? result : null;
  const quote = wantQuote ? current?.quote ?? null : null;
  const err = actionErr || (wantQuote ? current?.error ?? "" : "");
  const loadingQuote = wantQuote && !current;

  async function reserve() {
    if (!db) return;
    if (!user) { router.push(`/signin?next=${encodeURIComponent(window.location.pathname + window.location.search)}`); return; }
    setBusy(true); setActionErr("");
    try {
      const b = await createBooking(db, roomId, checkIn, checkOut, guests);
      router.push(`/checkout/${b.code}`);
    } catch (e) { setActionErr(e instanceof Error ? e.message : "Could not reserve. Try again."); setBusy(false); }
  }

  const n = checkIn && checkOut && !local ? nightsBetween(checkIn, checkOut) : 0;
  const canReserve = Boolean(quote?.available) && !busy && ready;

  return (
    <div className="card pad stack gap-4" id="book">
      <p><span className="price"><b style={{ fontSize: 24 }}>{formatNaira(price)}</b></span> <span className="muted">a night</span></p>
      <div className="grid" style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
        <div className="field"><label htmlFor="bb-in">Check in</label>
          <input id="bb-in" className="input" type="date" min={today} value={checkIn} onChange={(e) => { setIn(e.target.value); if (checkOut && e.target.value >= checkOut) setOut(addDays(e.target.value, Math.max(1, minNights))); }} /></div>
        <div className="field"><label htmlFor="bb-out">Check out</label>
          <input id="bb-out" className="input" type="date" min={checkIn ? addDays(checkIn, 1) : today} value={checkOut} onChange={(e) => setOut(e.target.value)} /></div>
      </div>
      <div className="field"><label htmlFor="bb-g">Guests</label>
        <select id="bb-g" className="select" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
          {Array.from({ length: maxGuests }, (_, i) => i + 1).map((g) => <option key={g} value={g}>{plural(g, "guest")}</option>)}
        </select></div>

      {blocked.length ? <p className="caption muted">Taken: {blocked.slice(0, 3).map((r) => `${r.check_in.slice(5).replace("-", "/")} to ${r.check_out.slice(5).replace("-", "/")}`).join(", ")}{blocked.length > 3 ? " and more" : ""} (month/day)</p> : null}
      {local ? <p className="alert" role="alert">{local}</p> : null}
      {err ? <p className="alert" role="alert">{err}</p> : null}
      {quote && !quote.available ? <p className="alert" role="alert">Those dates are no longer available.</p> : null}

      {loadingQuote ? <div className="skeleton" style={{ height: 96 }} aria-label="Working out the price" /> : null}
      {quote && quote.available ? (
        <div className="stack gap-2 small" aria-live="polite">
          <div className="total-line"><span>{formatNaira(quote.nightly_ngn)} × {plural(quote.nights, "night")}</span><span>{formatNaira(quote.subtotal_ngn)}</span></div>
          {quote.cleaning_fee_ngn ? <div className="total-line"><span>Cleaning fee</span><span>{formatNaira(quote.cleaning_fee_ngn)}</span></div> : null}
          {quote.service_fee_ngn ? <div className="total-line"><span>Service fee</span><span>{formatNaira(quote.service_fee_ngn)}</span></div> : null}
          <div className="total-line bold" style={{ borderTop: "1px solid var(--c-line)", paddingTop: 10, fontSize: 18 }}><span>Total</span><span>{formatNaira(quote.total_ngn)}</span></div>
        </div>
      ) : null}

      <button className="btn btn-accent btn-block" disabled={!canReserve && Boolean(user)} onClick={reserve} type="button">
        {busy ? "Holding your dates…" : user || !ready ? (n ? "Reserve" : "Choose your dates") : "Sign in to reserve"}
      </button>
      <p className="caption muted row gap-2"><Icon name="lock" size={14} /> You are not charged until the next step. Your dates are held for 20 minutes while you pay.</p>
    </div>
  );
}
