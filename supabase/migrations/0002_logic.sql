-- Spotted · 0002 logic: pricing, availability, booking, payments, search.
-- All money maths happens here, on the server. Clients only display what these functions return.

-- ───────── availability ─────────
-- True when the room cannot be sold for these nights. A whole-flat booking blocks every room in the flat, and vice versa.
create or replace function room_has_conflict(p_room_id uuid, p_check_in date, p_check_out date, p_ignore uuid default null)
returns boolean language sql stable security definer set search_path = public as
$$
  select exists (
    select 1
    from rooms r
    join bookings b on b.property_id = r.property_id
    join rooms br on br.id = b.room_id
    where r.id = p_room_id
      and (b.id is distinct from p_ignore)
      and (b.status in ('confirmed', 'completed') or (b.status = 'pending_payment' and b.expires_at > now()))
      and daterange(b.check_in, b.check_out, '[)') && daterange(p_check_in, p_check_out, '[)')
      and (b.room_id = r.id or r.kind = 'whole_flat' or br.kind = 'whole_flat')
  )
$$;

-- Dates a guest cannot pick (own bookings of other people are never exposed, only the blocked nights).
create or replace function room_blocked_ranges(p_room_id uuid)
returns table (check_in date, check_out date) language sql stable security definer set search_path = public as
$$
  select b.check_in, b.check_out
  from rooms r
  join bookings b on b.property_id = r.property_id
  join rooms br on br.id = b.room_id
  where r.id = p_room_id
    and b.check_out >= lagos_today()
    and (b.status in ('confirmed', 'completed') or (b.status = 'pending_payment' and b.expires_at > now()))
    and (b.room_id = r.id or r.kind = 'whole_flat' or br.kind = 'whole_flat')
  order by b.check_in
$$;

-- ───────── pricing ─────────
create or replace function setting_num(p_key text, p_default numeric) returns numeric language sql stable as
$$ select coalesce((select (value #>> '{}')::numeric from app_settings where key = p_key), p_default) $$;

create or replace function quote_stay(p_room_id uuid, p_check_in date, p_check_out date, p_guests integer default 1)
returns jsonb language plpgsql stable security definer set search_path = public as
$$
declare
  r rooms; n integer; sub integer; svc integer; comm integer; total integer;
begin
  select * into r from rooms where id = p_room_id and status = 'published';
  if not found then raise exception 'This room is not available to book'; end if;
  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'Choose a check-out date after check-in';
  end if;
  if p_check_in < lagos_today() then raise exception 'Check-in cannot be in the past'; end if;
  n := p_check_out - p_check_in;
  if n < r.min_nights then raise exception 'This room needs at least % night(s)', r.min_nights; end if;
  if n > r.max_nights then raise exception 'This room allows at most % nights', r.max_nights; end if;
  if p_guests < 1 or p_guests > r.max_guests then raise exception 'This room sleeps up to % guests', r.max_guests; end if;

  sub  := r.price_per_night * n;
  svc  := round(sub * setting_num('guest_service_fee_pct', 0) / 100.0);
  comm := round(sub * setting_num('host_commission_pct', 10) / 100.0);
  total := sub + r.cleaning_fee + svc;

  return jsonb_build_object(
    'room_id', r.id, 'check_in', p_check_in, 'check_out', p_check_out, 'nights', n, 'guests', p_guests,
    'nightly_ngn', r.price_per_night, 'subtotal_ngn', sub, 'cleaning_fee_ngn', r.cleaning_fee,
    'service_fee_ngn', svc, 'total_ngn', total, 'commission_ngn', comm,
    'available', not room_has_conflict(r.id, p_check_in, p_check_out)
  );
end
$$;

-- ───────── booking ─────────
create or replace function make_booking_code() returns text language plpgsql volatile as
$$
declare alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; s text := 'SP-'; i int;
begin
  for i in 1..6 loop s := s || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1); end loop;
  return s;
end
$$;

create or replace function create_booking(p_room_id uuid, p_check_in date, p_check_out date, p_guests integer)
returns bookings language plpgsql security definer set search_path = public as
$$
declare
  uid uuid := auth.uid(); r rooms; prop properties; q jsonb; b bookings; hold integer; tries integer := 0;
begin
  if uid is null then raise exception 'Sign in to book' using errcode = '28000'; end if;
  select * into r from rooms where id = p_room_id and status = 'published';
  if not found then raise exception 'This room is not available to book'; end if;
  select * into prop from properties where id = r.property_id and status = 'published';
  if not found then raise exception 'This place is not available to book'; end if;
  if prop.owner_id = uid then raise exception 'You cannot book your own place'; end if;

  perform pg_advisory_xact_lock(hashtext(r.property_id::text));
  update bookings set status = 'expired' where property_id = r.property_id and status = 'pending_payment' and expires_at <= now();

  q := quote_stay(p_room_id, p_check_in, p_check_out, p_guests);
  if not (q ->> 'available')::boolean then raise exception 'Those dates are no longer available'; end if;

  hold := setting_num('booking_hold_minutes', 20)::integer;
  loop
    begin
      insert into bookings (code, room_id, property_id, guest_id, check_in, check_out, guests,
                            nightly_ngn, subtotal_ngn, cleaning_fee_ngn, service_fee_ngn, total_ngn, commission_ngn, expires_at)
      values (make_booking_code(), r.id, r.property_id, uid, p_check_in, p_check_out, p_guests,
              (q ->> 'nightly_ngn')::int, (q ->> 'subtotal_ngn')::int, (q ->> 'cleaning_fee_ngn')::int,
              (q ->> 'service_fee_ngn')::int, (q ->> 'total_ngn')::int, (q ->> 'commission_ngn')::int,
              now() + make_interval(mins => hold))
      returning * into b;
      return b;
    exception
      when unique_violation then
        tries := tries + 1;
        if tries > 5 then raise; end if;
      when exclusion_violation then
        raise exception 'Those dates are no longer available';
    end;
  end loop;
end
$$;

create or replace function cancel_booking(p_code text) returns bookings language plpgsql security definer set search_path = public as
$$
declare b bookings;
begin
  select * into b from bookings where code = p_code and guest_id = auth.uid() for update;
  if not found then raise exception 'Booking not found'; end if;
  if b.status not in ('pending_payment', 'confirmed') then raise exception 'This booking can no longer be cancelled'; end if;
  if b.check_in <= lagos_today() and b.status = 'confirmed' then raise exception 'Stays that have started cannot be cancelled here. Contact the host.'; end if;
  update bookings set status = 'cancelled', cancelled_at = now() where id = b.id returning * into b;
  return b;
end
$$;

-- ───────── payments (called by the website's server routes with the service role, never by clients) ─────────
create or replace function start_payment(p_booking_id uuid, p_provider payment_provider, p_reference text)
returns payments language plpgsql security definer set search_path = public as
$$
declare b bookings; pay payments;
begin
  select * into b from bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if b.status <> 'pending_payment' or b.expires_at <= now() then raise exception 'This booking is no longer waiting for payment'; end if;
  insert into payments (booking_id, provider, reference, amount_ngn) values (b.id, p_provider, p_reference, b.total_ngn) returning * into pay;
  return pay;
end
$$;

create or replace function confirm_payment(p_reference text, p_amount integer, p_raw jsonb default null)
returns bookings language plpgsql security definer set search_path = public as
$$
declare pay payments; b bookings;
begin
  select * into pay from payments where reference = p_reference for update;
  if not found then raise exception 'Unknown payment reference'; end if;
  select * into b from bookings where id = pay.booking_id for update;

  if pay.status = 'paid' then return b; end if;                       -- webhooks retry: stay idempotent

  if p_amount < pay.amount_ngn then
    update payments set status = 'failed', raw = p_raw where id = pay.id;
    return b;
  end if;

  if b.status = 'pending_payment' then
    update bookings set status = 'confirmed', expires_at = null where id = b.id returning * into b;
  elsif b.status = 'expired' and not room_has_conflict(b.room_id, b.check_in, b.check_out, b.id) then
    begin
      update bookings set status = 'confirmed', expires_at = null where id = b.id returning * into b;
    exception when exclusion_violation then
      update payments set status = 'needs_refund', raw = p_raw, paid_at = now() where id = pay.id;
      return b;
    end;
  else
    update payments set status = 'needs_refund', raw = p_raw, paid_at = now() where id = pay.id;   -- money arrived but the nights are gone
    return b;
  end if;

  update payments set status = 'paid', raw = p_raw, paid_at = now() where id = pay.id;
  return b;
end
$$;

-- ───────── cards & search ─────────
create or replace view v_room_cards with (security_invoker = true) as
select
  r.id as room_id, r.property_id, r.name as room_name, r.kind as room_kind,
  r.price_per_night, r.cleaning_fee, r.max_guests, r.beds, r.bathrooms, r.min_nights, r.max_nights,
  p.name as property_name, p.slug as property_slug, p.kind as property_kind, p.area_hint, p.lat, p.lng,
  p.rating_avg, p.rating_count, p.subdomain, p.created_at as listed_at,
  a.id as area_id, a.slug as area_slug, a.name as area_name,
  (select count(*) from rooms r2 where r2.property_id = p.id and r2.status = 'published')::int as rooms_in_property,
  (select count(*) from room_photos ph where ph.room_id = r.id)::int as photo_count,
  (select coalesce(jsonb_agg(jsonb_build_object('url', x.url, 'scene', x.scene, 'caption', x.caption) order by x.position), '[]'::jsonb)
     from (select * from room_photos ph where ph.room_id = r.id order by ph.position limit 5) x) as photos,
  coalesce((select array_agg(v.amenity_key order by v.sort) from v_room_amenities v where v.room_id = r.id and v.state = 'included'), '{}') as included_keys,
  coalesce((select jsonb_object_agg(v.amenity_key, jsonb_build_object('state', v.state, 'spec_value', v.spec_value, 'note', v.note, 'extra_cost_ngn', v.extra_cost_ngn))
     from v_room_amenities v where v.room_id = r.id and v.state is not null), '{}'::jsonb) as amenities
from rooms r
join properties p on p.id = r.property_id
join areas a on a.id = p.area_id
where r.status = 'published' and p.status = 'published';

create or replace view v_unclaimed_places with (security_invoker = true) as
select p.id, p.name, p.slug, p.kind, p.area_hint, p.lat, p.lng, a.slug as area_slug, a.name as area_name
from properties p join areas a on a.id = p.area_id
where p.status = 'unclaimed';

create or replace function search_rooms(
  p_area text default null, p_q text default null,
  p_check_in date default null, p_check_out date default null, p_guests integer default null,
  p_min integer default null, p_max integer default null,
  p_amenities text[] default '{}', p_kind room_kind default null,
  p_sort text default 'recommended', p_limit integer default 24, p_offset integer default 0
) returns setof v_room_cards language sql stable security invoker as
$$
  select c.*
  from v_room_cards c
  where (p_area is null or c.area_slug = p_area)
    and (p_q is null or c.property_name ilike '%' || p_q || '%' or c.room_name ilike '%' || p_q || '%' or c.area_name ilike '%' || p_q || '%')
    and (p_guests is null or c.max_guests >= p_guests)
    and (p_min is null or c.price_per_night >= p_min)
    and (p_max is null or c.price_per_night <= p_max)
    and (p_kind is null or c.room_kind = p_kind)
    and c.included_keys @> coalesce(p_amenities, '{}')
    and (p_check_in is null or p_check_out is null or not room_has_conflict(c.room_id, p_check_in, p_check_out))
  order by
    case p_sort when 'price_asc'  then c.price_per_night end asc  nulls last,
    case p_sort when 'price_desc' then c.price_per_night end desc nulls last,
    case p_sort when 'newest'     then extract(epoch from c.listed_at) end desc nulls last,
    c.rating_avg desc, c.rating_count desc, c.room_id
  limit least(greatest(p_limit, 1), 60) offset greatest(p_offset, 0)
$$;
