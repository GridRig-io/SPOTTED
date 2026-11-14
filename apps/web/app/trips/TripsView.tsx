"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { myBookings, todayInLagos, type BookingWithPlace } from "@spotted/core";
import { useAuth } from "@/components/AuthProvider";
import { BookingRow } from "@/components/BookingRow";
import { Empty } from "@/components/Bits";
import { RequireAuth } from "@/components/RequireAuth";

export function TripsView() { return <RequireAuth><Inner /></RequireAuth>; }

function Inner() {
  const { db } = useAuth();
  const [rows, setRows] = useState<BookingWithPlace[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { if (db) myBookings(db).then(setRows).catch((e: Error) => { setErr(e.message); setRows([]); }); }, [db]);
  const today = todayInLagos();
  const up = rows?.filter((b) => (b.status === "confirmed" || b.status === "pending_payment") && b.check_out >= today).sort((a, b) => a.check_in.localeCompare(b.check_in)) ?? [];
  const past = rows?.filter((b) => b.status === "completed" || (b.status === "confirmed" && b.check_out < today)) ?? [];
  const other = rows?.filter((b) => b.status === "cancelled" || b.status === "expired") ?? [];
  return (
    <div className="container section stack gap-6" style={{ maxWidth: 800 }}>
      <h1>Your trips</h1>
      {err ? <p className="alert">{err}</p> : null}
      {rows === null ? <div className="stack gap-3">{[0, 1].map((i) => <div key={i} className="skeleton" style={{ height: 96 }} />)}</div> : null}
      {rows && !rows.length ? <Empty icon="luggage" title="No trips yet">When you book a place it shows up here, with the address and wifi once your stay is close.<Link className="btn" style={{ marginTop: 16 }} href="/search">Find a place</Link></Empty> : null}
      {up.length ? <section className="stack gap-3"><h2>Upcoming</h2>{up.map((b) => <BookingRow key={b.id} b={b} />)}</section> : null}
      {past.length ? <section className="stack gap-3"><h2>Past stays</h2>{past.map((b) => <BookingRow key={b.id} b={b} />)}</section> : null}
      {other.length ? <section className="stack gap-3"><h2>Cancelled or expired</h2>{other.map((b) => <BookingRow key={b.id} b={b} />)}</section> : null}
    </div>
  );
}
