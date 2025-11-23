create policy "profiles_select_authed"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_insert_self"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

create policy "items_select_authed"
  on public.items for select
  to authenticated
  using (true);

create policy "items_insert_own"
  on public.items for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "items_update_own"
  on public.items for update
  to authenticated
  using (user_id = auth.uid());

create policy "items_delete_own"
  on public.items for delete
  to authenticated
  using (user_id = auth.uid());

create policy "notifications_select_self"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications_insert_self"
  on public.notifications for insert
  to authenticated
  with check (true); -- Allow users to create notifications for others (e.g., when messaging)

create policy "notifications_update_self"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid());
