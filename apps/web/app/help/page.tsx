import Link from "next/link";
import { AMENITY_COUNT } from "@spotted/tokens";
import { FAQ } from "@spotted/core";

export const metadata = { title: "Help" };


export default function Help() {
  return (
    <div className="container section stack gap-8" style={{ maxWidth: 800 }}>
      <h1>Help</h1>
      <section className="stack gap-3">{FAQ.map(([q, a]) => <details key={q} className="card pad"><summary className="bold" style={{ cursor: "pointer" }}>{q}</summary><p className="muted" style={{ marginTop: 10 }}>{a}</p></details>)}</section>
      <section id="hosts" className="stack gap-3">
        <h2>Hosting on Spotted</h2>
        <p>List a flat or guest house in Abuja. Your first 2 months are free. To publish a room you post at least 5 photos of that room and answer all {AMENITY_COUNT} amenity questions, so guests know what to expect.</p>
        <p className="muted">Host tools (dashboard, calendar, your own website address) are being built. To register interest, email <a className="bold" href="mailto:help@spotted.ng">help@spotted.ng</a>.</p>
      </section>
      <section id="claim" className="stack gap-3">
        <h2>Claim a listing</h2>
        <p>If we listed your place before you joined, open it from the search results and tap <b>Ask to claim this place</b>. We will check with you and then hand it over.</p>
        <Link href="/search" className="btn btn-quiet" style={{ alignSelf: "flex-start" }}>Browse places</Link>
      </section>
    </div>
  );
}
