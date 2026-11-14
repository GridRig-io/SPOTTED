"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { savedRooms, type RoomCard as Card } from "@spotted/core";
import { useAuth } from "@/components/AuthProvider";
import { Empty } from "@/components/Bits";
import { RequireAuth } from "@/components/RequireAuth";
import { RoomCard } from "@/components/RoomCard";

export function SavedView() { return <RequireAuth><Inner /></RequireAuth>; }

function Inner() {
  const { db, savedIds } = useAuth();
  const [cards, setCards] = useState<Card[] | null>(null);
  useEffect(() => { if (db) savedRooms(db).then(setCards).catch(() => setCards([])); }, [db, savedIds.size]);
  return (
    <div className="container section stack gap-6">
      <h1>Saved places</h1>
      {cards === null ? <div className="skeleton" style={{ height: 260 }} /> : null}
      {cards && !cards.length ? <Empty icon="heart" title="Nothing saved yet">Tap the heart on any place to keep it here.<Link className="btn" style={{ marginTop: 16 }} href="/search">Find a place</Link></Empty> : null}
      {cards?.length ? <div className="cards four">{cards.map((c) => <RoomCard key={c.room_id} card={c} />)}</div> : null}
    </div>
  );
}
