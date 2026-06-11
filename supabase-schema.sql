-- Panin DocFlow Supabase Schema
-- Run this file in Supabase SQL Editor after creating a Supabase project.
-- This schema covers Auth profiles, documents, invoices, audit timeline,
-- agenda numbering, Row Level Security, storage bucket policies, and seed data.

begin;

-- Required for gen_random_uuid().
create extension if not exists pgcrypto;

-- =========================
-- 1. ENUM TYPES
-- =========================

do $$
begin
  create type public.app_role as enum ('ADMIN', 'RECEPTIONIST');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.document_type as enum ('LETTER', 'INVOICE');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.document_category_type as enum ('LETTER', 'INVOICE', 'BOTH');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.document_status as enum (
    'BARU',
    'DIDISTRIBUSIKAN',
    'DIPROSES',
    'SELESAI',
    'DIARSIPKAN'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.document_event_type as enum (
    'CREATED',
    'UPDATED',
    'STATUS_CHANGED',
    'ARCHIVED',
    'DELETED',
    'ATTACHMENT_UPLOADED',
    'COMMENTED',
    'MASTER_DATA_CHANGED'
  );
exception
  when duplicate_object then null;
end $$;

-- =========================
-- 2. TABLES
-- =========================

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint departments_name_unique unique (name),
  constraint departments_code_unique unique (code),
  constraint departments_name_not_blank check (length(trim(name)) > 0),
  constraint departments_code_not_blank check (length(trim(code)) > 0)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role public.app_role not null default 'ADMIN',
  department_id uuid references public.departments(id) on delete set null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_unique unique (email),
  constraint profiles_full_name_not_blank check (length(trim(full_name)) > 0)
);

create table if not exists public.document_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.document_category_type not null default 'BOTH',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_categories_name_type_unique unique (name, type),
  constraint document_categories_name_not_blank check (length(trim(name)) > 0)
);

create table if not exists public.agenda_counters (
  id uuid primary key default gen_random_uuid(),
  type public.document_type not null,
  year integer not null,
  month integer not null,
  last_number integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint agenda_counters_unique_period unique (type, year, month),
  constraint agenda_counters_month_check check (month between 1 and 12),
  constraint agenda_counters_year_check check (year between 2000 and 2100),
  constraint agenda_counters_last_number_check check (last_number >= 0)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  agenda_number text not null,
  type public.document_type not null,
  letter_number text,
  letter_date date,
  received_at timestamptz not null,
  sender_name text not null,
  sender_organization text,
  recipient_name text,
  department_id uuid not null references public.departments(id) on delete restrict,
  subject text not null,
  employee_name text,
  amount numeric(14, 2),
  category_id uuid not null references public.document_categories(id) on delete restrict,
  status public.document_status not null default 'BARU',
  notes text,
  attachment_url text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint documents_agenda_number_unique unique (agenda_number),
  constraint documents_sender_name_not_blank check (length(trim(sender_name)) > 0),
  constraint documents_subject_not_blank check (length(trim(subject)) > 0),
  constraint documents_amount_positive check (amount is null or amount > 0),
  constraint documents_letter_recipient_required check (
    type = 'INVOICE'
    or (recipient_name is not null and length(trim(recipient_name)) > 0)
  ),
  constraint documents_archived_status_check check (
    (status = 'DIARSIPKAN' and archived_at is not null)
    or (status <> 'DIARSIPKAN')
  )
);

create table if not exists public.invoice_details (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique references public.documents(id) on delete cascade,
  invoice_number text,
  amount numeric(16, 2),
  internal_pic text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_details_invoice_number_unique unique (invoice_number),
  constraint invoice_details_invoice_number_not_blank check (
    invoice_number is null or length(trim(invoice_number)) > 0
  ),
  constraint invoice_details_internal_pic_not_blank check (length(trim(internal_pic)) > 0),
  constraint invoice_details_amount_positive check (amount is null or amount > 0)
);

create table if not exists public.document_events (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type public.document_event_type not null,
  previous_status public.document_status,
  new_status public.document_status,
  message text,
  created_at timestamptz not null default now()
);

create table if not exists public.document_comments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  comment text not null,
  created_at timestamptz not null default now(),
  constraint document_comments_comment_not_blank check (length(trim(comment)) > 0)
);

create table if not exists public.backup_histories (
  id uuid primary key default gen_random_uuid(),
  backup_month date not null,
  document_count integer not null default 0 check (document_count >= 0),
  invoice_count integer not null default 0 check (invoice_count >= 0),
  attachment_count integer not null default 0 check (attachment_count >= 0),
  status text not null default 'BACKED_UP'
    check (status in ('BACKED_UP', 'VERIFIED', 'CLEANED')),
  backup_file_name text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz,
  cleaned_at timestamptz,
  constraint backup_histories_backup_month_unique unique (backup_month)
);

-- =========================
-- 3. INDEXES
-- =========================

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_department_id_idx on public.profiles(department_id);

create index if not exists documents_type_idx on public.documents(type);
create index if not exists documents_type_received_at_idx on public.documents(type, received_at desc);
create index if not exists documents_status_idx on public.documents(status);
create index if not exists documents_received_at_idx on public.documents(received_at desc);
create index if not exists documents_department_id_idx on public.documents(department_id);
create index if not exists documents_category_id_idx on public.documents(category_id);
create index if not exists documents_created_by_idx on public.documents(created_by);
create index if not exists documents_archived_at_idx on public.documents(archived_at);
create index if not exists documents_sender_name_idx on public.documents using gin (to_tsvector('simple', sender_name));
create index if not exists documents_subject_idx on public.documents using gin (to_tsvector('simple', subject));
create index if not exists backup_histories_backup_month_idx
on public.backup_histories(backup_month desc);

create index if not exists invoice_details_document_id_idx on public.invoice_details(document_id);
create index if not exists invoice_details_invoice_number_idx on public.invoice_details(invoice_number);

create index if not exists document_events_document_id_idx on public.document_events(document_id);
create index if not exists document_events_actor_id_idx on public.document_events(actor_id);
create index if not exists document_events_created_at_idx on public.document_events(created_at desc);

create index if not exists document_comments_document_id_idx on public.document_comments(document_id);

-- =========================
-- 4. HELPER FUNCTIONS
-- =========================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_profile_role()
returns public.app_role
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_profile_role() = 'ADMIN', false);
$$;

create or replace function public.is_receptionist()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_profile_role() = 'RECEPTIONIST', false);
$$;

create or replace function public.next_agenda_number(
  doc_type public.document_type,
  received_date timestamptz default now()
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  agenda_year integer;
  agenda_month integer;
  next_number integer;
  prefix text;
begin
  agenda_year := extract(year from received_date)::integer;
  agenda_month := extract(month from received_date)::integer;
  prefix := case when doc_type = 'LETTER' then 'SM' else 'INV' end;

  insert into public.agenda_counters(type, year, month, last_number)
  values (doc_type, agenda_year, agenda_month, 1)
  on conflict (type, year, month)
  do update
    set last_number = public.agenda_counters.last_number + 1,
        updated_at = now()
  returning last_number into next_number;

  return concat(
    prefix,
    '/',
    agenda_year,
    '/',
    lpad(agenda_month::text, 2, '0'),
    '/',
    lpad(next_number::text, 4, '0')
  );
end;
$$;

create or replace function public.set_document_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;

  if new.updated_by is null then
    new.updated_by := auth.uid();
  end if;

  if new.agenda_number is null or length(trim(new.agenda_number)) = 0 then
    new.agenda_number := public.next_agenda_number(new.type, new.received_at);
  end if;

  if new.status = 'DIARSIPKAN' and new.archived_at is null then
    new.archived_at := now();
  end if;

  return new;
end;
$$;

create or replace function public.sync_document_archive_state()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'DIARSIPKAN' and old.status <> 'DIARSIPKAN' and new.archived_at is null then
    new.archived_at := now();
  elsif new.status <> 'DIARSIPKAN' then
    new.archived_at := null;
  end if;

  return new;
end;
$$;

create or replace function public.log_document_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.document_events (
    document_id,
    actor_id,
    event_type,
    new_status,
    message
  )
  values (
    new.id,
    new.created_by,
    'CREATED',
    new.status,
    concat('Dokumen ', new.agenda_number, ' dibuat.')
  );

  return new;
end;
$$;

create or replace function public.log_document_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
begin
  actor := coalesce(new.updated_by, auth.uid(), new.created_by);

  if old.status is distinct from new.status then
    insert into public.document_events (
      document_id,
      actor_id,
      event_type,
      previous_status,
      new_status,
      message
    )
    values (
      new.id,
      actor,
      case when new.status = 'DIARSIPKAN' then 'ARCHIVED' else 'STATUS_CHANGED' end,
      old.status,
      new.status,
      concat('Status dokumen ', new.agenda_number, ' berubah dari ', old.status, ' ke ', new.status, '.')
    );
  elsif old.attachment_url is distinct from new.attachment_url and new.attachment_url is not null then
    insert into public.document_events (
      document_id,
      actor_id,
      event_type,
      message
    )
    values (
      new.id,
      actor,
      'ATTACHMENT_UPLOADED',
      concat('Lampiran dokumen ', new.agenda_number, ' diperbarui.')
    );
  elsif old is distinct from new then
    insert into public.document_events (
      document_id,
      actor_id,
      event_type,
      message
    )
    values (
      new.id,
      actor,
      'UPDATED',
      concat('Dokumen ', new.agenda_number, ' diperbarui.')
    );
  end if;

  return new;
end;
$$;

create or replace function public.log_document_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.document_events (
    document_id,
    actor_id,
    event_type,
    message
  )
  values (
    new.document_id,
    new.actor_id,
    'COMMENTED',
    'Komentar baru ditambahkan.'
  );

  return new;
end;
$$;

create or replace function public.validate_document_category()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  category_type public.document_category_type;
begin
  select type
  into category_type
  from public.document_categories
  where id = new.category_id;

  if category_type is null then
    raise exception 'Kategori dokumen tidak ditemukan.';
  end if;

  if category_type <> 'BOTH' and category_type::text <> new.type::text then
    raise exception 'Kategori tidak sesuai dengan jenis dokumen.';
  end if;

  return new;
end;
$$;

create or replace function public.validate_invoice_detail_document()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_type public.document_type;
begin
  select type
  into parent_type
  from public.documents
  where id = new.document_id;

  if parent_type is null then
    raise exception 'Dokumen invoice tidak ditemukan.';
  end if;

  if parent_type <> 'INVOICE' then
    raise exception 'Invoice detail hanya boleh terhubung ke dokumen bertipe INVOICE.';
  end if;

  return new;
end;
$$;

create or replace function public.guard_receptionist_document_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if public.is_receptionist() and old.created_by = auth.uid() then
    return new;
  end if;

  if public.is_receptionist() then
    if new.id is not distinct from old.id
      and new.agenda_number is not distinct from old.agenda_number
      and new.type is not distinct from old.type
      and new.letter_number is not distinct from old.letter_number
      and new.letter_date is not distinct from old.letter_date
      and new.received_at is not distinct from old.received_at
      and new.sender_name is not distinct from old.sender_name
      and new.sender_organization is not distinct from old.sender_organization
      and new.recipient_name is not distinct from old.recipient_name
      and new.department_id is not distinct from old.department_id
      and new.subject is not distinct from old.subject
      and new.employee_name is not distinct from old.employee_name
      and new.amount is not distinct from old.amount
      and new.category_id is not distinct from old.category_id
      and new.notes is not distinct from old.notes
      and new.attachment_url is not distinct from old.attachment_url
      and new.created_by is not distinct from old.created_by
      and new.created_at is not distinct from old.created_at
    then
      return new;
    end if;

    raise exception 'Resepsionis hanya dapat mengubah status dokumen yang bukan dibuat sendiri.';
  end if;

  raise exception 'Role pengguna tidak memiliki izin untuk mengubah dokumen.';
end;
$$;

create or replace function public.get_dashboard_summary()
returns table (
  letter_today bigint,
  invoice_today bigint,
  documents_this_month bigint,
  documents_in_progress bigint,
  documents_new bigint,
  documents_done bigint,
  documents_archived bigint
)
language sql
stable
set search_path = public
as $$
  select
    count(*) filter (
      where type = 'LETTER'
        and received_at >= date_trunc('day', now())
        and received_at < date_trunc('day', now()) + interval '1 day'
    ) as letter_today,
    count(*) filter (
      where type = 'INVOICE'
        and received_at >= date_trunc('day', now())
        and received_at < date_trunc('day', now()) + interval '1 day'
    ) as invoice_today,
    count(*) filter (
      where received_at >= date_trunc('month', now())
        and received_at < date_trunc('month', now()) + interval '1 month'
    ) as documents_this_month,
    count(*) filter (where status = 'DIPROSES') as documents_in_progress,
    count(*) filter (where status = 'BARU') as documents_new,
    count(*) filter (where status = 'SELESAI') as documents_done,
    count(*) filter (where status = 'DIARSIPKAN') as documents_archived
  from public.documents;
$$;

create or replace function public.get_weekly_document_trend()
returns table (
  day date,
  letter_count bigint,
  invoice_count bigint
)
language sql
stable
set search_path = public
as $$
  with days as (
    select generate_series(
      current_date - interval '6 days',
      current_date,
      interval '1 day'
    )::date as day
  )
  select
    days.day,
    count(d.id) filter (where d.type = 'LETTER') as letter_count,
    count(d.id) filter (where d.type = 'INVOICE') as invoice_count
  from days
  left join public.documents d
    on d.received_at >= days.day::timestamptz
    and d.received_at < (days.day + 1)::timestamptz
  group by days.day
  order by days.day;
$$;

create or replace function public.get_recent_document_activity(limit_count integer default 10)
returns table (
  event_id uuid,
  document_id uuid,
  agenda_number text,
  document_type public.document_type,
  actor_name text,
  event_type public.document_event_type,
  previous_status public.document_status,
  new_status public.document_status,
  message text,
  created_at timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    e.id as event_id,
    e.document_id,
    d.agenda_number,
    d.type as document_type,
    p.full_name as actor_name,
    e.event_type,
    e.previous_status,
    e.new_status,
    e.message,
    e.created_at
  from public.document_events e
  left join public.documents d on d.id = e.document_id
  left join public.profiles p on p.id = e.actor_id
  order by e.created_at desc
  limit greatest(1, least(coalesce(limit_count, 10), 50));
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'User Baru'),
    new.email,
    'ADMIN'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- =========================
-- 5. TRIGGERS
-- =========================

drop trigger if exists departments_set_updated_at on public.departments;
create trigger departments_set_updated_at
before update on public.departments
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists document_categories_set_updated_at on public.document_categories;
create trigger document_categories_set_updated_at
before update on public.document_categories
for each row execute function public.set_updated_at();

drop trigger if exists backup_histories_set_updated_at on public.backup_histories;
create trigger backup_histories_set_updated_at
before update on public.backup_histories
for each row execute function public.set_updated_at();

drop trigger if exists invoice_details_set_updated_at on public.invoice_details;
create trigger invoice_details_set_updated_at
before update on public.invoice_details
for each row execute function public.set_updated_at();

drop trigger if exists documents_validate_category on public.documents;
create trigger documents_validate_category
before insert or update of type, category_id on public.documents
for each row execute function public.validate_document_category();

drop trigger if exists documents_guard_receptionist_update on public.documents;
create trigger documents_guard_receptionist_update
before update on public.documents
for each row execute function public.guard_receptionist_document_update();

drop trigger if exists invoice_details_validate_document on public.invoice_details;
create trigger invoice_details_validate_document
before insert or update of document_id on public.invoice_details
for each row execute function public.validate_invoice_detail_document();

drop trigger if exists documents_set_defaults on public.documents;
create trigger documents_set_defaults
before insert on public.documents
for each row execute function public.set_document_defaults();

drop trigger if exists documents_sync_archive_state on public.documents;
create trigger documents_sync_archive_state
before update on public.documents
for each row execute function public.sync_document_archive_state();

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

drop trigger if exists documents_log_created on public.documents;
create trigger documents_log_created
after insert on public.documents
for each row execute function public.log_document_created();

drop trigger if exists documents_log_updated on public.documents;
create trigger documents_log_updated
after update on public.documents
for each row execute function public.log_document_updated();

drop trigger if exists document_comments_log_created on public.document_comments;
create trigger document_comments_log_created
after insert on public.document_comments
for each row execute function public.log_document_comment();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =========================
-- 6. ROW LEVEL SECURITY
-- =========================

alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.document_categories enable row level security;
alter table public.agenda_counters enable row level security;
alter table public.documents enable row level security;
alter table public.invoice_details enable row level security;
alter table public.document_events enable row level security;
alter table public.document_comments enable row level security;
alter table public.backup_histories enable row level security;

-- Departments
drop policy if exists "Authenticated users can read departments" on public.departments;
create policy "Authenticated users can read departments"
on public.departments
for select
to authenticated
using (true);

drop policy if exists "Admins can manage departments" on public.departments;
create policy "Admins can manage departments"
on public.departments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Profiles
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "Users can update own basic profile" on public.profiles;
create policy "Users can update own basic profile"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (
    id = auth.uid()
    and role = public.current_profile_role()
  )
);

drop policy if exists "Admins can insert profiles" on public.profiles;
create policy "Admins can insert profiles"
on public.profiles
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles"
on public.profiles
for delete
to authenticated
using (public.is_admin());

-- Categories
drop policy if exists "Authenticated users can read document categories" on public.document_categories;
create policy "Authenticated users can read document categories"
on public.document_categories
for select
to authenticated
using (true);

drop policy if exists "Admins can manage document categories" on public.document_categories;
create policy "Admins can manage document categories"
on public.document_categories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Agenda counters are only modified by security definer functions.
drop policy if exists "Admins can read agenda counters" on public.agenda_counters;
create policy "Admins can read agenda counters"
on public.agenda_counters
for select
to authenticated
using (public.is_admin());

-- Documents
drop policy if exists "Authenticated users can read documents" on public.documents;
create policy "Authenticated users can read documents"
on public.documents
for select
to authenticated
using (true);

drop policy if exists "Admins and receptionists can create documents" on public.documents;
create policy "Admins and receptionists can create documents"
on public.documents
for insert
to authenticated
with check (
  (public.is_admin() or public.is_receptionist())
  and created_by = auth.uid()
);

drop policy if exists "Admins can update all documents" on public.documents;
create policy "Admins can update all documents"
on public.documents
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Receptionists can update operational documents" on public.documents;
create policy "Receptionists can update operational documents"
on public.documents
for update
to authenticated
using (public.is_receptionist())
with check (
  public.is_receptionist()
  and (
    created_by = auth.uid()
    or status in ('BARU', 'DIDISTRIBUSIKAN', 'DIPROSES', 'SELESAI', 'DIARSIPKAN')
  )
);

drop policy if exists "Admins can delete documents" on public.documents;
create policy "Admins can delete documents"
on public.documents
for delete
to authenticated
using (public.is_admin());

-- Invoice details
drop policy if exists "Authenticated users can read invoice details" on public.invoice_details;
create policy "Authenticated users can read invoice details"
on public.invoice_details
for select
to authenticated
using (
  exists (
    select 1
    from public.documents d
    where d.id = invoice_details.document_id
  )
);

drop policy if exists "Admins and receptionists can create invoice details" on public.invoice_details;
create policy "Admins and receptionists can create invoice details"
on public.invoice_details
for insert
to authenticated
with check (
  public.is_admin()
  or (
    public.is_receptionist()
    and exists (
      select 1
      from public.documents d
      where d.id = invoice_details.document_id
        and d.created_by = auth.uid()
        and d.type = 'INVOICE'
    )
  )
);

drop policy if exists "Admins can update all invoice details" on public.invoice_details;
create policy "Admins can update all invoice details"
on public.invoice_details
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Receptionists can update own invoice details" on public.invoice_details;
create policy "Receptionists can update own invoice details"
on public.invoice_details
for update
to authenticated
using (
  public.is_receptionist()
  and exists (
    select 1
    from public.documents d
    where d.id = invoice_details.document_id
      and d.created_by = auth.uid()
  )
)
with check (
  public.is_receptionist()
  and exists (
    select 1
    from public.documents d
    where d.id = invoice_details.document_id
      and d.created_by = auth.uid()
  )
);

drop policy if exists "Admins can delete invoice details" on public.invoice_details;
create policy "Admins can delete invoice details"
on public.invoice_details
for delete
to authenticated
using (public.is_admin());

-- Events
drop policy if exists "Authenticated users can read document events" on public.document_events;
create policy "Authenticated users can read document events"
on public.document_events
for select
to authenticated
using (true);

drop policy if exists "System and admins can insert document events" on public.document_events;
create policy "System and admins can insert document events"
on public.document_events
for insert
to authenticated
with check (public.is_admin() or actor_id = auth.uid());

drop policy if exists "Admins can manage document events" on public.document_events;
create policy "Admins can manage document events"
on public.document_events
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Comments
drop policy if exists "Authenticated users can read comments" on public.document_comments;
create policy "Authenticated users can read comments"
on public.document_comments
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can create comments" on public.document_comments;
create policy "Authenticated users can create comments"
on public.document_comments
for insert
to authenticated
with check (actor_id = auth.uid());

drop policy if exists "Admins can manage comments" on public.document_comments;
create policy "Admins can manage comments"
on public.document_comments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Backup histories
drop policy if exists "Authenticated users can read backup histories" on public.backup_histories;
create policy "Authenticated users can read backup histories"
on public.backup_histories
for select
to authenticated
using (true);

drop policy if exists "Admins can manage backup histories" on public.backup_histories;
create policy "Admins can manage backup histories"
on public.backup_histories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- =========================
-- 7. STORAGE BUCKET + POLICIES
-- =========================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'document-attachments',
  'document-attachments',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can read document attachments" on storage.objects;
create policy "Authenticated users can read document attachments"
on storage.objects
for select
to authenticated
using (bucket_id = 'document-attachments');

drop policy if exists "Authenticated users can upload document attachments" on storage.objects;
create policy "Authenticated users can upload document attachments"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'document-attachments');

drop policy if exists "Authenticated users can update own document attachments" on storage.objects;
create policy "Authenticated users can update own document attachments"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'document-attachments'
  and (owner = auth.uid() or public.is_admin())
)
with check (
  bucket_id = 'document-attachments'
  and (owner = auth.uid() or public.is_admin())
);

drop policy if exists "Admins can delete document attachments" on storage.objects;
create policy "Admins can delete document attachments"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'document-attachments'
  and public.is_admin()
);

-- =========================
-- 8. SEED DATA
-- =========================

-- First admin bootstrap:
-- 1. Create the first user in Supabase Auth.
-- 2. Run this manually in SQL Editor:
--    update public.profiles set role = 'ADMIN' where email = 'admin@example.com';

insert into public.departments (name, code)
values
  ('General Affair', 'GA'),
  ('Human Resource Management', 'HRM')
on conflict (code) do update
set name = excluded.name;

insert into public.document_categories (name, type)
values
  ('Umum', 'BOTH'),
  ('Operasional', 'BOTH'),
  ('Form Pengajuan Perbaikan', 'LETTER'),
  ('Makan dan Transport', 'LETTER'),
  ('BPKU', 'LETTER'),
  ('Amplop Tertutup', 'LETTER'),
  ('Form PR', 'LETTER'),
  ('Transport Dinas', 'LETTER'),
  ('Form Lembur', 'LETTER'),
  ('Teguran Lisan', 'LETTER'),
  ('Vendor', 'INVOICE'),
  ('Nota Pemindahan (NP)', 'INVOICE'),
  ('Internal', 'BOTH')
on conflict (name, type) do nothing;

-- =========================
-- 9. REALTIME PUBLICATION
-- =========================

do $$
begin
  alter publication supabase_realtime add table public.documents;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.invoice_details;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.document_events;
exception
  when duplicate_object then null;
end $$;

-- =========================
-- 10. GRANTS
-- =========================

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

commit;
