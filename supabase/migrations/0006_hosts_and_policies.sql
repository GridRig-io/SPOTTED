-- Spotted · 0006: owner registration, listing review, date blocks, cancellation policies.
-- Safe to run once on a database that already has 0001 to 0005.

-- ───────── columns ─────────
alter table properties add column if not exists cancellation_policy text not null default 'moderate'
  check (cancellation_policy in ('flexible', 'moderate', 'strict'));
alter table properties add column if not exists review_note text;
alter table properties add column if not exists submitted_at timestamptz;
alter table profiles add column if not exists business_name text;
alter table profiles add column if not exists host_since timestamptz;

-- Days before check-in that a guest can still cancel for a full refund.
create or replace function policy_free_days(p text) returns integer language sql immutable set search_path = public as
$$ select case p when 'flexible' then 1 when 'strict' then 14 else 5 end $$;

-- ───────── guards: hosts edit their listing, Spotted publishes it ─────────
-- Runs for signed-in users only. Database-owned code (rating refresh, admin RPCs, service role) passes through.
create or replace function guard_property_write() returns trigger language plpgsql set search_path = public as
$$
begin
  if current_user not in ('authenticated', 'anon') or is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.is_demo := false; new.rating_avg := 0; new.rating_count := 0; new.published_at := null; new.review_note := null;
    if new.status not in ('draft', 'pending_review') then new.status := 'draft'; end if;
    return new;
  end if;
  if new.owner_id is distinct from old.owner_id then raise exception 'You cannot change who owns a listing' using errcode = 'P0001'; end if;
  if new.is_demo <> old.is_demo or new.rating_avg <> old.rating_avg or new.rating_count <> old.rating_count
     or new.published_at is distinct from old.published_at or new.review_note is distinct from old.review_note then
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
drop trigger if exists properties_guard on properties;
create trigger properties_guard before insert or update on properties for each row execute function guard_property_write();

-- Hosts can only say "declared". Checked and guest-confirmed marks come from Spotted.
create or replace function guard_amenity_evidence() returns trigger language plpgsql set search_path = public as
$$
begin
  if current_user in ('authenticated', 'anon') and not is_admin() then new.evidence := 'declared'; end if;
  return new;
end
$$;
drop trigger if exists amenity_answers_evidence on amenity_answers;
create trigger amenity_answers_evidence before insert or update on amenity_answers for each row execute function guard_amenity_evidence();

-- ───────── date blocks (host closes dates without a booking) ─────────
create table if not exists room_blocks (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references rooms (id) on delete cascade,
  property_id  uuid not null references properties (id) on delete cascade,
  start_date   date not null,
  end_date     date not null,
  note         text check (note is null or length(note) <= 200),
  created_at   timestamptz not null default now(),
  check (end_date > start_date),
  check (end_date - start_date <= 366)
);
create index if not exists room_blocks_room on room_blocks (room_id, start_date);
create index if not exists room_blocks_property on room_blocks (property_id);

create or replace function check_block_room() returns trigger language plpgsql set search_path = public as
$$
begin
  if not exists (select 1 from rooms r where r.id = new.room_id and r.property_id = new.property_id) then
    raise exception 'Room does not belong to this property' using errcode = 'P0001';
  end if;
  return new;
end
$$;
drop trigger if exists room_blocks_room_check on room_blocks;
create trigger room_blocks_room_check before insert or update on room_blocks for each row execute function check_block_room();

alter table room_blocks enable row level security;
revoke all on room_blocks from anon, authenticated;
grant select, insert, delete on room_blocks to authenticated;
grant select, insert, update, delete on room_blocks to service_role;
drop policy if exists blocks_owner on room_blocks;
create policy blocks_owner on room_blocks for all to authenticated
  using (owns_property(property_id) or is_admin()) with check (owns_property(property_id) or is_admin());

-- Availability now respects host blocks, with the same whole-flat rule as bookings.
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
  ) or exists (
    select 1
    from rooms r
    join room_blocks k on k.property_id = r.property_id
    join rooms kr on kr.id = k.room_id
    where r.id = p_room_id
      and daterange(k.start_date, k.end_date, '[)') && daterange(p_check_in, p_check_out, '[)')
      and (k.room_id = r.id or r.kind = 'whole_flat' or kr.kind = 'whole_flat')
  )
$$;

create or replace function room_blocked_ranges(p_room_id uuid)
returns table (check_in date, check_out date) language sql stable security definer set search_path = public as
$$
  select * from (
    select b.check_in, b.check_out
    from rooms r
    join bookings b on b.property_id = r.property_id
    join rooms br on br.id = b.room_id
    where r.id = p_room_id
      and b.check_out >= lagos_today()
      and (b.status in ('confirmed', 'completed') or (b.status = 'pending_payment' and b.expires_at > now()))
      and (b.room_id = r.id or r.kind = 'whole_flat' or br.kind = 'whole_flat')
    union all
    select k.start_date, k.end_date
    from rooms r
    join room_blocks k on k.property_id = r.property_id
    join rooms kr on kr.id = k.room_id
    where r.id = p_room_id
      and k.end_date >= lagos_today()
      and (k.room_id = r.id or r.kind = 'whole_flat' or kr.kind = 'whole_flat')
  ) x order by 1
$$;

-- ───────── owner registration ─────────
create or replace function become_host(p_full_name text, p_phone text, p_business_name text default null)
returns profiles language plpgsql security definer set search_path = public as
$$
declare uid uuid := auth.uid(); p profiles;
begin
  if uid is null then raise exception 'Sign in first' using errcode = '28000'; end if;
  if coalesce(trim(p_full_name), '') = '' then raise exception 'Enter your full name' using errcode = 'P0001'; end if;
  if coalesce(p_phone, '') !~ '^\+234[0-9]{10}$' then raise exception 'Enter a Nigerian phone number, like 0803 123 4567' using errcode = 'P0001'; end if;
  update profiles set
    full_name = trim(p_full_name),
    phone = p_phone,
    business_name = nullif(trim(coalesce(p_business_name, '')), ''),
    role = case when role = 'admin' then 'admin'::user_role else 'owner'::user_role end,
    host_since = coalesce(host_since, now())
  where id = uid
  returning * into p;
  if not found then
    insert into profiles (id, full_name, phone, business_name, role, host_since)
    values (uid, trim(p_full_name), p_phone, nullif(trim(coalesce(p_business_name, '')), ''), 'owner', now())
    returning * into p;
  end if;
  return p;
end
$$;

-- ───────── submit and review ─────────
create or replace function submit_property(p_property_id uuid) returns properties language plpgsql security definer set search_path = public as
$$
declare prop properties; ready integer; priv property_private;
begin
  select * into prop from properties where id = p_property_id for update;
  if not found or prop.owner_id is distinct from auth.uid() then raise exception 'Listing not found' using errcode = 'P0001'; end if;
  if prop.status not in ('draft', 'pending_review') then raise exception 'This listing is not a draft' using errcode = 'P0001'; end if;
  if length(trim(prop.description)) < 40 then raise exception 'Describe the place in at least a couple of sentences' using errcode = 'P0001'; end if;
  select * into priv from property_private where property_id = p_property_id;
  if priv is null or coalesce(trim(priv.street_address), '') = '' or coalesce(trim(priv.host_phone), '') = '' then
    raise exception 'Add the street address and a phone number guests can call (only shown after they book)' using errcode = 'P0001';
  end if;
  if not exists (select 1 from rooms where property_id = p_property_id) then raise exception 'Add at least one room' using errcode = 'P0001'; end if;
  -- Each room must pass the 5-photo and 22-amenity rule (the room trigger raises a clear message if not).
  update rooms set status = 'published' where property_id = p_property_id and status <> 'published';
  select count(*) into ready from rooms where property_id = p_property_id and status = 'published';
  if ready = 0 then raise exception 'Add at least one complete room' using errcode = 'P0001'; end if;
  update properties set status = 'pending_review', submitted_at = now() where id = p_property_id returning * into prop;
  return prop;
end
$$;

create or replace function review_property(p_property_id uuid, p_approve boolean, p_note text default null)
returns properties language plpgsql security definer set search_path = public as
$$
declare prop properties;
begin
  if not is_admin() then raise exception 'Only Spotted reviewers can do this' using errcode = '42501'; end if;
  select * into prop from properties where id = p_property_id for update;
  if not found then raise exception 'Listing not found' using errcode = 'P0001'; end if;
  if p_approve then
    if prop.owner_id is null then raise exception 'A listing needs an owner before it can go live' using errcode = 'P0001'; end if;
    if not exists (select 1 from rooms where property_id = p_property_id and status = 'published') then
      raise exception 'No complete rooms to publish' using errcode = 'P0001';
    end if;
    update properties set status = 'published', published_at = coalesce(published_at, now()), review_note = null where id = p_property_id returning * into prop;
  else
    if coalesce(trim(p_note), '') = '' then raise exception 'Tell the host what to fix' using errcode = 'P0001'; end if;
    update properties set status = 'draft', review_note = trim(p_note) where id = p_property_id returning * into prop;
  end if;
  return prop;
end
$$;

-- ───────── what guests see about the host ─────────
create or replace function property_host(p_property_id uuid)
returns table (first_name text, business_name text, host_since timestamptz, has_phone boolean)
language sql stable security definer set search_path = public as
$$
  select split_part(coalesce(nullif(pr.full_name, ''), 'Your host'), ' ', 1),
         pr.business_name,
         coalesce(pr.host_since, pr.created_at),
         pr.phone is not null
  from properties p join profiles pr on pr.id = p.owner_id
  where p.id = p_property_id and p.status = 'published'
$$;

-- ───────── what hosts see about their bookings ─────────
create or replace function host_bookings()
returns table (
  id uuid, code text, property_id uuid, property_name text, room_id uuid, room_name text,
  check_in date, check_out date, nights integer, guests integer, total_ngn integer, status booking_status,
  guest_first_name text, guest_phone text, created_at timestamptz
) language sql stable security definer set search_path = public as
$$
  select b.id, b.code, b.property_id, p.name, b.room_id, r.name, b.check_in, b.check_out, b.nights, b.guests, b.total_ngn, b.status,
         split_part(coalesce(nullif(g.full_name, ''), 'Guest'), ' ', 1),
         case when b.status in ('confirmed', 'completed') then g.phone end,
         b.created_at
  from bookings b
  join properties p on p.id = b.property_id
  join rooms r on r.id = b.room_id
  left join profiles g on g.id = b.guest_id
  where p.owner_id = auth.uid() and b.status in ('pending_payment', 'confirmed', 'completed', 'cancelled')
  order by b.check_in desc
  limit 200
$$;

-- ───────── cancellation now follows the place's policy ─────────
create or replace function cancel_booking(p_code text) returns bookings language plpgsql security definer set search_path = public as
$$
declare b bookings; pol text; refundable boolean;
begin
  select * into b from bookings where code = p_code and guest_id = auth.uid() for update;
  if not found then raise exception 'Booking not found'; end if;
  if b.status not in ('pending_payment', 'confirmed') then raise exception 'This booking can no longer be cancelled'; end if;
  if b.check_in <= lagos_today() and b.status = 'confirmed' then raise exception 'Stays that have started cannot be cancelled here. Contact the host.'; end if;
  select cancellation_policy into pol from properties where id = b.property_id;
  refundable := (b.check_in - lagos_today()) >= policy_free_days(pol);
  if b.status = 'confirmed' and refundable then
    update payments set status = 'needs_refund' where booking_id = b.id and status = 'paid';
  end if;
  update bookings set status = 'cancelled', cancelled_at = now() where id = b.id returning * into b;
  return b;
end
$$;

-- ───────── photo uploads: images only, 6 MB each ─────────
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    update storage.buckets set file_size_limit = 6291456, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'] where id = 'room-photos';
  end if;
end $$;

-- ───────── grants ─────────
revoke execute on function policy_free_days(text), guard_property_write(), guard_amenity_evidence(), check_block_room(),
  become_host(text, text, text), submit_property(uuid), review_property(uuid, boolean, text), property_host(uuid), host_bookings()
  from public, anon, authenticated;
grant execute on function policy_free_days(text), property_host(uuid) to anon, authenticated;
grant execute on function become_host(text, text, text), submit_property(uuid), review_property(uuid, boolean, text), host_bookings() to authenticated;
grant execute on function room_has_conflict(uuid, date, date, uuid), room_blocked_ranges(uuid) to anon, authenticated;
grant execute on function cancel_booking(text) to authenticated;
grant update (cancellation_policy) on properties to authenticated;
