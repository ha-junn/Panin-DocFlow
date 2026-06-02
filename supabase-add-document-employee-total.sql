-- Panin DocFlow - Add optional employee name and document total for documents
-- Run this in Supabase SQL Editor before deploying the matching app changes.

alter table public.documents
add column if not exists employee_name text,
add column if not exists amount numeric(14, 2);

alter table public.documents
drop constraint if exists documents_amount_positive;

alter table public.documents
add constraint documents_amount_positive
check (amount is null or amount > 0);

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

  raise exception 'Tidak punya akses mengubah dokumen.';
end;
$$;
