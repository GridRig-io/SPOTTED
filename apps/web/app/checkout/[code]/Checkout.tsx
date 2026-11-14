"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cancelBooking, formatNaira, formatRange, getBooking, plural, ROOM_KIND_LABEL, type BookingWithPlace } from "@spotted/core";
import { useAuth } from "@/components/AuthProvider";
import { RequireAuth } from "@/components/RequireAuth";
import { Icon } from "@/components/Icon";

export function Checkout({ code }: { code: string }) {
  return <RequireAuth><Inner code={code} /></RequireAuth>;
}

function useCountdown(expires: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expires) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expires]);
  return expires ? Math.max(0, Math.floor((new Date(expires).getTime() - now) / 1000)) : null;
}

function Inner({ code }: { code: string }) {
  const { db, session } = useAuth();
  const router = useRouter();
  const [b, setB] = useState<BookingWithPlace | null | undefined>(undefined);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const left = useCountdown(b?.status === "pending_payment" ? b.expires_at : null);

  useEffect(() => {
    if (!db) return;
    let live = true;
    getBooking(db, code).then((x) => { if (live) setB(x); }).catch((e: Error) => { if (live) { setErr(e.message); setB(null); } });
    return () => { live = false; };
  }, [db, code]);
  useEffect(() => { if (b && b.status === "confirmed") router.replace(`/booking/${code}`); }, [b, code, router]);

  async function pay() {
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/pay/initialize", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` }, body: JSON.stringify({ code }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.url) throw new Error(j.error ?? "Could not start the payment.");
      window.location.href = j.url;
    } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); setBusy(false); }
  }

  if (b === undefined) return <div className="container section"><div className="skeleton" style={{ height: 320, maxWidth: 720 }} /></div>;
  if (!b) return <div className="container section"><p className="alert">{err || "We could not find that booking."}</p></div>;

  const mm = left === null ? "" : `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  const expired = b.status === "expired" || (left !== null && left <= 0);

  return (
    <div className="container section stack gap-6" style={{ maxWidth: 760 }}>
      <Link href={`/place/${b.property?.slug ?? ""}`} className="row gap-1 muted small"><Icon name="chevron-left" size={16} /> Back to the place</Link>
      <h1>Confirm and pay</h1>

      <div className="card pad stack gap-3">
        <div className="row between wrap gap-2"><h3>{b.property?.name}</h3><span className="badge">{b.room ? ROOM_KIND_LABEL[b.room.kind] : ""}</span></div>
        <p className="muted">{b.room?.name} · {b.property?.area?.name}</p>
        <div className="row wrap gap-6 small">
          <span className="row gap-2"><Icon name="calendar" size={18} /> {formatRange(b.check_in, b.check_out)}</span>
          <span className="row gap-2"><Icon name="clock" size={18} /> {plural(b.nights, "night")}</span>
          <span className="row gap-2"><Icon name="users" size={18} /> {plural(b.guests, "guest")}</span>
        </div>
      </div>

      <div className="card pad stack gap-2">
        <div className="total-line"><span>{formatNaira(b.nightly_ngn)} × {plural(b.nights, "night")}</span><span>{formatNaira(b.subtotal_ngn)}</span></div>
        {b.cleaning_fee_ngn ? <div className="total-line"><span>Cleaning fee</span><span>{formatNaira(b.cleaning_fee_ngn)}</span></div> : null}
        {b.service_fee_ngn ? <div className="total-line"><span>Service fee</span><span>{formatNaira(b.service_fee_ngn)}</span></div> : null}
        <div className="total-line bold" style={{ borderTop: "1px solid var(--c-line)", paddingTop: 12, fontSize: 20 }}><span>Total</span><span>{formatNaira(b.total_ngn)}</span></div>
      </div>

      {b.status === "pending_payment" && !expired ? (
        <>
          <div className="notice row gap-2"><Icon name="clock" size={18} /> Your dates are held for <b>{mm || "20:00"}</b>. After that they open up again.</div>
          {err ? <p className="alert" role="alert">{err}</p> : null}
          <button className="btn btn-accent btn-block" onClick={pay} disabled={busy}>{busy ? "Opening secure payment…" : `Pay ${formatNaira(b.total_ngn)}`}</button>
          <p className="caption muted row gap-2"><Icon name="lock" size={14} /> Card details are entered on the payment provider&apos;s page. Spotted never sees or stores them.</p>
          <button className="btn btn-quiet" type="button" onClick={async () => { if (db && confirm("Release these dates?")) { await cancelBooking(db, code).catch(() => {}); router.push("/trips"); } }}>Cancel this booking</button>
        </>
      ) : (
        <div className="stack gap-3">
          <p className="alert">{b.status === "cancelled" ? "This booking was cancelled." : "This hold ran out, so the dates were released."}</p>
          <Link className="btn" href={`/place/${b.property?.slug ?? ""}?room=${b.room_id}`}>Choose dates again</Link>
        </div>
      )}
    </div>
  );
}
