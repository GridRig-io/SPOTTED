-- Spotted · 0003 security: row level security, grants, storage.
-- Rule of thumb: guests read published things and their own bookings; owners manage their own places;
-- money and booking writes happen only through the functions in 0002.

-- helpers used inside policies (security definer so policies never recurse)
create or replace function owns_property(pid uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from properties where id = pid and owner_id = auth.uid()) $$;

create or replace function has_active_stay(pid uuid) returns boolean language sql stable security definer set search_path = public as
$$
  select exists (
    select 1 from bookings b
    where b.property_id = pid and b.guest_id = auth.uid() and b.status in ('confirmed', 'completed')
      and lagos_today() between b.check_in - 1 and b.check_out
  )
$$;

-- ───────── lock everything first, then open only what is needed ─────────
alter table profiles          enable row level security;
alter table areas             enable row level security;
alter table properties        enable row level security;
alter table property_private  enable row level security;
alter table rooms             enable row level security;
alter table room_photos       enable row level security;
alter table amenity_catalog   enable row level security;
alter table amenity_answers   enable row level security;
alter table app_settings      enable row level security;
alter table bookings          enable row level security;
alter table payments          enable row level security;
alter table reviews           enable row level security;
alter table saved_places      enable row level security;
alter table claim_requests    enable row level security;
alter table conversations     enable row level security;
alter table messages          enable row level security;

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- ───────── public reads ─────────
grant select on areas, amenity_catalog, app_settings, properties, rooms, room_photos, amenity_answers, reviews,
                v_room_amenities, v_room_cards, v_unclaimed_places to anon, authenticated;

create policy areas_read    on areas           for select using (true);
create policy catalog_read  on amenity_catalog for select using (true);
create policy settings_read on app_settings    for select using (true);
create policy settings_admin on app_settings   for all to authenticated using (is_admin()) with check (is_admin());
grant insert, update, delete on app_settings to authenticated;

create policy properties_read on properties for select
  using (status in ('published', 'unclaimed') or owner_id = auth.uid() or is_admin());
create policy rooms_read on rooms for select
  using ((status = 'published' and exists (select 1 from properties p where p.id = property_id and p.status = 'published'))
         or owns_property(property_id) or is_admin());
create policy photos_read on room_photos for select
  using (exists (select 1 from properties p where p.id = property_id and (p.status in ('published', 'unclaimed') or p.owner_id = auth.uid())) or is_admin());
create policy answers_read on amenity_answers for select
  using (exists (select 1 from properties p where p.id = property_id and (p.status = 'published' or p.owner_id = auth.uid())) or is_admin());
create policy reviews_read on reviews for select using (true);

-- ───────── owners manage their own places (screens arrive in phase 2) ─────────
grant insert, update, delete on properties, rooms, room_photos, amenity_answers to authenticated;
create policy properties_insert on properties for insert to authenticated
  with check (owner_id = auth.uid() and status in ('draft', 'pending_review'));
create policy properties_update on properties for update to authenticated
  using (owner_id = auth.uid() or is_admin())
  with check ((owner_id = auth.uid() and status in ('draft', 'pending_review', 'published')) or is_admin());
create policy properties_delete on properties for delete to authenticated using (owner_id = auth.uid() and status = 'draft' or is_admin());
create policy rooms_write on rooms for all to authenticated using (owns_property(property_id) or is_admin()) with check (owns_property(property_id) or is_admin());
create policy photos_write on room_photos for all to authenticated using (owns_property(property_id) or is_admin()) with check (owns_property(property_id) or is_admin());
create policy answers_write on amenity_answers for all to authenticated using (owns_property(property_id) or is_admin()) with check (owns_property(property_id) or is_admin());

-- Private details
grant select, insert, update, delete on property_private to authenticated;
create policy private_read on property_private for select to authenticated
  using (owns_property(property_id) or is_admin() or has_active_stay(property_id));
create policy private_write on property_private for all to authenticated
  using (owns_property(property_id) or is_admin()) with check (owns_property(property_id) or is_admin());

-- ───────── profiles ─────────
grant select on profiles to authenticated;
grant update (full_name, phone, avatar_url) on profiles to authenticated;     -- never `role`
create policy profiles_self on profiles for select to authenticated using (id = auth.uid() or is_admin());
create policy profiles_update on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ───────── bookings & payments: read only, writes go through functions ─────────
grant select on bookings, payments to authenticated;
create policy bookings_read on bookings for select to authenticated
  using (guest_id = auth.uid() or owns_property(property_id) or is_admin());
create policy payments_read on payments for select to authenticated
  using (exists (select 1 from bookings b where b.id = booking_id and (b.guest_id = auth.uid() or is_admin())));

-- ───────── reviews: only guests who actually stayed ─────────
grant insert on reviews to authenticated;
create policy reviews_insert on reviews for insert to authenticated
  with check (
    guest_id = auth.uid()
    and exists (select 1 from bookings b where b.id = booking_id and b.guest_id = auth.uid()
                and b.status in ('confirmed', 'completed') and b.check_out <= lagos_today()
                and b.property_id = reviews.property_id and b.room_id = reviews.room_id)
  );

-- ───────── saved places ─────────
grant select, insert, delete on saved_places to authenticated;
create policy saved_all on saved_places for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ───────── claims ─────────
grant select, insert on claim_requests to authenticated;
create policy claims_read on claim_requests for select to authenticated using (user_id = auth.uid() or is_admin());
create policy claims_insert on claim_requests for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from properties p where p.id = property_id and p.status = 'unclaimed'));

-- ───────── messages ─────────
grant select, insert on conversations, messages to authenticated;
grant update (read_at) on messages to authenticated;
create policy conv_read on conversations for select to authenticated using (guest_id = auth.uid() or owner_id = auth.uid() or is_admin());
create policy conv_insert on conversations for insert to authenticated with check (guest_id = auth.uid());
create policy msg_read on messages for select to authenticated
  using (exists (select 1 from conversations c where c.id = conversation_id and (c.guest_id = auth.uid() or c.owner_id = auth.uid())));
create policy msg_insert on messages for insert to authenticated
  with check (sender_id = auth.uid() and exists (select 1 from conversations c where c.id = conversation_id and (c.guest_id = auth.uid() or c.owner_id = auth.uid())));
create policy msg_read_mark on messages for update to authenticated
  using (sender_id <> auth.uid() and exists (select 1 from conversations c where c.id = conversation_id and (c.guest_id = auth.uid() or c.owner_id = auth.uid())));

-- Reviews show the reviewer's first name only (profiles themselves stay private).
create or replace view v_reviews as
select r.id, r.property_id, r.room_id, r.rating, r.comment, r.created_at,
       split_part(coalesce(nullif(p.full_name, ''), 'Guest'), ' ', 1) as guest_first_name
from reviews r left join profiles p on p.id = r.guest_id;
grant select on v_reviews to anon, authenticated;

-- ───────── function permissions ─────────
grant execute on function lagos_today(), is_admin(), owns_property(uuid), has_active_stay(uuid), setting_num(text, numeric) to anon, authenticated;
grant execute on function room_has_conflict(uuid, date, date, uuid), room_blocked_ranges(uuid), quote_stay(uuid, date, date, integer),
  search_rooms(text, text, date, date, integer, integer, integer, text[], room_kind, text, integer, integer) to anon, authenticated;
grant execute on function create_booking(uuid, date, date, integer), cancel_booking(text) to authenticated;
-- Server-only (the website's payment routes use the service role key):
grant execute on function start_payment(uuid, payment_provider, text), confirm_payment(text, integer, jsonb) to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;

-- ───────── photo storage (skipped automatically if Storage is not enabled) ─────────
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('room-photos', 'room-photos', true) on conflict (id) do nothing;
    execute $p$create policy "room photos are public" on storage.objects for select using (bucket_id = 'room-photos')$p$;
    -- Owners upload into a folder named after their own user id.
    execute $p$create policy "owners upload room photos" on storage.objects for insert to authenticated
      with check (bucket_id = 'room-photos' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy "owners manage own room photos" on storage.objects for delete to authenticated
      using (bucket_id = 'room-photos' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  end if;
end $$;
