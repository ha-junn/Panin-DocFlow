-- Panin DocFlow - Phase 02 P0 fixes
-- Run once in Supabase SQL Editor on an existing environment.

begin;

-- New users must not become admins automatically.
alter table public.profiles
alter column role set default 'RECEPTIONIST';

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
    'RECEPTIONIST'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Keep storage MIME policy aligned with the app-side image compression.
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
]
where id = 'document-attachments';

-- Prevent authenticated users from directly consuming agenda counters via RPC.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_receptionist() to authenticated;
grant execute on function public.get_dashboard_summary() to authenticated;
grant execute on function public.get_weekly_document_trend() to authenticated;
grant execute on function public.get_recent_document_activity(integer) to authenticated;

-- Public receipt RPCs remain intentionally token-based.
grant execute on function public.get_receipt_by_token(uuid) to anon, authenticated;
grant execute on function public.confirm_receipt_by_token(uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.get_receipt_batch_by_token(uuid) to anon, authenticated;
grant execute on function public.confirm_receipt_batch_by_token(uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.get_receipt_batch_details_by_token(uuid) to anon, authenticated;
grant execute on function public.get_outgoing_receipt_batch_by_token(uuid) to anon, authenticated;
grant execute on function public.confirm_outgoing_receipt_batch_by_token(uuid, text, text, text, text) to anon, authenticated;

-- Outgoing letters: only admins may delete; update is restricted to admins/creator.
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

-- Receipt request direct updates are no longer open to all authenticated users.
drop policy if exists "Authenticated users can update receipt requests" on public.receipt_requests;
drop policy if exists "Admins and creators can update receipt requests" on public.receipt_requests;
create policy "Admins and creators can update receipt requests"
on public.receipt_requests
for update
to authenticated
using (public.is_admin() or created_by = auth.uid())
with check (public.is_admin() or created_by = auth.uid());

-- Batch receipt direct updates/items are restricted to admins/creator-owned pending batches.
drop policy if exists "Authenticated users can update receipt batches" on public.receipt_batches;
drop policy if exists "Admins and creators can update receipt batches" on public.receipt_batches;
create policy "Admins and creators can update receipt batches"
on public.receipt_batches
for update
to authenticated
using (public.is_admin() or created_by = auth.uid())
with check (public.is_admin() or created_by = auth.uid());

drop policy if exists "Admins can delete receipt batches" on public.receipt_batches;
drop policy if exists "Admins and creators can delete pending receipt batches" on public.receipt_batches;
create policy "Admins and creators can delete pending receipt batches"
on public.receipt_batches
for delete
to authenticated
using (public.is_admin() or (created_by = auth.uid() and status = 'PENDING'));

drop policy if exists "Authenticated users can create receipt batch items" on public.receipt_batch_items;
create policy "Authenticated users can create receipt batch items"
on public.receipt_batch_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.receipt_batches b
    where b.id = receipt_batch_items.batch_id
      and b.created_by = auth.uid()
      and b.status = 'PENDING'
  )
);

-- Outgoing batch receipt direct updates/items are restricted to admins/creator-owned pending batches.
drop policy if exists "Authenticated users can update outgoing receipt batches" on public.outgoing_receipt_batches;
drop policy if exists "Admins and creators can update outgoing receipt batches" on public.outgoing_receipt_batches;
create policy "Admins and creators can update outgoing receipt batches"
on public.outgoing_receipt_batches
for update
to authenticated
using (public.is_admin() or created_by = auth.uid())
with check (public.is_admin() or created_by = auth.uid());

drop policy if exists "Admins can delete outgoing receipt batches" on public.outgoing_receipt_batches;
drop policy if exists "Admins and creators can delete pending outgoing receipt batches" on public.outgoing_receipt_batches;
create policy "Admins and creators can delete pending outgoing receipt batches"
on public.outgoing_receipt_batches
for delete
to authenticated
using (public.is_admin() or (created_by = auth.uid() and status = 'PENDING'));

drop policy if exists "Authenticated users can create outgoing receipt batch items" on public.outgoing_receipt_batch_items;
create policy "Authenticated users can create outgoing receipt batch items"
on public.outgoing_receipt_batch_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.outgoing_receipt_batches b
    where b.id = outgoing_receipt_batch_items.batch_id
      and b.created_by = auth.uid()
      and b.status = 'PENDING'
  )
);

-- Defense-in-depth: reject oversized or non-PNG data URL signatures inside public RPCs.
create or replace function public.confirm_receipt_by_token(
  p_token uuid,
  p_recipient_name text,
  p_recipient_unit text default null,
  p_recipient_note text default null,
  p_signature_data text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_receipt public.receipt_requests;
begin
  select *
  into selected_receipt
  from public.receipt_requests
  where token = p_token
  for update;

  if selected_receipt.id is null then
    raise exception 'Tanda terima tidak ditemukan.';
  end if;

  if selected_receipt.status = 'CONFIRMED' then
    return;
  end if;

  if p_recipient_name is null or length(trim(p_recipient_name)) = 0 then
    raise exception 'Nama penerima wajib diisi.';
  end if;

  if p_signature_data is not null
    and (
      length(p_signature_data) > 300000
      or p_signature_data !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$'
    )
  then
    raise exception 'Format tanda tangan tidak valid.';
  end if;

  update public.receipt_requests
  set
    status = 'CONFIRMED',
    recipient_name = trim(p_recipient_name),
    recipient_unit = nullif(trim(coalesce(p_recipient_unit, '')), ''),
    recipient_note = nullif(trim(coalesce(p_recipient_note, '')), ''),
    signature_data = nullif(p_signature_data, ''),
    confirmed_at = now()
  where id = selected_receipt.id;

  if selected_receipt.document_id is not null then
    insert into public.document_events (document_id, actor_id, event_type, message)
    values (
      selected_receipt.document_id,
      null,
      'UPDATED',
      'Tanda terima dikonfirmasi oleh ' || trim(p_recipient_name) || '.'
    );
  end if;
end;
$$;

create or replace function public.confirm_receipt_batch_by_token(
  p_token uuid,
  p_confirmed_name text,
  p_confirmed_unit text default null,
  p_confirmed_note text default null,
  p_signature_data text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_batch public.receipt_batches;
begin
  select *
  into selected_batch
  from public.receipt_batches
  where token = p_token
  for update;

  if selected_batch.id is null then
    raise exception 'Tanda terima gabungan tidak ditemukan.';
  end if;

  if selected_batch.status = 'CONFIRMED' then
    return;
  end if;

  if p_confirmed_name is null or length(trim(p_confirmed_name)) = 0 then
    raise exception 'Nama penerima wajib diisi.';
  end if;

  if p_signature_data is not null
    and (
      length(p_signature_data) > 300000
      or p_signature_data !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$'
    )
  then
    raise exception 'Format tanda tangan tidak valid.';
  end if;

  update public.receipt_batches
  set
    status = 'CONFIRMED',
    confirmed_name = trim(p_confirmed_name),
    confirmed_unit = nullif(trim(coalesce(p_confirmed_unit, '')), ''),
    confirmed_note = nullif(trim(coalesce(p_confirmed_note, '')), ''),
    signature_data = nullif(p_signature_data, ''),
    confirmed_at = now()
  where id = selected_batch.id;

  insert into public.document_events (document_id, actor_id, event_type, message)
  select
    item.document_id,
    null,
    'UPDATED',
    'Tanda terima gabungan dikonfirmasi oleh ' || trim(p_confirmed_name) || '.'
  from public.receipt_batch_items item
  where item.batch_id = selected_batch.id;
end;
$$;

create or replace function public.confirm_outgoing_receipt_batch_by_token(
  p_token uuid,
  p_confirmed_name text,
  p_confirmed_unit text default null,
  p_confirmed_note text default null,
  p_signature_data text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_batch public.outgoing_receipt_batches;
begin
  select *
  into selected_batch
  from public.outgoing_receipt_batches
  where token = p_token
  for update;

  if selected_batch.id is null then
    raise exception 'Tanda terima surat keluar tidak ditemukan.';
  end if;

  if selected_batch.status = 'CONFIRMED' then
    return;
  end if;

  if p_confirmed_name is null or length(trim(p_confirmed_name)) = 0 then
    raise exception 'Nama penerima wajib diisi.';
  end if;

  if p_signature_data is not null
    and (
      length(p_signature_data) > 300000
      or p_signature_data !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$'
    )
  then
    raise exception 'Format tanda tangan tidak valid.';
  end if;

  update public.outgoing_receipt_batches
  set
    status = 'CONFIRMED',
    confirmed_name = trim(p_confirmed_name),
    confirmed_unit = nullif(trim(coalesce(p_confirmed_unit, '')), ''),
    confirmed_note = nullif(trim(coalesce(p_confirmed_note, '')), ''),
    signature_data = nullif(p_signature_data, ''),
    confirmed_at = now()
  where id = selected_batch.id;
end;
$$;

commit;
