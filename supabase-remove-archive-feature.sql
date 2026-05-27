-- Panin DocFlow - Remove archive workflow from active use
-- Run this once if you previously archived documents and want them visible again.
-- Existing archived documents will be returned to SELESAI.

update public.documents
set
  status = 'SELESAI',
  archived_at = null,
  updated_at = now()
where status = 'DIARSIPKAN';
