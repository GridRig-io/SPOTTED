"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  cancellationLine, createBooking, formatDay, formatNaira, nightsBetween, plural, quoteStay, stayTotal,
  type BlockedRange, type CancellationPolicy, type Quote,
} from "@spotted/core";
import { DateCalendar } from "./DateCalendar";
import { Icon } from "./Icon";
import { Sheet } from "./Sheet";
import { Stepper } from "./SearchBar";
import { useAuth } from "./AuthProvider";

const overlaps = (a: string, b: string, blocked: BlockedRange[]) => blocked.some((r) => a < r.check_out && b > r.check_in);

function useWide() {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia("(min-width: 900px)"); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia("(min-width: 900px)").matches,
    () => true,
  );
}

export function BookingBox({ roomId, price, cleaningFee, maxGuests, minNights, maxNights, blocked, policy, initialIn, initialOut, initialGuests }: {
  roomId: string; price: number; cleaningFee: number; maxGuests: number; minNights: number; maxNights: number;
  blocked: BlockedRange[]; policy: CancellationPolicy; initialIn?: string; initialOut?: string; initialGuests?: number;
}) {
  const router = useRouter();
  const wide = useWide();
  const { db, user, ready } = useAuth();
  const [checkIn, setIn] = useState(initialIn ?? "");
  const [checkOut, setOut] = useState(initialOut ?? "");
  const [guests, setGuests] = useState(Math.min(initialGuests ?? 1, maxGuests));
  const [cal, setCal] = useState(false);
  const [result, setResult] = useState<{ key: string; quote: Quote | null; error: string } | null>(null);
  const [actionErr, setActionErr] = useState("");
  const [busy, setBusy] = useState(false);

  const local = useMemo(() => {
    if (!checkIn || !checkOut) return "";
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

  async function reserve() {
    if (!db) return;
    if (!checkIn || !checkOut) { setCal(true); return; }
    if (!user) { router.push(`/signin?next=${encodeURIComponent(`${window.location.pathname}?${new URLSearchParams({ room: roomId, in: checkIn, out: checkOut, guests: String(guests) })}`)}`); return; }
    setBusy(true); setActionErr("");
    try {
      const b = await createBooking(db, roomId, checkIn, checkOut, guests);
      router.push(`/checkout/${b.code}`);
    } catch (e) { setActionErr(e instanceof Error ? e.message : "Could not reserve. Try again."); setBusy(false); }
  }

  const nights = checkIn && checkOut && !local ? nightsBetween(checkIn, checkOut) : 0;
  const estimate = nights ? stayTotal({ price_per_night: price, cleaning_fee: cleaningFee }, nights) : 0;
  const total = quote?.available ? quote.total_ngn : estimate;
  const cancel = cancellationLine(policy, checkIn || null);
  const dateLabel = checkIn && checkOut ? `${formatDay(checkIn)} to ${formatDay(checkOut)}` : "Add your dates";
  const btnLabel = busy ? "Holding your dates…" : !nights ? "Check availability" : !ready || user ? "Reserve" : "Sign in to reserve";
  const disabled = busy || (Boolean(nights) && (!quote?.available || !ready));

  return (
    <>
      <div className="card pad stack gap-4 booking-box" id="book">
        <p>{nights ? <><span className="price"><b style={{ fontSize: 24 }}>{formatNaira(total)}</b></span> <span className="muted">for {plural(nights, "night")}</span></>
          : <><span className="price"><b style={{ fontSize: 24 }}>{formatNaira(price)}</b></span> <span className="muted">a night</span></>}</p>

        <div className="bb-fields">
          <button type="button" className="bb-dates" onClick={() => setCal(true)} aria-haspopup="dialog">
            <span className="stack"><span className="label">Check in</span><b>{checkIn ? formatDay(checkIn) : "Add date"}</b></span>
            <span className="stack"><span className="label">Check out</span><b>{checkOut ? formatDay(checkOut) : "Add date"}</b></span>
          </button>
          <div className="bb-guests"><span className="stack"><span className="label">Guests</span><span className="small muted">Up to {maxGuests}</span></span><Stepper value={guests} min={1} max={maxGuests} onChange={setGuests} label="Guests" /></div>
        </div>

        {local ? <p className="alert" role="alert">{local}</p> : null}
        {err ? <p className="alert" role="alert">{err}</p> : null}
        {quote && !quote.available ? <p className="alert" role="alert">Those dates are no longer available.</p> : null}

        <button className="btn btn-accent btn-block" disabled={disabled} onClick={reserve} type="button">{btnLabel}</button>

        {nights ? (
          <div className="stack gap-2 small" aria-live="polite">
            {wantQuote && !current ? <div className="skeleton" style={{ height: 72 }} aria-label="Working out the price" /> : (
              <>
                <div className="total-line"><span>{formatNaira(quote?.nightly_ngn ?? price)} × {plural(nights, "night")}</span><span>{formatNaira(quote?.subtotal_ngn ?? price * nights)}</span></div>
                {(quote?.cleaning_fee_ngn ?? cleaningFee) ? <div className="total-line"><span>Cleaning fee</span><span>{formatNaira(quote?.cleaning_fee_ngn ?? cleaningFee)}</span></div> : null}
                {quote?.service_fee_ngn ? <div className="total-line"><span>Service fee</span><span>{formatNaira(quote.service_fee_ngn)}</span></div> : null}
                <div className="total-line bold" style={{ borderTop: "1px solid var(--c-line)", paddingTop: 10, fontSize: 18 }}><span>Total</span><span>{formatNaira(total)}</span></div>
              </>
            )}
          </div>
        ) : null}
        <p className={`small row gap-2 ${cancel.free ? "" : "muted"}`} style={{ alignItems: "flex-start", color: cancel.free ? "var(--c-forest)" : undefined }}>
          <Icon name={cancel.free ? "circle-check" : "info"} size={16} /> <a href="#policy"><b>{cancel.text}</b></a>
        </p>
        <p className="caption muted row gap-2"><Icon name="lock" size={14} /> You are not charged yet. Your dates are held for 20 minutes while you pay.</p>
      </div>

      {/* phones: fixed bar above the tab bar */}
      <div className="mobile-reserve">
        <button type="button" className="stack" style={{ textAlign: "left", background: "none", border: 0, padding: 0 }} onClick={() => setCal(true)}>
          <span><b style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>{formatNaira(nights ? total : price)}</b> <span className="muted small">{nights ? `for ${plural(nights, "night")}` : "a night"}</span></span>
          <span className="small" style={{ textDecoration: "underline" }}>{dateLabel}</span>
        </button>
        <button className="btn btn-accent btn-sm" type="button" onClick={reserve} disabled={disabled}>{nights ? (busy ? "Holding…" : "Reserve") : "Check dates"}</button>
      </div>

      <Sheet open={cal} onClose={() => setCal(false)} title="Choose your dates" wide={wide}
        footer={<div className="row gap-3"><button type="button" className="btn btn-quiet" onClick={() => { setIn(""); setOut(""); }}>Clear</button>
          <button type="button" className="btn grow" disabled={!nights} onClick={() => setCal(false)}>{nights ? `Done · ${plural(nights, "night")}` : "Done"}</button></div>}>
        <DateCalendar months={wide ? 2 : 1} checkIn={checkIn} checkOut={checkOut} blocked={blocked} minNights={minNights} maxNights={maxNights}
          onChange={(a, b) => { setIn(a); setOut(b); }} />
      </Sheet>
    </>
  );
}
