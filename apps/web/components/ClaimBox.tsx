"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { claimPlace } from "@spotted/core";
import { useAuth } from "./AuthProvider";

export function ClaimBox({ propertyId }: { propertyId: string }) {
  const { db, user } = useAuth();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState("");
  if (state === "done") return <div className="notice">Thanks. We got your request and will contact you to confirm you run this place.</div>;
  return (
    <form className="card pad stack gap-3" onSubmit={async (e) => {
      e.preventDefault();
      if (!db) return;
      if (!user) { router.push(`/signin?next=${encodeURIComponent(window.location.pathname)}`); return; }
      setState("busy"); setErr("");
      try { await claimPlace(db, propertyId, note); setState("done"); } catch (x) { setErr(x instanceof Error ? x.message : "Try again."); setState("idle"); }
    }}>
      <h3>Is this your place?</h3>
      <div className="field"><label htmlFor="claim-note">How can we reach you, and what is your role here?</label>
        <textarea id="claim-note" className="input" style={{ minHeight: 96, padding: 12 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: I am the owner. Call me on 0803 000 0000." required /></div>
      {err ? <p className="alert" role="alert">{err}</p> : null}
      <button className="btn" disabled={state === "busy"}>{user ? "Ask to claim this place" : "Sign in to claim"}</button>
    </form>
  );
}
