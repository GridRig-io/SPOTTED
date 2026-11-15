"use client";
import { useState } from "react";
import { AMENITIES, AMENITY_GROUPS, STATE_LABEL, type AmenityDef, type AmenityState } from "@spotted/tokens";
import { saveAnswers, type HostAnswer } from "@spotted/core";
import { Icon } from "@/components/Icon";
import type { TabProps } from "../ListingEditor";
import { SaveBar } from "./SaveBar";

type Draft = Record<string, { state: AmenityState | null; spec: string; note: string; cost: string }>;
const SHARED = AMENITIES.filter((a) => a.scope === "shared");
const ROOM = AMENITIES.filter((a) => a.scope === "room");

function toDraft(defs: AmenityDef[], answers: HostAnswer[]): Draft {
  const d: Draft = {};
  for (const a of defs) {
    const x = answers.find((y) => y.amenity_key === a.key);
    d[a.key] = { state: x?.state ?? null, spec: x?.spec_value != null ? String(x.spec_value) : a.spec === "text" ? x?.note ?? "" : "", note: a.spec === "text" ? "" : x?.note ?? "", cost: x?.extra_cost_ngn != null ? String(x.extra_cost_ngn) : "" };
  }
  return d;
}
function fromDraft(defs: AmenityDef[], d: Draft): HostAnswer[] {
  return defs.filter((a) => d[a.key].state).map((a) => {
    const v = d[a.key];
    const numeric = a.spec === "hours" || a.spec === "mbps" || a.spec === "count";
    return {
      amenity_key: a.key, room_id: null, state: v.state!,
      spec_value: numeric && v.spec ? Number(v.spec) : null,
      note: a.spec === "text" ? v.spec || null : v.note || null,
      extra_cost_ngn: v.state === "paid" ? Number(v.cost) || 0 : null,
    };
  });
}

/** Every question has exactly three answers, so nothing is ever left grey for guests. */
export function QuestionsTab({ b, reload, db, onNext }: TabProps) {
  const [scope, setScope] = useState<string>("shared");
  return (
    <section className="stack gap-4">
      <h2>The {AMENITIES.length} questions</h2>
      <p className="muted">For each one, choose <b>Included</b> (in the price), <b>Extra cost</b> (say how much) or <b>Not offered</b>. Whole-place questions are answered once; a few are per room.</p>
      <div className="row wrap gap-2" role="tablist" aria-label="Which questions">
        <button type="button" role="tab" className="chip" aria-selected={scope === "shared"} onClick={() => setScope("shared")}>Whole place ({SHARED.length})</button>
        {b.rooms.map((r) => <button key={r.id} type="button" role="tab" className="chip" aria-selected={scope === r.id} onClick={() => setScope(r.id)}>{r.name} ({ROOM.length})</button>)}
      </div>
      {b.rooms.length === 0 && scope !== "shared" ? null : (
        <Scope key={scope} defs={scope === "shared" ? SHARED : ROOM} answers={b.answers.filter((a) => (scope === "shared" ? a.room_id === null : a.room_id === scope))}
          save={async (answers) => { await saveAnswers(db, b.property.id, scope === "shared" ? null : scope, answers); await reload(); }}
          onNext={onNext} />
      )}
      {b.rooms.length === 0 ? <p className="notice">Add a room first to answer the room questions (hot water, air conditioning and so on).</p> : null}
    </section>
  );
}

function Scope({ defs, answers, save, onNext }: { defs: AmenityDef[]; answers: HostAnswer[]; save: (a: HostAnswer[]) => Promise<void>; onNext?: () => void }) {
  const [d, setD] = useState<Draft>(() => toDraft(defs, answers));
  const set = (k: string, patch: Partial<Draft[string]>) => setD((x) => ({ ...x, [k]: { ...x[k], ...patch } }));
  const missing = defs.filter((a) => !d[a.key].state).length;
  async function run() {
    for (const a of defs) if (d[a.key].state === "paid" && !(Number(d[a.key].cost) > 0)) throw new Error(`Say how much ${a.label} costs.`);
    await save(fromDraft(defs, d));
  }
  return (
    <>
      <p className={missing ? "notice" : "small muted"}>{missing ? `${missing} still to answer here.` : "All answered here."}</p>
      <div className="card pad">
        {AMENITY_GROUPS.map((g) => {
          const list = defs.filter((a) => a.group === g.key);
          if (!list.length) return null;
          return (
            <div key={g.key} style={{ marginBottom: 8 }}>
              <h4 className="row gap-2" style={{ padding: "10px 0" }}><Icon name={g.icon} size={18} /> {g.label}</h4>
              {list.map((a) => {
                const v = d[a.key];
                return (
                  <div key={a.key} className="amen-q">
                    <span className="row gap-2" style={{ alignItems: "flex-start" }}><Icon name={a.icon} size={20} /><b>{a.label}</b></span>
                    <div className="stack gap-2">
                      <div className="tri" role="radiogroup" aria-label={a.label}>
                        {(["included", "paid", "not_offered"] as AmenityState[]).map((s) => <button key={s} type="button" role="radio" aria-checked={v.state === s} className={s} onClick={() => set(a.key, { state: s })}>{STATE_LABEL[s]}</button>)}
                      </div>
                      {v.state === "paid" ? <input className="input" inputMode="numeric" aria-label={`${a.label} cost in naira`} placeholder="How much? ₦" value={v.cost} onChange={(e) => set(a.key, { cost: e.target.value.replace(/\D/g, "") })} /> : null}
                      {v.state && v.state !== "not_offered" && a.spec ? (
                        <input className="input" inputMode={a.spec === "text" ? "text" : "numeric"} aria-label={a.specLabel ?? a.label} placeholder={a.specLabel ?? ""} value={v.spec}
                          onChange={(e) => set(a.key, { spec: a.spec === "text" ? e.target.value.slice(0, 120) : e.target.value.replace(/[^\d]/g, "") })} />
                      ) : null}
                      {v.state && v.state !== "not_offered" && a.spec !== "text" ? <input className="input" aria-label={`${a.label} note`} placeholder="Short note (optional)" value={v.note} onChange={(e) => set(a.key, { note: e.target.value.slice(0, 120) })} /> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <SaveBar onSave={run} onNext={onNext} />
    </>
  );
}
