"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyProfile, updateMyProfile, normalizeNgPhone, type Profile } from "@spotted/core";
import { useAuth } from "@/components/AuthProvider";
import { Icon } from "@/components/Icon";
import { RequireAuth } from "@/components/RequireAuth";

export function AccountView() { return <RequireAuth><Inner /></RequireAuth>; }

function Inner() {
  const { db, user, signOut } = useAuth();
  const [p, setP] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => { if (db) getMyProfile(db).then((x) => { setP(x); setName(x?.full_name ?? ""); setPhone(x?.phone ?? ""); }).catch(() => {}); }, [db]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!db) return;
    setMsg(""); setErr("");
    const ph = phone.trim() ? normalizeNgPhone(phone) : "";
    if (phone.trim() && !ph) { setErr("Enter a Nigerian phone number, like 0803 123 4567."); return; }
    try { await updateMyProfile(db, { full_name: name.trim(), ...(ph ? { phone: ph } : {}) }); setMsg("Saved."); } catch (x) { setErr(x instanceof Error ? x.message : "Could not save."); }
  }

  return (
    <div className="container section stack gap-6" style={{ maxWidth: 640 }}>
      <h1>Your account</h1>
      <form className="card pad stack gap-4" onSubmit={save}>
        <div className="field"><label htmlFor="ac-n">Full name</label><input id="ac-n" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
        <div className="field"><label htmlFor="ac-p">Phone</label><input id="ac-p" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" /></div>
        <div className="field"><span className="label">Signed in as</span><span>{user?.email || user?.phone}</span></div>
        {msg ? <p className="notice" role="status">{msg}</p> : null}
        {err ? <p className="alert" role="alert">{err}</p> : null}
        <button className="btn" style={{ alignSelf: "flex-start" }}>Save changes</button>
      </form>
      <div className="card pad stack gap-3">
        <Link href="/trips" className="row between"><span className="row gap-2"><Icon name="luggage" size={20} /> Your trips</span><Icon name="chevron-right" size={18} /></Link>
        <Link href="/saved" className="row between"><span className="row gap-2"><Icon name="heart" size={20} /> Saved places</span><Icon name="chevron-right" size={18} /></Link>
        <Link href="/help" className="row between"><span className="row gap-2"><Icon name="circle-help" size={20} /> Help</span><Icon name="chevron-right" size={18} /></Link>
      </div>
      {p?.role === "owner" || p?.role === "admin" ? (
        <Link href="/host/dashboard" className="card pad row between gap-3" style={{ background: "var(--c-mist)", borderColor: "var(--c-sage)" }}>
          <span className="row gap-3"><span className="iconbox"><Icon name="layout-dashboard" size={22} /></span><span className="stack"><b>Host dashboard</b><span className="small muted">Your listings, bookings and calendar</span></span></span>
          <Icon name="chevron-right" size={18} />
        </Link>
      ) : (
        <Link href="/host/start" className="card pad row between gap-3">
          <span className="row gap-3"><span className="iconbox"><Icon name="house" size={22} /></span><span className="stack"><b>List your place</b><span className="small muted">Free for your first 2 months</span></span></span>
          <Icon name="chevron-right" size={18} />
        </Link>
      )}
      {p?.role === "admin" ? <Link href="/admin/review" className="btn btn-quiet" style={{ alignSelf: "flex-start" }}><Icon name="badge-check" size={18} /> Review listings</Link> : null}
      <button className="btn btn-quiet" style={{ alignSelf: "flex-start" }} onClick={() => signOut()}><Icon name="log-out" size={18} /> Sign out</button>
    </div>
  );
}
