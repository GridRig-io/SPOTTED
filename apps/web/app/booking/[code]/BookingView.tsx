"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cancelBooking, formatNaira, formatRange, formatTime, getBooking, getPrivateDetails, plural, todayInLagos, type BookingWithPlace, type PrivateDetails } from "@spotted/core";
import { useAuth } from "@/components/AuthProvider";
import { Icon } from "@/components/Icon";
import { RequireAuth } from "@/components/RequireAuth";
import { PinMark } from "@/components/Logo";

export function BookingView({ code }: { code: string }) {
  return <RequireAuth><Inner code={code} /></RequireAuth>;
}

function Inner({ code }: { code: string }) {
  const { db, session } = useAuth();
  const sp = useSearchParams();
  const reference = sp.get("reference") || sp.get("trxref") || sp.get("tx_ref") || undefined;
  const returned = sp.get("paid") === "1" || Boolean(reference);
  const [b, setB] = useState<BookingWithPlace | null | undefined>(undefined);
  const [priv, setPriv] = useState<PrivateDetails | null>(null);
  const [checking, setChecking] = useState(returned);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    if (!db) return;
    const x = await getBooking(db, code).catch(() => null);
    setB(x);
    if (x?.status === "confirmed" || x?.status === "completed") setPriv(await getPrivateDetails(db, x.property_id).catch(() => null));
  }, [db, code]);

  useEffect(() => {
    // fetch on mount: the state is set after the request finishes, not synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Coming back from the gateway: ask the server to verify with the gateway, retry for ~45 s (webhooks can be a few seconds slower).
  useEffect(() => {
    if (!returned || !session) return;
    let stop = false;
    (async () => {
      for (let i = 0; i < 15 && !stop; i++) {
        const res = await fetch("/api/pay/verify", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ code, reference }) }).catch(() => null);
        const j = res ? await res.json().catch(() => ({})) : {};
        if (j.status === "confirmed") { await load(); break; }
        await new Promise((r) => setTimeout(r, 3000));
      }
      if (!stop) setChecking(false);
    })();
    return () => { stop = true; };
  }, [returned, session, code, reference, load]);

  if (b === undefined) return <div className="container section"><div className="skeleton" style={{ height: 320, maxWidth: 720 }} /></div>;
  if (!b) return <div className="container section"><p className="alert">We could not find that booking.</p></div>;

  const confirmed = b.status === "confirmed" || b.status === "completed";
  const today = todayInLagos();
  const upcoming = b.check_in > today;

  return (
    <div className="container section stack gap-6" style={{ maxWidth: 760 }}>
      {confirmed ? (
        <div className="card pad row gap-4" style={{ background: "var(--c-forest)", borderColor: "var(--c-forest)" }}>
          <PinMark size={56} />
          <div className="stack gap-1"><span className="eyebrow" style={{ color: "var(--c-sage)" }}>Booking confirmed</span><h1 style={{ color: "var(--c-cream)", fontSize: 28, lineHeight: "36px" }}>{b.property?.name}</h1><p style={{ color: "var(--c-sage)" }}>{formatRange(b.check_in, b.check_out)} · {plural(b.nights, "night")}</p></div>
        </div>
      ) : checking && b.status === "pending_payment" ? (
        <div className="card pad stack gap-2" aria-live="polite"><h2>Checking your payment…</h2><p className="muted">This usually takes a few seconds. Please keep this page open.</p><div className="skeleton" style={{ height: 8 }} /></div>
      ) : b.status === "pending_payment" ? (
        <div className="notice stack gap-3"><p>We have not received your payment yet.</p><div className="row gap-2"><Link className="btn btn-accent btn-sm" href={`/checkout/${code}`}>Continue to payment</Link></div></div>
      ) : (
        <div className="alert">{b.status === "cancelled" ? "This booking was cancelled." : "This booking expired before it was paid."}</div>
      )}
      {err ? <p className="alert" role="alert">{err}</p> : null}

      <div className="card pad stack gap-3">
        <div className="row between wrap gap-2"><span className="eyebrow">Booking code</span><span className="code">{b.code}</span></div>
        <div className="row wrap gap-6 small">
          <span className="row gap-2"><Icon name="calendar" size={18} /> {formatRange(b.check_in, b.check_out)}</span>
          <span className="row gap-2"><Icon name="clock" size={18} /> In from {b.property ? formatTime(b.property.check_in_from) : ""}, out by {b.property ? formatTime(b.property.check_out_by) : ""}</span>
          <span className="row gap-2"><Icon name="users" size={18} /> {plural(b.guests, "guest")}</span>
        </div>
        <p className="muted">{b.room?.name} · {b.property?.area?.name}{b.property?.area_hint ? `, ${b.property.area_hint}` : ""}</p>
        <div className="total-line bold" style={{ borderTop: "1px solid var(--c-line)", paddingTop: 12 }}><span>Total {confirmed ? "paid" : ""}</span><span>{formatNaira(b.total_ngn)}</span></div>
      </div>

      {confirmed ? (
        <div className="card pad stack gap-3">
          <h3>Getting in</h3>
          {priv ? (
            <div className="stack gap-3">
              {priv.street_address ? <p className="row gap-2"><Icon name="map-pin" size={18} /> {priv.street_address}</p> : null}
              {priv.gate_instructions ? <p className="row gap-2"><Icon name="door-closed" size={18} /> {priv.gate_instructions}</p> : null}
              {priv.wifi_name ? <p className="row gap-2"><Icon name="wifi" size={18} /> {priv.wifi_name}{priv.wifi_password ? ` · password ${priv.wifi_password}` : ""}</p> : null}
              {priv.host_phone ? <p className="row gap-2"><Icon name="message-circle" size={18} /> Host: <a className="bold" href={`tel:${priv.host_phone}`}>{priv.host_phone}</a></p> : null}
            </div>
          ) : (
            <p className="muted">{upcoming ? "The exact address, gate instructions and wifi password appear here from the day before your stay. We keep them private until then." : "Details are not available."}</p>
          )}
        </div>
      ) : null}

      {(b.status === "confirmed" && upcoming) ? (
        <button className="btn btn-quiet" style={{ alignSelf: "flex-start" }} onClick={async () => {
          if (!db || !confirm("Cancel this booking? Refunds follow the host's cancellation terms.")) return;
          try { await cancelBooking(db, code); await load(); } catch (e) { setErr(e instanceof Error ? e.message : "Could not cancel."); }
        }}>Cancel booking</button>
      ) : null}
      <Link href="/trips" className="strong" style={{ color: "var(--c-forest)" }}>See all your trips</Link>
    </div>
  );
}
