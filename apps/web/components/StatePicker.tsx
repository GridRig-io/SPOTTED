"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { State } from "@spotted/core";
import { rememberState } from "@/lib/state";
import { Icon } from "./Icon";
import { Sheet } from "./Sheet";

/**
 * The state is chosen on its own, separate from the area. Search covers one state at a time.
 * Changing it keeps the dates and guests, drops the area (areas belong to a state) and remembers the choice.
 */
export function StatePicker({ states, current, tone = "light", compact }: { states: State[]; current: string; tone?: "light" | "dark"; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const cur = states.find((s) => s.slug === current) ?? states[0];

  function choose(slug: string) {
    rememberState(slug);
    setOpen(false);
    const p = new URLSearchParams(sp.toString());
    p.set("state", slug); p.delete("area"); p.delete("page"); p.delete("near");
    if (p.get("sort") === "nearest") p.delete("sort");
    router.push(`${path.startsWith("/search") ? "/search" : "/"}?${p.toString()}`);
  }

  return (
    <>
      <button type="button" className={`state-btn ${tone}${compact ? " compact" : ""}`} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`State: ${cur?.short_name ?? "choose"}. Change state`}>
        <Icon name="map-pin" size={16} />
        <span className="state-btn-label"><span className="state-btn-eyebrow">State</span><b>{cur?.short_name ?? "Choose a state"}</b></span>
        <Icon name="chevron-down" size={16} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Which state?">
        <p className="small muted" style={{ marginBottom: 12 }}>Search shows one state at a time. You can switch any time.</p>
        <div className="state-list" role="radiogroup" aria-label="States">
          {states.map((s) => (
            <button key={s.slug} type="button" role="radio" aria-checked={s.slug === cur?.slug} className="state-row" onClick={() => choose(s.slug)}>
              <span className="stack"><b>{s.short_name}</b><span className="small muted">{s.city}</span></span>
              {s.slug === cur?.slug ? <Icon name="check" size={20} color="var(--c-forest)" /> : null}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
