-- Private per-user file storage for uploaded training sheets and body-composition reports.
begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('foco-private-files', 'foco-private-files', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
drop policy if exists foco_files_select_own on storage.objects;
create policy foco_files_select_own on storage.objects for select to authenticated
  using (bucket_id = 'foco-private-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists foco_files_insert_own on storage.objects;
create policy foco_files_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'foco-private-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists foco_files_update_own on storage.objects;
create policy foco_files_update_own on storage.objects for update to authenticated
  using (bucket_id = 'foco-private-files' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'foco-private-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists foco_files_delete_own on storage.objects;
create policy foco_files_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'foco-private-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
commit;
