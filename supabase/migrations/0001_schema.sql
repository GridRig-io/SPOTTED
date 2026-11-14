-- Spotted · 0001 schema
-- Run order: 0001 → 0002 → 0003 → (optional) seed/demo.sql. Safe to read top to bottom.
-- Money is stored as whole naira (integers). Dates use the Africa/Lagos calendar day.

create extension if not exists btree_gist;

-- ───────── enums ─────────
create type user_role        as enum ('guest', 'owner', 'admin');
create type property_kind    as enum ('entire_flat', 'guest_house', 'room_in_home', 'hotel_apartment');
create type property_status  as enum ('draft', 'pending_review', 'published', 'unclaimed', 'suspended');
create type room_kind        as enum ('whole_flat', 'master_room', 'guest_room', 'studio');
create type room_status      as enum ('draft', 'published', 'hidden');
create type amenity_state    as enum ('included', 'paid', 'not_offered');
create type evidence_level   as enum ('declared', 'checked', 'guests');
create type booking_status   as enum ('pending_payment', 'confirmed', 'cancelled', 'completed', 'expired');
create type payment_provider as enum ('paystack', 'flutterwave', 'test');
create type payment_status   as enum ('initiated', 'paid', 'failed', 'needs_refund', 'refunded');

-- ───────── small helpers ─────────
create or replace function lagos_today() returns date language sql stable as
$$ select (now() at time zone 'Africa/Lagos')::date $$;

create or replace function set_updated_at() returns trigger language plpgsql as
$$ begin new.updated_at = now(); return new; end $$;

-- ───────── people ─────────
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text,
  avatar_url  text,
  role        user_role not null default 'guest',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger profiles_updated before update on profiles for each row execute function set_updated_at();

create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as
$$
begin
  insert into profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

-- ───────── places ─────────
create table areas (
  id    serial primary key,
  slug  text not null unique,
  name  text not null,
  lat   numeric(9, 6) not null,
  lng   numeric(9, 6) not null
);

create table properties (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid references profiles (id) on delete set null,   -- null = unclaimed place
  area_id       integer not null references areas (id),
  name          text not null,
  slug          text not null unique,
  kind          property_kind not null default 'entire_flat',
  description   text not null default '',
  house_rules   text not null default '',
  lat           numeric(9, 6),
  lng           numeric(9, 6),
  area_hint     text,                                              -- public: street or landmark, never the door number
  check_in_from  time not null default '14:00',
  check_out_by   time not null default '11:00',
  status        property_status not null default 'draft',
  subdomain     text unique check (subdomain ~ '^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])$'),
  is_demo       boolean not null default false,
  rating_avg    numeric(3, 2) not null default 0,
  rating_count  integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz,
  check (status <> 'published' or owner_id is not null),
  check (status <> 'unclaimed' or owner_id is null)
);
create index on properties (area_id);
create index on properties (owner_id);
create index on properties (status);
create trigger properties_updated before update on properties for each row execute function set_updated_at();

-- Address, gate code and wifi password: only the owner, staff and a confirmed guest can read these.
create table property_private (
  property_id     uuid primary key references properties (id) on delete cascade,
  street_address  text,
  gate_instructions text,
  wifi_name       text,
  wifi_password   text,
  host_phone      text
);

create table rooms (
  id               uuid primary key default gen_random_uuid(),
  property_id      uuid not null references properties (id) on delete cascade,
  name             text not null,
  kind             room_kind not null default 'whole_flat',
  description      text not null default '',
  max_guests       integer not null default 2 check (max_guests between 1 and 20),
  beds             integer not null default 1 check (beds >= 1),
  bathrooms        integer not null default 1 check (bathrooms >= 0),
  price_per_night  integer not null check (price_per_night >= 1000),
  cleaning_fee     integer not null default 0 check (cleaning_fee >= 0),
  min_nights       integer not null default 1 check (min_nights >= 1),
  max_nights       integer not null default 30 check (max_nights >= min_nights),
  status           room_status not null default 'draft',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on rooms (property_id);
create index on rooms (status, price_per_night);
create trigger rooms_updated before update on rooms for each row execute function set_updated_at();

create table room_photos (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references properties (id) on delete cascade,
  room_id      uuid references rooms (id) on delete cascade,        -- null = property-level photo (building, compound)
  url          text,                                                -- real photo (Supabase storage or any https url)
  scene        text,                                                -- illustrated stand-in id, used only when there is no url
  caption      text,
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  check (url is not null or scene is not null)
);
create index on room_photos (room_id, position);
create index on room_photos (property_id);

-- ───────── amenity standard ─────────
create table amenity_catalog (
  key         text primary key,
  group_key   text not null,
  label       text not null,
  icon        text not null,
  scope       text not null check (scope in ('shared', 'room')),
  spec_kind   text,
  spec_label  text,
  filterable  boolean not null default false,
  filter_label text,
  sort        integer not null
);

-- room_id is null for "shared" amenities (answered once per property) and set for "room" amenities.
create table amenity_answers (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid not null references properties (id) on delete cascade,
  room_id        uuid references rooms (id) on delete cascade,
  amenity_key    text not null references amenity_catalog (key),
  state          amenity_state not null,
  spec_value     numeric,
  note           text,
  extra_cost_ngn integer check (extra_cost_ngn is null or extra_cost_ngn >= 0),
  evidence       evidence_level not null default 'declared',
  updated_at     timestamptz not null default now(),
  check (state <> 'paid' or extra_cost_ngn is not null)
);
create unique index amenity_answers_unique on amenity_answers (property_id, coalesce(room_id, '00000000-0000-0000-0000-000000000000'::uuid), amenity_key);
create index on amenity_answers (room_id);
create trigger amenity_answers_updated before update on amenity_answers for each row execute function set_updated_at();

-- Rooms and shared answers must use the right scope.
create or replace function check_amenity_scope() returns trigger language plpgsql as
$$
declare s text;
begin
  select scope into s from amenity_catalog where key = new.amenity_key;
  if s = 'shared' and new.room_id is not null then
    raise exception 'Amenity % is answered once for the whole property, not per room', new.amenity_key;
  elsif s = 'room' and new.room_id is null then
    raise exception 'Amenity % must be answered for each room', new.amenity_key;
  end if;
  if new.room_id is not null and not exists (select 1 from rooms r where r.id = new.room_id and r.property_id = new.property_id) then
    raise exception 'Room does not belong to this property';
  end if;
  return new;
end
$$;
create trigger amenity_answers_scope before insert or update on amenity_answers for each row execute function check_amenity_scope();

-- One row per room × amenity, merging property-level and room-level answers.
create or replace view v_room_amenities with (security_invoker = true) as
select r.id as room_id, c.key as amenity_key, c.group_key, c.label, c.icon, c.scope, c.sort,
       a.state, a.spec_value, a.note, a.extra_cost_ngn, a.evidence
from rooms r
cross join amenity_catalog c
left join amenity_answers a
  on a.amenity_key = c.key
 and a.property_id = r.property_id
 and (a.room_id = r.id or (c.scope = 'shared' and a.room_id is null));

-- Publishing gate: ≥ 5 photos and every amenity answered. Enforced in the database so no client can skip it.
create or replace function enforce_room_publish() returns trigger language plpgsql as
$$
declare
  demo boolean; photos integer; missing integer; total integer;
begin
  if new.status <> 'published' then return new; end if;
  select is_demo into demo from properties where id = new.property_id;

  select count(*) into photos from room_photos p
   where p.room_id = new.id                                    -- the 5 photos must belong to the room itself
     and (demo or p.url is not null);                          -- illustrated stand-ins only count for demo data
  if photos < 5 then
    raise exception 'A room needs at least 5 photos before it can be published (has %)', photos using errcode = 'P0001';
  end if;

  select count(*) into total from amenity_catalog;
  select count(*) into missing from v_room_amenities v where v.room_id = new.id and v.state is null;
  if missing > 0 then
    raise exception 'Answer all % amenities before publishing (% still unanswered)', total, missing using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger rooms_publish_gate before insert or update of status on rooms for each row execute function enforce_room_publish();

-- ───────── bookings & money ─────────
create table app_settings (
  key    text primary key,
  value  jsonb not null,
  note   text
);

create table bookings (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  room_id         uuid not null references rooms (id),
  property_id     uuid not null references properties (id),
  guest_id        uuid not null references profiles (id),
  check_in        date not null,
  check_out       date not null,
  nights          integer generated always as (check_out - check_in) stored,
  guests          integer not null check (guests >= 1),
  nightly_ngn     integer not null,
  subtotal_ngn    integer not null,
  cleaning_fee_ngn integer not null default 0,
  service_fee_ngn integer not null default 0,
  total_ngn       integer not null,
  commission_ngn  integer not null default 0,             -- what Spotted keeps from the host (snapshot at booking time)
  status          booking_status not null default 'pending_payment',
  expires_at      timestamptz,
  cancelled_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  stay            daterange generated always as (daterange(check_in, check_out, '[)')) stored,
  check (check_out > check_in),
  -- The same room can never be held or sold twice for the same night.
  constraint no_double_booking exclude using gist (room_id with =, daterange(check_in, check_out, '[)') with &&)
    where (status in ('pending_payment', 'confirmed', 'completed'))
);
create index on bookings (guest_id, created_at desc);
create index on bookings (property_id, check_in);
create trigger bookings_updated before update on bookings for each row execute function set_updated_at();

create table payments (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings (id) on delete cascade,
  provider    payment_provider not null,
  reference   text not null unique,
  amount_ngn  integer not null,
  status      payment_status not null default 'initiated',
  raw         jsonb,
  created_at  timestamptz not null default now(),
  paid_at     timestamptz
);
create index on payments (booking_id);

create table reviews (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null unique references bookings (id) on delete cascade,
  property_id  uuid not null references properties (id) on delete cascade,
  room_id      uuid not null references rooms (id) on delete cascade,
  guest_id     uuid not null references profiles (id) on delete cascade,
  rating       integer not null check (rating between 1 and 5),
  comment      text,
  created_at   timestamptz not null default now()
);
create index on reviews (property_id, created_at desc);

create or replace function refresh_property_rating() returns trigger language plpgsql security definer set search_path = public as
$$
declare pid uuid := coalesce(new.property_id, old.property_id);
begin
  update properties p set
    rating_avg = coalesce((select round(avg(rating)::numeric, 2) from reviews where property_id = pid), 0),
    rating_count = (select count(*) from reviews where property_id = pid)
  where p.id = pid;
  return null;
end
$$;
create trigger reviews_rating after insert or update or delete on reviews for each row execute function refresh_property_rating();

create table saved_places (
  user_id      uuid not null references profiles (id) on delete cascade,
  property_id  uuid not null references properties (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, property_id)
);

-- Owner claims of places Spotted listed first.
create table claim_requests (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references properties (id) on delete cascade,
  user_id      uuid not null references profiles (id) on delete cascade,
  note         text,
  status       text not null default 'open' check (status in ('open', 'approved', 'rejected')),
  created_at   timestamptz not null default now(),
  unique (property_id, user_id)
);

-- Messages (inbox). Screens ship in a later phase; the tables are here so the data model does not change.
create table conversations (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references properties (id) on delete cascade,
  guest_id     uuid not null references profiles (id) on delete cascade,
  owner_id     uuid not null references profiles (id) on delete cascade,
  booking_id   uuid references bookings (id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (property_id, guest_id)
);
create table messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references conversations (id) on delete cascade,
  sender_id        uuid not null references profiles (id) on delete cascade,
  body             text not null check (length(body) between 1 and 4000),
  created_at       timestamptz not null default now(),
  read_at          timestamptz
);
create index on messages (conversation_id, created_at);
