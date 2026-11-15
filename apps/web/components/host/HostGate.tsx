"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { getMyProfile, type Profile } from "@spotted/core";
import { useAuth } from "@/components/AuthProvider";
import { RequireAuth } from "@/components/RequireAuth";

/** Host pages need a signed-in host. Guests are sent to the short registration first. */
export function HostGate({ children }: { children: (p: Profile) => ReactNode }) {
  return <RequireAuth><Inner>{children}</Inner></RequireAuth>;
}

function Inner({ children }: { children: (p: Profile) => ReactNode }) {
  const { db } = useAuth();
  const [p, setP] = useState<Profile | null | undefined>(undefined);
  useEffect(() => { if (db) getMyProfile(db).then(setP).catch(() => setP(null)); }, [db]);
  if (p === undefined) return <div className="container section"><div className="skeleton" style={{ height: 240 }} /></div>;
  if (!p || (p.role !== "owner" && p.role !== "admin")) {
    return (
      <div className="container section" style={{ maxWidth: 560 }}>
        <div className="card pad stack gap-3">
          <h2>Become a host first</h2>
          <p className="muted">It takes a minute: your name and phone number. Then you can add your place.</p>
          <Link className="btn btn-accent" href="/host/start" style={{ alignSelf: "flex-start" }}>List your place</Link>
        </div>
      </div>
    );
  }
  return <>{children(p)}</>;
}

export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", pending_review: "Waiting for review", published: "Live", suspended: "Paused by Spotted", unclaimed: "Unclaimed",
};
