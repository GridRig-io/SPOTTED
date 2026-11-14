import Link from "next/link";
import { formatNaira, formatRange, type BookingWithPlace } from "@spotted/core";

const LABEL: Record<string, { t: string; cls: string }> = {
  confirmed: { t: "Confirmed", cls: "badge" }, completed: { t: "Completed", cls: "badge" },
  pending_payment: { t: "Waiting for payment", cls: "badge badge-warn" }, cancelled: { t: "Cancelled", cls: "badge badge-red" }, expired: { t: "Expired", cls: "badge badge-red" },
};

export function BookingRow({ b }: { b: BookingWithPlace }) {
  const l = LABEL[b.status];
  const href = b.status === "pending_payment" ? `/checkout/${b.code}` : `/booking/${b.code}`;
  return (
    <Link href={href} className="card pad row between wrap gap-3">
      <div className="stack gap-1">
        <h4>{b.property?.name}</h4>
        <p className="small muted">{b.room?.name} · {b.property?.area?.name}</p>
        <p className="small">{formatRange(b.check_in, b.check_out)}</p>
      </div>
      <div className="stack gap-2" style={{ alignItems: "flex-end" }}><span className={l.cls}>{l.t}</span><span className="bold">{formatNaira(b.total_ngn)}</span></div>
    </Link>
  );
}
