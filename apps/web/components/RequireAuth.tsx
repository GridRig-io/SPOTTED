"use client";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { SetupNotice } from "./Bits";
import { hasSupabase } from "@/lib/env";

/** Wraps pages that need a signed-in guest. Sends signed-out visitors to /signin and brings them back afterwards. */
export function RequireAuth({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready && !user && hasSupabase) router.replace(`/signin?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }, [ready, user, router]);
  if (!hasSupabase) return <SetupNotice />;
  if (!ready || !user) return <>{fallback ?? <div className="container section"><div className="skeleton" style={{ height: 200 }} /></div>}</>;
  return <>{children}</>;
}
