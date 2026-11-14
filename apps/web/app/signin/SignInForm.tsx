"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { normalizeNgPhone, sendEmailCode, sendPhoneCode, verifyEmailCode, verifyPhoneCode } from "@spotted/core";
import { useAuth } from "@/components/AuthProvider";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { SetupNotice } from "@/components/Bits";
import { hasSupabase, SITE_URL } from "@/lib/env";
import { safeNext } from "@/lib/api-helpers";

type Mode = "phone" | "email";

export function SignInForm() {
  const { db, user, ready } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [mode, setMode] = useState<Mode>("phone");
  const [value, setValue] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { if (ready && user) router.replace(next); }, [ready, user, next, router]);
  if (!hasSupabase) return <SetupNotice />;

  async function send(e: React.FormEvent) {
    e.preventDefault(); if (!db) return;
    setErr(""); setBusy(true);
    try {
      if (mode === "phone") {
        const phone = normalizeNgPhone(value);
        if (!phone) throw new Error("Enter a Nigerian number, like 0803 123 4567.");
        await sendPhoneCode(db, phone); setSentTo(phone);
      } else {
        const email = value.trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email address.");
        await sendEmailCode(db, email); setSentTo(email);
      }
    } catch (x) { setErr(x instanceof Error ? x.message : "Could not send the code."); }
    setBusy(false);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault(); if (!db || !sentTo) return;
    setErr(""); setBusy(true);
    try {
      if (mode === "phone") await verifyPhoneCode(db, sentTo, code.trim()); else await verifyEmailCode(db, sentTo, code.trim());
      router.replace(next);
    } catch (x) { setErr(x instanceof Error ? x.message : "That code did not work."); setBusy(false); }
  }

  async function google() {
    if (!db) return;
    setErr("");
    const { error } = await db.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${SITE_URL}${next}` } });
    if (error) setErr(error.message);
  }

  return (
    <div className="container section" style={{ maxWidth: 460 }}>
      <div className="card pad stack gap-4">
        <Logo height={36} />
        <div className="stack gap-1"><h2>Sign in or create an account</h2><p className="muted small">We will text or email you a 6-digit code. No password to remember.</p></div>

        {!sentTo ? (
          <form className="stack gap-4" onSubmit={send}>
            <div className="row gap-2" role="tablist" aria-label="How to sign in">
              <button type="button" role="tab" aria-selected={mode === "phone"} className="chip" onClick={() => { setMode("phone"); setValue(""); setErr(""); }}><Icon name="user" size={16} /> Phone</button>
              <button type="button" role="tab" aria-selected={mode === "email"} className="chip" onClick={() => { setMode("email"); setValue(""); setErr(""); }}>Email</button>
            </div>
            <div className="field">
              <label htmlFor="si-v">{mode === "phone" ? "Phone number" : "Email address"}</label>
              <input id="si-v" className="input" inputMode={mode === "phone" ? "tel" : "email"} autoComplete={mode === "phone" ? "tel" : "email"} placeholder={mode === "phone" ? "0803 123 4567" : "you@example.com"} value={value} onChange={(e) => setValue(e.target.value)} required />
            </div>
            {err ? <p className="alert" role="alert">{err}</p> : null}
            <button className="btn" disabled={busy}>{busy ? "Sending…" : "Send my code"}</button>
            <div className="row gap-3 muted small"><hr style={{ flex: 1, border: 0, borderTop: "1px solid var(--c-line)" }} />or<hr style={{ flex: 1, border: 0, borderTop: "1px solid var(--c-line)" }} /></div>
            <button type="button" className="btn btn-quiet" onClick={google}>Continue with Google</button>
          </form>
        ) : (
          <form className="stack gap-4" onSubmit={verify}>
            <p>We sent a code to <b>{sentTo}</b>.</p>
            <div className="field"><label htmlFor="si-c">6-digit code</label>
              <input id="si-c" className="input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus required style={{ letterSpacing: ".4em", fontWeight: 700, fontSize: 20 }} /></div>
            {err ? <p className="alert" role="alert">{err}</p> : null}
            <button className="btn" disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Continue"}</button>
            <button type="button" className="btn btn-quiet" onClick={() => { setSentTo(null); setCode(""); setErr(""); }}>Use a different {mode === "phone" ? "number" : "email"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
