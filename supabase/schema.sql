create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  avatar_path text,
  created_at timestamptz default now()
);

create type if not exists public.item_type as enum ('lost','found');
create type if not exists public.item_status as enum ('open','claimed','closed');

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type public.item_type not null,
  title text not null,
  description text,
  color text,
  location text,
  when_lost timestamptz,
  image_path text,
  status public.item_status default 'open',
  created_at timestamptz default now()
);

create table if not exists public.notifications (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  message text not null,
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.notifications enable row level security;
