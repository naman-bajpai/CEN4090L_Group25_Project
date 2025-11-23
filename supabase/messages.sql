-- Messages table for item-related conversations
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.messages enable row level security;

-- RLS Policies
-- Users can read messages where they are sender or receiver
create policy "Users can read their own messages"
  on public.messages
  for select
  using (
    auth.uid() = sender_id or auth.uid() = receiver_id
  );

-- Users can insert messages
create policy "Users can send messages"
  on public.messages
  for insert
  with check (auth.uid() = sender_id);

-- Users can update messages they received (to mark as read)
create policy "Users can update received messages"
  on public.messages
  for update
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

-- Index for better query performance
create index if not exists messages_item_id_idx on public.messages(item_id);
create index if not exists messages_sender_id_idx on public.messages(sender_id);
create index if not exists messages_receiver_id_idx on public.messages(receiver_id);
create index if not exists messages_created_at_idx on public.messages(created_at desc);

