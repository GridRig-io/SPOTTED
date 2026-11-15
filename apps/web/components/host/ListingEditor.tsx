"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AMENITIES, AMENITY_COUNT } from "@spotted/tokens";
import { getListing, listingChecklist, submitListing, type ListingBundle } from "@spotted/core";
import { useAuth } from "@/components/AuthProvider";
import { Icon } from "@/components/Icon";
import { HostGate, STATUS_LABEL } from "./HostGate";
import { DetailsTab } from "./tabs/DetailsTab";
import { LocationTab } from "./tabs/LocationTab";
import { RoomsTab } from "./tabs/RoomsTab";
import { QuestionsTab } from "./tabs/QuestionsTab";
import { PhotosTab } from "./tabs/PhotosTab";
import { CalendarTab } from "./tabs/CalendarTab";

const TABS = [
  { key: "details", label: "Details", icon: "house" },
  { key: "location", label: "Location", icon: "locate-fixed" },
  { key: "rooms", label: "Rooms and prices", icon: "bed" },
  { key: "questions", label: `The ${AMENITY_COUNT} questions`, icon: "circle-check" },
  { key: "photos", label: "Photos", icon: "image" },
  { key: "calendar", label: "Calendar", icon: "calendar-x" },
  { key: "submit", label: "Review and submit", icon: "badge-check" },
] as const;
type TabKey = (typeof TABS)[number]["key"];
export const SHARED_KEYS = AMENITIES.filter((a) => a.scope === "shared").map((a) => a.key);

export function ListingEditor({ id }: { id: string }) { return <HostGate>{() => <Editor id={id} />}</HostGate>; }

function Editor({ id }: { id: string }) {
  const { db } = useAuth();
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const tab = (TABS.find((t) => t.key === sp.get("tab"))?.key ?? "details") as TabKey;
  const [b, setB] = useState<ListingBundle | null | undefined>(undefined);
  const [err, setErr] = useState("");

  const reload = useCallback(async () => {
    if (!db) return;
    try { setB(await getListing(db, id)); } catch (e) { setErr(e instanceof Error ? e.message : "Could not load."); setB(null); }
  }, [db, id]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void reload(); }, [reload]);

  const go = (k: TabKey) => router.push(`${path}?tab=${k}`, { scroll: false });
  if (b === undefined) return <div className="container section"><div className="skeleton" style={{ height: 400 }} /></div>;
  if (!b) return <div className="container section"><p className="alert">{err || "Listing not found."}</p></div>;

  const checklist = listingChecklist(b, AMENITY_COUNT, SHARED_KEYS);
  const doneFor: Partial<Record<TabKey, boolean>> = {
    details: checklist.find((c) => c.key === "details")?.done,
    location: checklist.find((c) => c.key === "location")?.done && checklist.find((c) => c.key === "phone")?.done,
    rooms: checklist.find((c) => c.key === "rooms")?.done,
    questions: checklist.find((c) => c.key === "shared")?.done && b.rooms.length > 0 && b.rooms.every((r) => b.answers.filter((a) => a.room_id === r.id).length >= AMENITY_COUNT - SHARED_KEYS.length),
    photos: b.rooms.length > 0 && b.rooms.every((r) => b.photos.filter((p) => p.room_id === r.id).length >= 5),
  };
  const idx = TABS.findIndex((t) => t.key === tab);
  const next = TABS[idx + 1];
  const props = { b, reload, db: db!, onNext: next ? () => go(next.key) : undefined };

  return (
    <div className="container section stack gap-6">
      <div className="stack gap-2">
        <Link href="/host/dashboard" className="row gap-1 muted small"><Icon name="chevron-left" size={16} /> Host dashboard</Link>
        <div className="row between wrap gap-3">
          <h1 style={{ fontSize: 30, lineHeight: "38px" }}>{b.property.name}</h1>
          <span className={`status-pill ${b.property.status}`}>{STATUS_LABEL[b.property.status]}</span>
        </div>
        {sp.get("new") ? <p className="notice">Created as a draft. Work through the steps in any order. Nothing is shown to guests until a Spotted reviewer approves it.</p> : null}
        {b.property.review_note && b.property.status === "draft" ? <p className="notice"><b>From the Spotted reviewer:</b> {b.property.review_note}</p> : null}
      </div>
      <div className="host-shell">
        <nav className="host-nav" aria-label="Listing steps">
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => go(t.key)} aria-current={t.key === tab ? "page" : undefined}>
              {doneFor[t.key] ? <span className="step-dot done"><Icon name="check" size={13} /></span> : <span className="step-dot"><Icon name={t.icon} size={12} /></span>}
              {t.label}
            </button>
          ))}
        </nav>
        <div className="stack gap-6" style={{ minWidth: 0 }}>
          {tab === "details" ? <DetailsTab {...props} /> : null}
          {tab === "location" ? <LocationTab {...props} /> : null}
          {tab === "rooms" ? <RoomsTab {...props} /> : null}
          {tab === "questions" ? <QuestionsTab {...props} /> : null}
          {tab === "photos" ? <PhotosTab {...props} /> : null}
          {tab === "calendar" ? <CalendarTab {...props} /> : null}
          {tab === "submit" ? <SubmitTab {...props} checklist={checklist} go={go} /> : null}
        </div>
      </div>
    </div>
  );
}

export type TabProps = { b: ListingBundle; reload: () => Promise<void>; db: NonNullable<ReturnType<typeof useAuth>["db"]>; onNext?: () => void };

function SubmitTab({ b, reload, db, checklist, go }: TabProps & { checklist: ReturnType<typeof listingChecklist>; go: (k: TabKey) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const allDone = checklist.every((c) => c.done);
  const tabFor: Record<string, TabKey> = { details: "details", location: "location", phone: "location", rooms: "rooms", shared: "questions", roomsReady: "photos" };
  async function submit() {
    setBusy(true); setErr("");
    try { await submitListing(db, b.property.id); setOk(true); await reload(); } catch (e) { setErr(e instanceof Error ? e.message : "Could not submit."); }
    setBusy(false);
  }
  return (
    <section className="stack gap-4">
      <h2>Review and submit</h2>
      {b.property.status === "published" ? <p className="notice">This listing is live. Changes you make are saved straight away.</p> : null}
      {b.property.status === "pending_review" ? <p className="notice">Submitted. A Spotted reviewer will check it, usually within 2 working days. You can still make changes.</p> : null}
      <div className="card pad table-list">
        {checklist.map((c) => (
          <div key={c.key} className="row between gap-3">
            <span className="row gap-3">{c.done ? <span className="step-dot done"><Icon name="check" size={13} /></span> : <span className="step-dot" />}<span className={c.done ? "" : "strong"}>{c.label}</span></span>
            {!c.done ? <button type="button" className="btn btn-quiet btn-sm" onClick={() => go(tabFor[c.key])}>Fix</button> : null}
          </div>
        ))}
      </div>
      <p className="small muted">A reviewer checks that photos match the answers, the pin is at the place, and nothing is misleading. Listings that put guests at risk are not published.</p>
      {err ? <p className="alert" role="alert">{err}</p> : null}
      {ok ? <p className="notice" role="status">Sent for review. We will let you know here.</p> : null}
      {b.property.status === "draft" ? <button type="button" className="btn btn-accent" style={{ alignSelf: "flex-start" }} disabled={!allDone || busy} onClick={submit}>{busy ? "Submitting…" : "Submit for review"}</button> : null}
    </section>
  );
}
