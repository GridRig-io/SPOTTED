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
        <p>List a flat, guest house or short-let in any state we cover. Your first 2 months are free. Each room needs at least 5 photos and answers to all {AMENITY_COUNT} amenity questions, and you drop an exact pin so guests can find you. A Spotted reviewer checks every listing before it goes live.</p>
        <div className="row wrap gap-2"><Link href="/host/start" className="btn btn-accent">List your place</Link><Link href="/host" className="btn btn-quiet">How hosting works</Link></div>
      </section>
      <section id="claim" className="stack gap-3">
        <h2>Claim a listing</h2>
        <p>If we listed your place before you joined, open it from the search results and tap <b>Ask to claim this place</b>. We will check with you and then hand it over.</p>
        <Link href="/search" className="btn btn-quiet" style={{ alignSelf: "flex-start" }}>Browse places</Link>
      </section>
    </div>
  );
}
