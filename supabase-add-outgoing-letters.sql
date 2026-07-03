-- Panin DocFlow - Surat Keluar
-- Jalankan file ini sekali di Supabase SQL Editor untuk mengaktifkan modul Surat Keluar.

create table if not exists public.outgoing_letters (
  id uuid primary key default gen_random_uuid(),
  agenda_number text unique,
  sent_at timestamptz not null,
  sender_staff text not null,
  sender_department text not null,
  letter_number text,
  destination_name text not null,
  attention_to text,
  subject text,
  confidential boolean not null default false,
  notes text,
  batch_notes text,
  attachment_url text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outgoing_letters_sender_department_check
    check (sender_department in ('GA', 'HRM'))
);

create index if not exists outgoing_letters_sent_at_idx
on public.outgoing_letters (sent_at desc);

create index if not exists outgoing_letters_created_at_idx
on public.outgoing_letters (created_at desc);

create index if not exists outgoing_letters_sender_staff_idx
on public.outgoing_letters (sender_staff);

create index if not exists outgoing_letters_destination_name_idx
on public.outgoing_letters (destination_name);

create table if not exists public.outgoing_agenda_counters (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  month integer not null,
  last_number integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint outgoing_agenda_counters_unique_period unique (year, month),
  constraint outgoing_agenda_counters_month_check check (month between 1 and 12),
  constraint outgoing_agenda_counters_year_check check (year between 2000 and 2100),
  constraint outgoing_agenda_counters_last_number_check check (last_number >= 0)
);

create or replace function public.next_outgoing_agenda_number(sent_date timestamptz)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  agenda_year int := extract(year from sent_date at time zone 'Asia/Jakarta')::int;
  agenda_month int := extract(month from sent_date at time zone 'Asia/Jakarta')::int;
  next_number int;
begin
  insert into public.outgoing_agenda_counters(year, month, last_number)
  values (agenda_year, agenda_month, 1)
  on conflict (year, month) do update
    set last_number = public.outgoing_agenda_counters.last_number + 1,
        updated_at = now()
  returning last_number into next_number;

  return format('SK/%s/%s/%s', agenda_year, lpad(agenda_month::text, 2, '0'), lpad(next_number::text, 4, '0'));
end;
$$;

create or replace function public.set_outgoing_letter_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sent_at is null then
    new.sent_at := now();
  end if;

  if new.agenda_number is null or trim(new.agenda_number) = '' then
    new.agenda_number := public.next_outgoing_agenda_number(new.sent_at);
  end if;

  return new;
end;
$$;

drop trigger if exists outgoing_letters_set_defaults on public.outgoing_letters;
create trigger outgoing_letters_set_defaults
before insert on public.outgoing_letters
for each row execute function public.set_outgoing_letter_defaults();

drop trigger if exists outgoing_letters_set_updated_at on public.outgoing_letters;
create trigger outgoing_letters_set_updated_at
before update on public.outgoing_letters
for each row execute function public.set_updated_at();

alter table public.outgoing_letters enable row level security;
alter table public.outgoing_agenda_counters enable row level security;

drop policy if exists "Authenticated users can read outgoing agenda counters" on public.outgoing_agenda_counters;
create policy "Authenticated users can read outgoing agenda counters"
on public.outgoing_agenda_counters
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can read outgoing letters" on public.outgoing_letters;
create policy "Authenticated users can read outgoing letters"
on public.outgoing_letters
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can create outgoing letters" on public.outgoing_letters;
create policy "Authenticated users can create outgoing letters"
on public.outgoing_letters
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "Authenticated users can update outgoing letters" on public.outgoing_letters;
create policy "Authenticated users can update outgoing letters"
on public.outgoing_letters
for update
to authenticated
using (public.is_admin() or auth.uid() = created_by)
with check (public.is_admin() or auth.uid() = updated_by);

drop policy if exists "Authenticated users can delete outgoing letters" on public.outgoing_letters;
drop policy if exists "Admins can delete outgoing letters" on public.outgoing_letters;
create policy "Admins can delete outgoing letters"
on public.outgoing_letters
for delete
to authenticated
using (public.is_admin());

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'outgoing_letters'
  ) then
    alter publication supabase_realtime add table public.outgoing_letters;
  end if;
end;
$$;
