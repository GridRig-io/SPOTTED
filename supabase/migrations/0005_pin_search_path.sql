-- Spotted · 0005: pin search_path on helper functions (Supabase security advisor). Already applied to the live project.
alter function public.lagos_today() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.check_amenity_scope() set search_path = public;
alter function public.enforce_room_publish() set search_path = public;
alter function public.make_booking_code() set search_path = public;
alter function public.setting_num(text, numeric) set search_path = public;
alter function public.search_rooms(text, text, date, date, integer, integer, integer, text[], room_kind, text, integer, integer) set search_path = public;
