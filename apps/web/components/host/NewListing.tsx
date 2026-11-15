"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createListing, listAreas, listStates, PROPERTY_KIND_LABEL, type Area, type PropertyKind, type State } from "@spotted/core";
import { useAuth } from "@/components/AuthProvider";
import { Icon } from "@/components/Icon";
import { HostGate } from "./HostGate";

export function NewListing() { return <HostGate>{() => <Form />}</HostGate>; }

/** The smallest useful first step: what the place is called and where it is. Everything else comes in the editor. */
function Form() {
  const { db } = useAuth();
  const router = useRouter();
  const [states, setStates] = useState<State[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [state, setState] = useState("fct");
  const [area, setArea] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<PropertyKind>("entire_flat");
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { if (db) listStates(db).then(setStates).catch(() => {}); }, [db]);
  useEffect(() => {
    const s = states.find((x) => x.slug === state);
    if (db && s) listAreas(db, s).then((a) => { setAreas(a); setArea(""); }).catch(() => {});
  }, [db, states, state]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!db) return;
    setErr("");
    if (name.trim().length < 3) { setErr("Give the place a name guests will recognise."); return; }
    const a = areas.find((x) => x.slug === area);
    if (!a) { setErr("Pick the area. If yours is not listed, choose Other areas and type it below."); return; }
    if (a.slug.endsWith("-other") && hint.trim().length < 3) { setErr("Type your area or street, since it is not in the list yet."); return; }
    setBusy(true);
    try {
      const id = await createListing(db, {
        name: name.trim(), kind, area_id: a.id, area_hint: hint.trim(), description: "", house_rules: "",
        check_in_from: "14:00", check_out_by: "11:00", cancellation_policy: "moderate",
      });
      router.push(`/host/listings/${id}?tab=details&new=1`);
    } catch (x) { setErr(x instanceof Error ? x.message : "Could not create the listing."); setBusy(false); }
  }

  const otherPicked = area.endsWith("-other");
  return (
    <div className="container section" style={{ maxWidth: 640 }}>
      <form className="stack gap-6" onSubmit={submit} noValidate>
        <div className="stack gap-2"><span className="eyebrow">Step 2 of 2</span><h1>Add a place</h1><p className="muted">Name and location first. Rooms, photos and the rest come next, saved as you go.</p></div>
        <div className="card pad stack gap-4">
          <div className="field"><label htmlFor="nl-n">Name of the place</label><input id="nl-n" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="For example, Lekki Garden Flat" maxLength={80} /></div>
          <div className="field"><span className="label">What kind of place</span>
            <div className="row wrap gap-2">{(Object.keys(PROPERTY_KIND_LABEL) as PropertyKind[]).map((k) => <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{PROPERTY_KIND_LABEL[k]}</button>)}</div></div>
          <div className="form-grid two">
            <div className="field"><label htmlFor="nl-s">State</label>
              <select id="nl-s" className="select" value={state} onChange={(e) => setState(e.target.value)}>{states.map((s) => <option key={s.slug} value={s.slug}>{s.short_name}</option>)}</select></div>
            <div className="field"><label htmlFor="nl-a">Area</label>
              <select id="nl-a" className="select" value={area} onChange={(e) => setArea(e.target.value)}><option value="">Choose…</option>{areas.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}</select></div>
          </div>
          <div className="field"><label htmlFor="nl-h">{otherPicked ? "Your area or street" : "Nearby street or landmark (optional)"}</label>
            <input id="nl-h" className="input" value={hint} onChange={(e) => setHint(e.target.value)} placeholder={otherPicked ? "For example, Rumuokoro" : "For example, off Admiralty Way"} maxLength={80} />
            <span className="hint">Shown to guests before they book. Keep it general: never the house number.</span></div>
        </div>
        {err ? <p className="alert" role="alert">{err}</p> : null}
        <button className="btn btn-accent" disabled={busy} style={{ alignSelf: "flex-start" }}>{busy ? "Creating…" : <>Create and continue <Icon name="chevron-right" size={18} /></>}</button>
      </form>
    </div>
  );
}
