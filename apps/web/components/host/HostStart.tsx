"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { becomeHost, getMyProfile, normalizeNgPhone } from "@spotted/core";
import { useAuth } from "@/components/AuthProvider";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";

/** Owner registration. Signed-out visitors see what it takes, then sign in and come straight back here. */
export function HostStart() {
  const { db, user, ready } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [business, setBusiness] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!db || !user) return;
    getMyProfile(db).then((p) => {
      if (p && (p.role === "owner" || p.role === "admin") && p.host_since) { router.replace("/host/dashboard"); return; }
      setName(p?.full_name ?? ""); setPhone(p?.phone ?? ""); setBusiness(p?.business_name ?? ""); setChecked(true);
    }).catch(() => setChecked(true));
  }, [db, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!db) return;
    setErr("");
    const ph = normalizeNgPhone(phone);
    if (name.trim().split(/\s+/).length < 2) { setErr("Enter your first and last name."); return; }
    if (!ph) { setErr("Enter a Nigerian phone number, like 0803 123 4567."); return; }
    if (!agree) { setErr("Please confirm you own or manage the place."); return; }
    setBusy(true);
    try { await becomeHost(db, name.trim(), ph, business.trim() || undefined); router.push("/host/listings/new"); }
    catch (x) { setErr(x instanceof Error ? x.message : "Could not save. Try again."); setBusy(false); }
  }

  return (
    <div className="container section" style={{ maxWidth: 560 }}>
      <div className="stack gap-6">
        <div className="stack gap-2">
          <Logo height={32} />
          <h1>List your place</h1>
          <p className="muted">Step 1 of 2: tell us who you are. Next, you add the place itself. You can save and come back any time.</p>
        </div>

        {!ready ? <div className="skeleton" style={{ height: 240 }} /> : !user ? (
          <div className="card pad stack gap-4">
            <h3>First, sign in or create an account</h3>
            <p className="muted">Use your phone number or email. It is the same account you would use to book.</p>
            <ul className="stack gap-2 small" style={{ paddingLeft: 18, margin: 0 }}>
              <li>Have your phone handy for a sign-in code or link</li>
              <li>You will need 5 or more photos of each room (you can add them later)</li>
              <li>Best done at the place, so you can drop an exact pin on the map</li>
            </ul>
            <Link className="btn btn-accent" href="/signin?next=/host/start">Sign in to continue</Link>
          </div>
        ) : !checked ? <div className="skeleton" style={{ height: 240 }} /> : (
          <form className="card pad stack gap-4" onSubmit={submit} noValidate>
            <div className="field"><label htmlFor="hs-n">Full name</label><input id="hs-n" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required /><span className="hint">Guests see your first name only.</span></div>
            <div className="field"><label htmlFor="hs-p">Phone number</label><input id="hs-p" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" required /><span className="hint">For Spotted to reach you. Guests only get it after they book.</span></div>
            <div className="field"><label htmlFor="hs-b">Business name (optional)</label><input id="hs-b" className="input" value={business} onChange={(e) => setBusiness(e.target.value)} autoComplete="organization" placeholder="For example, Nwosu Stays" /></div>
            <label className="row gap-3" style={{ alignItems: "flex-start" }}>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ width: 22, height: 22, marginTop: 2, accentColor: "var(--c-forest)" }} />
              <span className="small">I own or manage the place I am listing, and what I tell guests about it will be true.</span>
            </label>
            {err ? <p className="alert" role="alert">{err}</p> : null}
            <button className="btn btn-accent" disabled={busy}>{busy ? "Saving…" : <>Continue <Icon name="chevron-right" size={18} /></>}</button>
          </form>
        )}
      </div>
    </div>
  );
}
