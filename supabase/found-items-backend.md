# Found Items Backend Documentation

## Overview
The backend already supports posting found items through the existing `items` table. The schema uses an enum type that includes both 'lost' and 'found' item types.

## Database Schema

### Items Table
The `items` table supports both lost and found items through the `type` field:

```sql
create type if not exists public.item_type as enum ('lost','found');
create type if not exists public.item_status as enum ('open','claimed','closed');

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type public.item_type not null,  -- Can be 'lost' or 'found'
  title text not null,
  description text,
  color text,
  location text,
  when_lost timestamptz,  -- Used for both lost and found items (when_lost for lost, when found for found)
  image_path text,
  status public.item_status default 'open',
  created_at timestamptz default now()
);
```

### Key Fields for Found Items:
- **type**: Set to `'found'` when posting a found item
- **title**: Required - Name/description of the found item
- **description**: Optional - Detailed description
- **color**: Optional - Color of the item
- **location**: Optional - Where the item was found
- **when_lost**: Optional - When the item was found (reused field)
- **image_path**: Optional - Path to uploaded image in Supabase Storage
- **status**: Defaults to `'open'`, can be `'claimed'` or `'closed'`

## Row Level Security (RLS) Policies

The existing policies already support found items:

```sql
-- Anyone authenticated can view all items (including found items)
create policy "items_select_authed"
  on public.items for select
  to authenticated
  using (true);

-- Users can only insert items with their own user_id
create policy "items_insert_own"
  on public.items for insert
  to authenticated
  with check (user_id = auth.uid());

-- Users can only update their own items
create policy "items_update_own"
  on public.items for update
  to authenticated
  using (user_id = auth.uid());

-- Users can only delete their own items
create policy "items_delete_own"
  on public.items for delete
  to authenticated
  using (user_id = auth.uid());
```

## Storage Policies

Found items use the same storage bucket (`item-images`) as lost items. The storage policies allow:
- All authenticated users to view images
- Users to upload images for their own items

See `supabase/storage.sql` for storage bucket policies.

## API Usage

### Creating a Found Item

The `createItem` function in `lib/api.ts` handles both lost and found items:

```typescript
await createItem(
  {
    user_id: session.user.id,
    type: 'found',  // Set type to 'found'
    title: 'Black Wallet',
    description: 'Found at the library',
    color: 'Black',
    location: 'Main Library, 2nd Floor',
    when_lost: new Date('2024-01-15').toISOString(), // When found
    status: 'open',
  },
  imageUri // Optional image URI
);
```

### Querying Found Items

To get all found items:

```typescript
const foundItems = await getItems({ type: 'found' });
```

To filter by status:

```typescript
const openFoundItems = await getItems({ 
  type: 'found', 
  status: 'open' 
});
```

## Workflow

1. **User posts found item**: User fills out form with item details and optional image
2. **Item created**: Item is inserted into `items` table with `type='found'`
3. **Image uploaded**: If provided, image is uploaded to Supabase Storage
4. **Item appears in Found tab**: Item is visible to all authenticated users
5. **User claims item**: When someone claims the item, status changes to 'claimed'
6. **Notification sent**: Finder receives notification when item is claimed

## No Additional Backend Changes Required

The existing database schema, RLS policies, and storage policies already fully support found items. No additional SQL migrations or backend changes are needed.

