"use client";
import { useState } from "react";
import { Icon } from "@/components/Icon";

/** Sticky save row: clear feedback after every save, and a way to move on. */
export function SaveBar({ onSave, onNext, label = "Save" }: { onSave: () => Promise<void>; onNext?: () => void; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function run(thenNext: boolean) {
    setBusy(true); setMsg(null);
    try { await onSave(); setMsg({ ok: true, text: "Saved" }); if (thenNext && onNext) onNext(); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not save." }); }
    setBusy(false);
  }
  return (
    <div className="savebar">
      {msg ? <span className={`small ${msg.ok ? "" : ""}`} role={msg.ok ? "status" : "alert"} style={{ color: msg.ok ? "var(--c-forest)" : "var(--c-red)", fontWeight: 600, marginRight: "auto" }}>{msg.ok ? <><Icon name="check" size={14} /> {msg.text}</> : msg.text}</span> : null}
      <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => run(false)}>{busy ? "Saving…" : label}</button>
      {onNext ? <button type="button" className="btn" disabled={busy} onClick={() => run(true)}>Save and continue <Icon name="chevron-right" size={18} /></button> : null}
    </div>
  );
}
