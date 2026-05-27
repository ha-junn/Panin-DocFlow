-- Panin DocFlow - Update departments
-- Run this once in Supabase SQL Editor to keep only GA and HRM as active choices.
--
-- This script deletes old departments only when they are not referenced by
-- existing documents or profiles. If a department is already used, it will stay
-- in the database to protect historical data.

begin;

insert into public.departments (name, code)
values
  ('General Affair', 'GA'),
  ('Human Resource Management', 'HRM')
on conflict (code) do update
set name = excluded.name;

delete from public.departments d
where d.code not in ('GA', 'HRM')
  and not exists (
    select 1
    from public.documents doc
    where doc.department_id = d.id
  )
  and not exists (
    select 1
    from public.profiles p
    where p.department_id = d.id
  );

commit;
