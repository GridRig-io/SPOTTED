-- Spotted · 0007: several states (search one at a time), private exact locations, nearest-first search.

-- ───────── states ─────────
create table if not exists states (
  id          serial primary key,
  slug        text not null unique,
  name        text not null,          -- "Federal Capital Territory"
  short_name  text not null,          -- "Abuja (FCT)"
  city        text not null,          -- main city, used as the map centre
  lat         numeric(9, 6) not null,
  lng         numeric(9, 6) not null,
  sort        integer not null default 100
);
alter table states enable row level security;
revoke all on states from anon, authenticated;
grant select on states to anon, authenticated;
grant select, insert, update, delete on states to service_role;
drop policy if exists states_read on states;
create policy states_read on states for select using (true);

insert into states (slug, name, short_name, city, lat, lng, sort) values
  ('fct', 'Federal Capital Territory', 'Abuja (FCT)', 'Abuja', 9.0765, 7.3986, 1),
  ('lagos', 'Lagos', 'Lagos', 'Lagos', 6.5244, 3.3792, 2),
  ('enugu', 'Enugu', 'Enugu', 'Enugu', 6.4584, 7.5464, 3),
  ('rivers', 'Rivers', 'Rivers', 'Port Harcourt', 4.8156, 7.0498, 4),
  ('oyo', 'Oyo', 'Oyo', 'Ibadan', 7.3775, 3.9470, 5),
  ('kano', 'Kano', 'Kano', 'Kano', 12.0022, 8.5920, 6),
  ('kaduna', 'Kaduna', 'Kaduna', 'Kaduna', 10.5105, 7.4165, 7),
  ('edo', 'Edo', 'Edo', 'Benin City', 6.3350, 5.6037, 8),
  ('delta', 'Delta', 'Delta', 'Asaba', 6.1984, 6.7319, 9),
  ('anambra', 'Anambra', 'Anambra', 'Awka', 6.2104, 7.0741, 10),
  ('imo', 'Imo', 'Imo', 'Owerri', 5.4836, 7.0333, 11),
  ('plateau', 'Plateau', 'Plateau', 'Jos', 9.8965, 8.8583, 12),
  ('cross-river', 'Cross River', 'Cross River', 'Calabar', 4.9757, 8.3417, 13),
  ('akwa-ibom', 'Akwa Ibom', 'Akwa Ibom', 'Uyo', 5.0377, 7.9128, 14),
  ('ogun', 'Ogun', 'Ogun', 'Abeokuta', 7.1475, 3.3619, 15)
on conflict (slug) do nothing;

-- ───────── areas belong to a state ─────────
alter table areas add column if not exists state_id integer references states (id);
update areas set state_id = (select id from states where slug = 'fct') where state_id is null;
alter table areas alter column state_id set not null;
create index if not exists areas_state on areas (state_id);

insert into areas (slug, name, lat, lng, state_id)
select v.slug, v.name, v.lat, v.lng, s.id
from (values
  ('lagos', 'lekki', 'Lekki', 6.4698, 3.5852), ('lagos', 'victoria-island', 'Victoria Island', 6.4281, 3.4219),
  ('lagos', 'ikoyi', 'Ikoyi', 6.4549, 3.4366), ('lagos', 'ikeja', 'Ikeja', 6.6018, 3.3515),
  ('lagos', 'yaba', 'Yaba', 6.5095, 3.3711), ('lagos', 'surulere', 'Surulere', 6.4969, 3.3481),
  ('lagos', 'ajah', 'Ajah', 6.4682, 3.5718), ('lagos', 'gbagada', 'Gbagada', 6.5536, 3.3878),
  ('lagos', 'magodo', 'Magodo', 6.6176, 3.3833), ('lagos', 'festac', 'Festac', 6.4667, 3.2833),
  ('enugu', 'independence-layout', 'Independence Layout', 6.4500, 7.5160), ('enugu', 'enugu-gra', 'GRA, Enugu', 6.4561, 7.5013),
  ('enugu', 'new-haven', 'New Haven', 6.4519, 7.5250), ('enugu', 'trans-ekulu', 'Trans-Ekulu', 6.4810, 7.5160),
  ('enugu', 'achara-layout', 'Achara Layout', 6.4300, 7.4920), ('enugu', 'abakpa', 'Abakpa', 6.4950, 7.5260),
  ('rivers', 'ph-gra', 'GRA, Port Harcourt', 4.8200, 7.0100), ('rivers', 'old-gra', 'Old GRA', 4.7900, 7.0070),
  ('rivers', 'trans-amadi', 'Trans Amadi', 4.8130, 7.0400), ('rivers', 'rumuola', 'Rumuola', 4.8400, 7.0050),
  ('rivers', 'peter-odili', 'Peter Odili Road', 4.8000, 7.0500),
  ('oyo', 'bodija', 'Bodija', 7.4290, 3.9100), ('oyo', 'ibadan-gra', 'GRA, Ibadan', 7.4100, 3.8900), ('oyo', 'ring-road', 'Ring Road', 7.3650, 3.8770)
) as v(state, slug, name, lat, lng)
join states s on s.slug = v.state
on conflict (slug) do nothing;

-- Every state gets a catch-all so a host is never stuck because their area is not listed yet.
insert into areas (slug, name, lat, lng, state_id)
select s.slug || '-other', 'Other areas', s.lat, s.lng, s.id from states s
on conflict (slug) do nothing;

-- ───────── exact location stays private ─────────
alter table property_private add column if not exists lat numeric(9, 6) check (lat is null or lat between 4 and 14.5);
alter table property_private add column if not exists lng numeric(9, 6) check (lng is null or lng between 2.5 and 15);
alter table property_private add column if not exists landmark text check (landmark is null or length(landmark) <= 200);
alter table property_private add column if not exists directions_note text check (directions_note is null or length(directions_note) <= 600);

-- The public map only ever gets a rounded position (about 1 km). The exact pin is shared with confirmed guests.
create or replace function sync_public_location() returns trigger language plpgsql security definer set search_path = public as
$$
begin
  update properties set
    lat = case when new.lat is null then null else round(new.lat, 2) end,
    lng = case when new.lng is null then null else round(new.lng, 2) end
  where id = new.property_id;
  return new;
end
$$;
drop trigger if exists property_private_location on property_private;
create trigger property_private_location after insert or update of lat, lng on property_private for each row execute function sync_public_location();

-- Hosts set the location through property_private, never the public columns directly.
create or replace function guard_property_write() returns trigger language plpgsql set search_path = public as
$$
begin
  if current_user not in ('authenticated', 'anon') or is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.is_demo := false; new.rating_avg := 0; new.rating_count := 0; new.published_at := null; new.review_note := null;
    new.lat := null; new.lng := null;
    if new.status not in ('draft', 'pending_review') then new.status := 'draft'; end if;
    return new;
  end if;
  if new.owner_id is distinct from old.owner_id then raise exception 'You cannot change who owns a listing' using errcode = 'P0001'; end if;
  if new.is_demo <> old.is_demo or new.rating_avg <> old.rating_avg or new.rating_count <> old.rating_count
     or new.published_at is distinct from old.published_at or new.review_note is distinct from old.review_note
     or new.lat is distinct from old.lat or new.lng is distinct from old.lng then
    raise exception 'That field is managed by Spotted' using errcode = 'P0001';
  end if;
  if new.status <> old.status then
    if old.status = 'suspended' then raise exception 'This listing is paused by Spotted. Contact us to reopen it.' using errcode = 'P0001'; end if;
    if new.status = 'published' then raise exception 'Listings go live after a Spotted check. Submit it for review instead.' using errcode = 'P0001'; end if;
    if new.status not in ('draft', 'pending_review') then raise exception 'You cannot set that status' using errcode = 'P0001'; end if;
  end if;
  return new;
end
$$;

-- Demo places: give them an approximate public spot inside their area so the map has something to show.
update properties p set
  lat = round(a.lat + ((('x' || substr(md5(p.slug), 1, 4))::bit(16)::int % 100) - 50) / 10000.0, 2),
  lng = round(a.lng + ((('x' || substr(md5(p.slug), 5, 4))::bit(16)::int % 100) - 50) / 10000.0, 2)
from areas a
where a.id = p.area_id and p.is_demo and p.lat is null;
update property_private pp set lat = p.lat, lng = p.lng,
  landmark = coalesce(pp.landmark, 'Demo listing: ask the host for the nearest landmark')
from properties p where p.id = pp.property_id and p.is_demo and pp.lat is null;

-- ───────── search: one state at a time, nearest first if asked ─────────
drop function if exists search_rooms(text, text, date, date, integer, integer, integer, text[], room_kind, text, integer, integer);
drop view if exists v_room_cards;
create view v_room_cards with (security_invoker = true) as
select
  r.id as room_id, r.property_id, r.name as room_name, r.kind as room_kind,
  r.price_per_night, r.cleaning_fee, r.max_guests, r.beds, r.bathrooms, r.min_nights, r.max_nights,
  p.name as property_name, p.slug as property_slug, p.kind as property_kind, p.area_hint, p.lat, p.lng,
  p.rating_avg, p.rating_count, p.subdomain, p.created_at as listed_at, p.cancellation_policy,
  a.id as area_id, a.slug as area_slug, a.name as area_name,
  s.slug as state_slug, s.short_name as state_name,
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
join states s on s.id = a.state_id
where r.status = 'published' and p.status = 'published';

create or replace function search_rooms(
  p_area text default null, p_q text default null,
  p_check_in date default null, p_check_out date default null, p_guests integer default null,
  p_min integer default null, p_max integer default null,
  p_amenities text[] default '{}', p_kind room_kind default null,
  p_sort text default 'recommended', p_limit integer default 24, p_offset integer default 0,
  p_state text default null, p_near_lat numeric default null, p_near_lng numeric default null
) returns setof v_room_cards language sql stable security invoker set search_path = public as
$$
  select c.*
  from v_room_cards c
  where (p_state is null or c.state_slug = p_state)
    and (p_area is null or c.area_slug = p_area)
    and (p_q is null or c.property_name ilike '%' || p_q || '%' or c.room_name ilike '%' || p_q || '%' or c.area_name ilike '%' || p_q || '%')
    and (p_guests is null or c.max_guests >= p_guests)
    and (p_min is null or c.price_per_night >= p_min)
    and (p_max is null or c.price_per_night <= p_max)
    and (p_kind is null or c.room_kind = p_kind)
    and c.included_keys @> coalesce(p_amenities, '{}')
    and (p_check_in is null or p_check_out is null or not room_has_conflict(c.room_id, p_check_in, p_check_out))
  order by
    case when p_sort = 'nearest' and p_near_lat is not null and c.lat is not null
      then power(c.lat - p_near_lat, 2) + power((c.lng - p_near_lng) * cos(radians(p_near_lat)), 2) end asc nulls last,
    case p_sort when 'price_asc'  then c.price_per_night end asc  nulls last,
    case p_sort when 'price_desc' then c.price_per_night end desc nulls last,
    case p_sort when 'newest'     then extract(epoch from c.listed_at) end desc nulls last,
    c.rating_avg desc, c.rating_count desc, c.room_id
  limit least(greatest(p_limit, 1), 60) offset greatest(p_offset, 0)
$$;

create or replace view v_unclaimed_places with (security_invoker = true) as
select p.id, p.name, p.slug, p.kind, p.area_hint, p.lat, p.lng, a.slug as area_slug, a.name as area_name, s.slug as state_slug
from properties p join areas a on a.id = p.area_id join states s on s.id = a.state_id
where p.status = 'unclaimed';

revoke execute on function sync_public_location() from public, anon, authenticated;
grant select on v_room_cards, v_unclaimed_places to anon, authenticated;
grant execute on function search_rooms(text, text, date, date, integer, integer, integer, text[], room_kind, text, integer, integer, text, numeric, numeric) to anon, authenticated;
