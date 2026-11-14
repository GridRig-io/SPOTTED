import { AMENITY_GROUPS, EVIDENCE_LABEL, STATE_LABEL, glanceFor, type AmenityMap } from "@spotted/tokens";
import { formatNaira, type RoomAmenityRow } from "@spotted/core";
import { Icon } from "./Icon";

export function rowsToMap(rows: RoomAmenityRow[]): AmenityMap {
  const m: AmenityMap = {};
  for (const r of rows) if (r.state) m[r.amenity_key] = { amenity_key: r.amenity_key, state: r.state, spec_value: r.spec_value, note: r.note, extra_cost_ngn: r.extra_cost_ngn };
  return m;
}

function detail(r: RoomAmenityRow): string | null {
  const bits: string[] = [];
  if (r.state === "included") {
    if (r.amenity_key === "wifi" && r.spec_value) bits.push(`${r.spec_value} Mbps tested`);
    else if (r.amenity_key === "grid_power" && r.spec_value) bits.push(`${r.spec_value} hours a day`);
    else if (r.amenity_key === "parking" && r.spec_value) bits.push(`${r.spec_value} ${r.spec_value === 1 ? "car" : "cars"}`);
  }
  if (r.state === "paid" && r.extra_cost_ngn) bits.push(formatNaira(r.extra_cost_ngn));
  if (r.note) bits.push(r.note);
  if (r.scope === "shared") bits.push("Shared");
  return bits.length ? bits.join(" · ") : null;
}

/** Four big tiles: the questions Abuja guests ask first. Always a plain sentence, never blank. */
export function GlanceTiles({ rows }: { rows: RoomAmenityRow[] }) {
  const g = glanceFor(rowsToMap(rows));
  return (
    <div className="glance">
      {g.map((t) => (
        <div key={t.key} className="tile">
          <span className="iconbox"><Icon name={t.icon} size={22} /></span>
          <div className="stack"><span className="label">{t.label}</span><span className="bold" style={{ lineHeight: "20px" }}>{t.value}</span></div>
        </div>
      ))}
    </div>
  );
}

/** All 22 answers, grouped. Each line is Included, Extra cost or Not offered. */
export function AmenityList({ rows }: { rows: RoomAmenityRow[] }) {
  return (
    <div className="stack">
      <p className="small muted" style={{ marginBottom: 8 }}>
        Every line is <b>Included</b>, <b>Extra cost</b> or <b>Not offered</b>. A <Icon name="badge-check" size={14} color="var(--c-forest)" /> means Spotted checked it or past guests confirmed it. Anything without it is the host&apos;s own word.
      </p>
      <div className="cols-2">
        {AMENITY_GROUPS.map((g) => {
          const list = rows.filter((r) => r.group_key === g.key);
          if (!list.length) return null;
          return (
            <section key={g.key} className="group" aria-label={g.label}>
              <div className="row gap-2" style={{ marginBottom: 6 }}><Icon name={g.icon} size={20} color="var(--c-forest)" /><h4>{g.label}</h4></div>
              {list.map((r) => {
                const st = r.state ?? "not_offered";
                const d = detail(r);
                return (
                  <div key={r.amenity_key} className={`amen-row ${st}`}>
                    <Icon name={r.icon} size={22} color={st === "included" ? "var(--c-forest)" : st === "paid" ? "var(--c-orange)" : "var(--c-soft)"} />
                    <div className="stack">
                      <span className="name">{r.label}</span>
                      {d ? <span className="detail">{d}</span> : null}
                    </div>
                    {r.evidence && r.evidence !== "declared" ? <span title={EVIDENCE_LABEL[r.evidence]} aria-label={EVIDENCE_LABEL[r.evidence]}><Icon name="badge-check" size={16} color="var(--c-forest)" /></span> : null}
                    <span className={`state ${st}`}>{STATE_LABEL[st]}</span>
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}
