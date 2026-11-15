"use client";
import { useState } from "react";
import { POLICIES, POLICY_KEYS, PROPERTY_KIND_LABEL, updateListing, type CancellationPolicy, type PropertyKind } from "@spotted/core";
import type { TabProps } from "../ListingEditor";
import { SaveBar } from "./SaveBar";

export function DetailsTab({ b, reload, db, onNext }: TabProps) {
  const p = b.property;
  const [name, setName] = useState(p.name);
  const [kind, setKind] = useState<PropertyKind>(p.kind);
  const [description, setDescription] = useState(p.description);
  const [rules, setRules] = useState(p.house_rules);
  const [hint, setHint] = useState(p.area_hint ?? "");
  const [inFrom, setInFrom] = useState(p.check_in_from.slice(0, 5));
  const [outBy, setOutBy] = useState(p.check_out_by.slice(0, 5));
  const [policy, setPolicy] = useState<CancellationPolicy>(p.cancellation_policy);

  async function save() {
    if (name.trim().length < 3) throw new Error("Give the place a name.");
    await updateListing(db, p.id, { name: name.trim(), kind, description: description.trim(), house_rules: rules.trim(), area_hint: hint.trim(), check_in_from: inFrom, check_out_by: outBy, cancellation_policy: policy });
    await reload();
  }

  return (
    <section className="stack gap-4">
      <h2>Details</h2>
      <div className="card pad stack gap-4">
        <div className="field"><label htmlFor="d-n">Name</label><input id="d-n" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
        <div className="field"><span className="label">Kind of place</span>
          <div className="row wrap gap-2">{(Object.keys(PROPERTY_KIND_LABEL) as PropertyKind[]).map((k) => <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{PROPERTY_KIND_LABEL[k]}</button>)}</div></div>
        <div className="field"><label htmlFor="d-d">Describe the place</label>
          <textarea id="d-d" className="input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1500} placeholder="What it is like, who it suits, what is nearby. Be plain and honest." />
          <span className="hint">{description.trim().length < 40 ? `At least 40 characters (${description.trim().length} so far).` : `${description.trim().length} characters.`} Do not include phone numbers or the exact address here.</span></div>
        <div className="field"><label htmlFor="d-h">Nearby street or landmark (public)</label><input id="d-h" className="input" value={hint} onChange={(e) => setHint(e.target.value)} maxLength={80} /><span className="hint">Shown before booking. Keep it general.</span></div>
        <div className="form-grid two">
          <div className="field"><label htmlFor="d-i">Check in from</label><input id="d-i" type="time" className="input" value={inFrom} onChange={(e) => setInFrom(e.target.value)} /></div>
          <div className="field"><label htmlFor="d-o">Check out by</label><input id="d-o" type="time" className="input" value={outBy} onChange={(e) => setOutBy(e.target.value)} /></div>
        </div>
        <div className="field"><label htmlFor="d-r">House rules (optional)</label><textarea id="d-r" className="input" value={rules} onChange={(e) => setRules(e.target.value)} maxLength={1000} placeholder="Quiet hours, visitors, generator times…" /></div>
      </div>
      <div className="card pad stack gap-3">
        <h3>Cancellation policy</h3>
        <p className="small muted">Guests see this before they pay. Flexible policies get more bookings.</p>
        <div className="stack gap-2" role="radiogroup" aria-label="Cancellation policy">
          {POLICY_KEYS.map((k) => (
            <label key={k} className="row gap-3" style={{ alignItems: "flex-start", padding: "10px 12px", borderRadius: 12, border: `1.5px solid ${policy === k ? "var(--c-forest)" : "var(--c-line)"}`, background: "var(--c-white)", cursor: "pointer" }}>
              <input type="radio" name="policy" checked={policy === k} onChange={() => setPolicy(k)} style={{ marginTop: 4, accentColor: "var(--c-forest)" }} />
              <span className="stack"><b>{POLICIES[k].label}</b><span className="small muted">{POLICIES[k].long}</span></span>
            </label>
          ))}
        </div>
      </div>
      <SaveBar onSave={save} onNext={onNext} />
    </section>
  );
}
