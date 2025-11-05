insert into storage.buckets (id, name, public)
values ('item-images','item-images', false)
on conflict (id) do nothing;

create policy "images_insert_own_prefix"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'item-images'
    and owner = auth.uid()
    and position(auth.uid()::text in path) = 1
  );

create policy "images_select_owner"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'item-images' and owner = auth.uid());

create policy "images_update_owner"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'item-images' and owner = auth.uid());

create policy "images_delete_owner"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'item-images' and owner = auth.uid());
