"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatNaira } from "@spotted/core";
import { useAuth } from "@/components/AuthProvider";
import { Icon } from "@/components/Icon";

/** Stand-in for Paystack or Flutterwave while PAYMENT_PROVIDER=test. No money moves. */
export function TestPay() {
  const sp = useSearchParams();
  const router = useRouter();
  const { session } = useAuth();
  const reference = sp.get("reference") ?? "";
  const amount = Number(sp.get("amount") ?? 0);
  const next = sp.get("next") ?? "/trips";
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function pay() {
    setBusy(true); setErr("");
    const res = await fetch("/api/pay/test-confirm", { method: "POST", headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) }, body: JSON.stringify({ reference }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(j.error ?? "Test payment failed."); setBusy(false); return; }
    const url = new URL(next, window.location.origin);
    url.searchParams.set("reference", reference);
    router.replace(url.pathname + url.search);
  }

  return (
    <div className="container section" style={{ maxWidth: 520 }}>
      <div className="card pad stack gap-4">
        <span className="badge badge-warn" style={{ alignSelf: "flex-start" }}><Icon name="triangle-alert" size={14} /> Test mode. No money moves.</span>
        <h2>Pay {formatNaira(amount)}</h2>
        <p className="muted small">This page replaces Paystack or Flutterwave while you try the booking flow. Switch <code>PAYMENT_PROVIDER</code> in your .env to go live.</p>
        {err ? <p className="alert" role="alert">{err}</p> : null}
        <button className="btn btn-accent" onClick={pay} disabled={busy}>{busy ? "Confirming…" : "Pretend to pay"}</button>
      </div>
    </div>
  );
}
