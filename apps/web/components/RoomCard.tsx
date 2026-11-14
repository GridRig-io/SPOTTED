import Link from "next/link";
import { glanceFor } from "@spotted/tokens";
import { formatNaira, ROOM_KIND_LABEL, PROPERTY_KIND_LABEL, plural, type RoomCard as RoomCardT } from "@spotted/core";
import { Icon } from "./Icon";
import { Photo } from "./Photo";
import { SaveButton } from "./SaveButton";

/** The four things Abuja guests ask about first, shown on every card: bold enough to read, quiet enough not to shout. */
export function GlancePills({ amenities }: { amenities: RoomCardT["amenities"] }) {
  const g = glanceFor(amenities);
  return (
    <div className="rc-amen">
      {g.map((t) => {
        const off = /^No /.test(t.value);
        const paid = /Extra cost/.test(t.value);
        return (
          <div key={t.key} className={`amen-pill${off ? " off" : ""}${paid ? " paid" : ""}`} title={`${t.label}: ${t.value}`}>
            <Icon name={t.icon} size={16} />
            <span>{t.value}</span>
          </div>
        );
      })}
    </div>
  );
}

export function RoomCard({ card, query = "" }: { card: RoomCardT; query?: string }) {
  const href = `/place/${card.property_slug}?room=${card.room_id}${query ? "&" + query.replace(/^\?/, "") : ""}`;
  return (
    <article className="rc">
      <div className="rc-photo">
        <Link href={href} aria-label={`${card.property_name}, ${card.room_name}`}>
          <Photo photo={card.photos[0]} seed={card.room_id} alt={`${card.property_name}, ${card.room_name}`} />
        </Link>
        <SaveButton propertyId={card.property_id} />
        {card.photo_count > 1 ? <span className="count">{card.photo_count} photos</span> : null}
      </div>
      <Link href={href} className="stack gap-2">
        <div className="rc-title">
          <h3 style={{ fontSize: 18, lineHeight: "24px" }}>{card.property_name}</h3>
          {card.rating_count > 0 ? (
            <span className="row gap-1 small bold" aria-label={`Rated ${card.rating_avg} out of 5 by ${card.rating_count} guests`}>
              <Icon name="star" size={14} fill="var(--c-gold)" color="var(--c-gold)" /> {Number(card.rating_avg).toFixed(1)} <span className="muted" style={{ fontWeight: 400 }}>({card.rating_count})</span>
            </span>
          ) : <span className="badge">New</span>}
        </div>
        <p className="small muted">
          {ROOM_KIND_LABEL[card.room_kind]} · {PROPERTY_KIND_LABEL[card.property_kind]} · {card.area_name}
          {card.rooms_in_property > 1 ? ` · ${plural(card.rooms_in_property, "room")} here` : ""}
        </p>
        <GlancePills amenities={card.amenities} />
        <p className="price"><b>{formatNaira(card.price_per_night)}</b> <span className="muted small">a night · sleeps {card.max_guests}</span></p>
      </Link>
    </article>
  );
}
