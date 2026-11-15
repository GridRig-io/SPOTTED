"use client";
import { useMemo, useState } from "react";
import { formatDay, nightsBetween, plural, todayInLagos, type BlockedRange } from "@spotted/core";
import { Icon } from "./Icon";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEK = ["M", "T", "W", "T", "F", "S", "S"];
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const overlaps = (a: string, b: string, blocked: BlockedRange[]) => blocked.some((r) => a < r.check_out && b > r.check_in);

/**
 * Same rules and look as the app's date picker: weeks start Monday, taken nights are crossed out,
 * check-out can be the day another guest checks in. Shows two months side by side on wide screens.
 */
export function DateCalendar({ checkIn, checkOut, onChange, blocked = [], minNights = 1, maxNights = 30, months = 1 }: {
  checkIn: string; checkOut: string; onChange: (checkIn: string, checkOut: string) => void;
  blocked?: BlockedRange[]; minNights?: number; maxNights?: number; months?: 1 | 2;
}) {
  const today = todayInLagos();
  const start = checkIn || today;
  const [view, setView] = useState({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 });
  const choosingOut = Boolean(checkIn) && !checkOut;
  const nightBlocked = (d: string) => blocked.some((r) => d >= r.check_in && d < r.check_out);
  const canPickIn = (d: string) => d >= today && !nightBlocked(d);
  const canPickOut = (d: string) => choosingOut && d > checkIn && !overlaps(checkIn, d, blocked) && nightsBetween(checkIn, d) <= maxNights;

  function tap(d: string) {
    if (choosingOut && d > checkIn) { if (canPickOut(d)) onChange(checkIn, d); return; }
    if (canPickIn(d)) onChange(d, "");
  }
  const step = (n: number) => { const t = new Date(Date.UTC(view.y, view.m + n, 1)); setView({ y: t.getUTCFullYear(), m: t.getUTCMonth() }); };
  const prevDisabled = view.y === Number(today.slice(0, 4)) && view.m <= Number(today.slice(5, 7)) - 1;
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const tooShort = nights > 0 && nights < minNights;

  return (
    <div className="cal">
      <div className="cal-summary" aria-live="polite">
        <div className={`cal-sum${!checkIn ? " on" : ""}`}><span className="label">Check in</span><b>{checkIn ? formatDay(checkIn) : "Pick a day"}</b></div>
        <div className={`cal-sum${choosingOut ? " on" : ""}`}><span className="label">Check out</span><b>{checkOut ? formatDay(checkOut) : checkIn ? "Pick a day" : "—"}</b></div>
      </div>
      <div className="cal-months">
        {Array.from({ length: months }, (_, i) => {
          const t = new Date(Date.UTC(view.y, view.m + i, 1));
          return <Month key={i} y={t.getUTCFullYear()} m={t.getUTCMonth()} first={i === 0} last={i === months - 1}
            onPrev={() => step(-1)} onNext={() => step(1)} prevDisabled={prevDisabled}
            checkIn={checkIn} checkOut={checkOut} canPickIn={canPickIn} canPickOut={canPickOut} nightBlocked={nightBlocked} tap={tap} />;
        })}
      </div>
      <p className="caption muted">{tooShort ? <span style={{ color: "var(--c-red)", fontWeight: 600 }}>This room needs at least {plural(minNights, "night")}.</span>
        : nights ? plural(nights, "night") : checkIn ? "Now pick your check-out day." : "Pick your check-in day."}
        {blocked.length ? " Crossed-out days are taken." : ""}</p>
    </div>
  );
}

function Month({ y, m, first, last, onPrev, onNext, prevDisabled, checkIn, checkOut, canPickIn, canPickOut, nightBlocked, tap }: {
  y: number; m: number; first: boolean; last: boolean; onPrev: () => void; onNext: () => void; prevDisabled: boolean;
  checkIn: string; checkOut: string; canPickIn: (d: string) => boolean; canPickOut: (d: string) => boolean; nightBlocked: (d: string) => boolean; tap: (d: string) => void;
}) {
  const cells = useMemo(() => {
    const lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [y, m]);
  return (
    <div className="cal-month">
      <div className="cal-head">
        {first ? <button type="button" className="icon-btn" onClick={onPrev} disabled={prevDisabled} aria-label="Previous month"><Icon name="chevron-left" size={20} /></button> : <span style={{ width: 40 }} />}
        <b>{MONTHS[m]} {y}</b>
        {last ? <button type="button" className="icon-btn" onClick={onNext} aria-label="Next month"><Icon name="chevron-right" size={20} /></button> : <span style={{ width: 40 }} />}
      </div>
      <div className="cal-grid" role="grid" aria-label={`${MONTHS[m]} ${y}`}>
        {WEEK.map((w, i) => <span key={`w${i}`} className="cal-w" aria-hidden="true">{w}</span>)}
        {cells.map((d, i) => {
          if (d === null) return <span key={`b${i}`} />;
          const ds = ymd(y, m, d);
          const enabled = canPickIn(ds) || canPickOut(ds);
          const end = ds === checkIn || ds === checkOut;
          const inside = Boolean(checkIn && checkOut && ds > checkIn && ds < checkOut);
          const taken = nightBlocked(ds);
          return (
            <button key={ds} type="button" disabled={!enabled} onClick={() => tap(ds)}
              className={`cal-day${end ? " end" : ""}${inside ? " in" : ""}${taken ? " taken" : ""}`}
              aria-pressed={end} aria-label={`${d} ${MONTHS[m]}${taken ? ", taken" : ""}`}>{d}</button>
          );
        })}
      </div>
    </div>
  );
}
