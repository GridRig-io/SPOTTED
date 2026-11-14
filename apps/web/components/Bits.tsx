import Link from "next/link";
import { Icon } from "./Icon";

export function SetupNotice() {
  return (
    <div className="container section">
      <div className="card pad stack gap-3" style={{ maxWidth: 640 }}>
        <span className="badge badge-warn"><Icon name="triangle-alert" size={14} /> One step left</span>
        <h2>Connect your Supabase project</h2>
        <p className="muted">The site cannot find your database keys. Copy <code>.env.example</code> to <code>.env</code> in the project root, fill in the two Supabase values, then run <code>npm run env</code> and restart. Full steps are in <code>docs/SETUP.md</code>.</p>
      </div>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="container section">
      <div className="card pad stack gap-3" style={{ maxWidth: 560 }}>
        <h3>We could not load this</h3>
        <p className="muted">{message}</p>
        <Link className="btn btn-quiet" style={{ alignSelf: "flex-start" }} href="/">Back to Explore</Link>
      </div>
    </div>
  );
}

export function CardsSkeleton({ n = 6 }: { n?: number }) {
  return (
    <div className="cards" aria-busy="true" aria-label="Loading places">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="stack gap-3">
          <div className="skeleton" style={{ aspectRatio: "4 / 3", borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 20, width: "70%" }} />
          <div className="skeleton" style={{ height: 14, width: "50%" }} />
          <div className="skeleton" style={{ height: 56 }} />
        </div>
      ))}
    </div>
  );
}

export function Empty({ icon = "search", title, children }: { icon?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <span className="iconbox" style={{ width: 56, height: 56, borderRadius: 18 }}><Icon name={icon} size={28} /></span>
      <h3>{title}</h3>
      {children ? <div className="muted" style={{ maxWidth: 420 }}>{children}</div> : null}
    </div>
  );
}

export function UnclaimedCard({ p }: { p: { name: string; slug: string; area_name: string; area_hint: string | null } }) {
  return (
    <Link href={`/place/${p.slug}`} className="unclaimed">
      <span className="badge badge-warn" style={{ alignSelf: "flex-start" }}>Not claimed yet</span>
      <h4>{p.name}</h4>
      <p className="small muted">{p.area_name}{p.area_hint ? ` · ${p.area_hint}` : ""}</p>
      <p className="small">We found this place but the owner has not joined Spotted, so it cannot be booked here yet.</p>
    </Link>
  );
}
