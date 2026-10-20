-- FOP Attendance CRM schema. Apply in the Supabase SQL editor or through Supabase migrations.
create extension if not exists pgcrypto;

create or replace function public.current_fop_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'none');
$$;

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone_number text,
  singer_or_musician text not null check (singer_or_musician in ('Singer','Musician')),
  part_or_instrument text,
  church_name text,
  church_letter_submitted boolean not null default false,
  registered_at text,
  barcode_code text unique default encode(gen_random_bytes(16), 'hex'),
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists contacts_email_lower_unique on public.contacts (lower(email)) where email is not null and btrim(email) <> '';
create index if not exists contacts_name_search_idx on public.contacts using gin (to_tsvector('simple', full_name));

create table if not exists public.attendance_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  type text not null default 'Rehearsal' check (type in ('Rehearsal','Service','Meeting')),
  status text not null default 'open' check (status in ('open','closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (title, event_date)
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  event_id uuid not null references public.attendance_events(id) on delete cascade,
  status text not null check (status in ('Present','Late','Absent')),
  check_in_time timestamptz,
  checked_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contact_id, event_id)
);
create index if not exists attendance_records_event_idx on public.attendance_records(event_id);
create index if not exists attendance_events_date_idx on public.attendance_events(event_date desc);

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references auth.users(id) on delete set null,
  file_name text not null,
  source_type text not null check (source_type in ('csv','xlsx','pdf')),
  status text not null default 'pending' check (status in ('pending','processed','failed')),
  imported_count integer not null default 0,
  skipped_count integer not null default 0,
  error_summary text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.contacts enable row level security;
alter table public.attendance_events enable row level security;
alter table public.attendance_records enable row level security;
alter table public.import_jobs enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "authorised team can read contacts" on public.contacts;
create policy "authorised team can read contacts" on public.contacts for select to authenticated using (public.current_fop_role() in ('admin','super_admin'));
drop policy if exists "authorised team can add contacts" on public.contacts;
create policy "authorised team can add contacts" on public.contacts for insert to authenticated with check (public.current_fop_role() in ('admin','super_admin'));
drop policy if exists "authorised team can update contacts" on public.contacts;
create policy "authorised team can update contacts" on public.contacts for update to authenticated using (public.current_fop_role() in ('admin','super_admin')) with check (public.current_fop_role() in ('admin','super_admin'));
drop policy if exists "super admin can delete contacts" on public.contacts;
create policy "super admin can delete contacts" on public.contacts for delete to authenticated using (public.current_fop_role() = 'super_admin');

drop policy if exists "authorised team can read events" on public.attendance_events;
create policy "authorised team can read events" on public.attendance_events for select to authenticated using (public.current_fop_role() in ('admin','super_admin'));
drop policy if exists "super admin manages events" on public.attendance_events;
create policy "super admin manages events" on public.attendance_events for all to authenticated using (public.current_fop_role() = 'super_admin') with check (public.current_fop_role() = 'super_admin');

drop policy if exists "authorised team can read attendance" on public.attendance_records;
create policy "authorised team can read attendance" on public.attendance_records for select to authenticated using (public.current_fop_role() in ('admin','super_admin'));
drop policy if exists "authorised team can record attendance" on public.attendance_records;
create policy "authorised team can record attendance" on public.attendance_records for insert to authenticated with check (public.current_fop_role() in ('admin','super_admin'));
drop policy if exists "authorised team can update attendance" on public.attendance_records;
create policy "authorised team can update attendance" on public.attendance_records for update to authenticated using (public.current_fop_role() in ('admin','super_admin')) with check (public.current_fop_role() in ('admin','super_admin'));
drop policy if exists "super admin can delete attendance" on public.attendance_records;
create policy "super admin can delete attendance" on public.attendance_records for delete to authenticated using (public.current_fop_role() = 'super_admin');

drop policy if exists "super admin manages imports" on public.import_jobs;
create policy "super admin manages imports" on public.import_jobs for all to authenticated using (public.current_fop_role() = 'super_admin') with check (public.current_fop_role() = 'super_admin');
drop policy if exists "super admin reads audit logs" on public.audit_logs;
create policy "super admin reads audit logs" on public.audit_logs for select to authenticated using (public.current_fop_role() = 'super_admin');
drop policy if exists "authenticated users write audit logs" on public.audit_logs;
create policy "authenticated users write audit logs" on public.audit_logs for insert to authenticated with check (actor_id = auth.uid());

grant select, insert, update, delete on public.contacts to authenticated;
grant select, insert, update, delete on public.attendance_events to authenticated;
grant select, insert, update, delete on public.attendance_records to authenticated;
grant select, insert, update, delete on public.import_jobs to authenticated;
grant select, insert on public.audit_logs to authenticated;
