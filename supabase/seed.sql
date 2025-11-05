-- Optional: Create a few example users manually (for demo only)
-- In production, users are created automatically via auth.signUp()

-- Insert demo profiles (these IDs must match existing auth.users IDs if using real accounts)
insert into public.profiles (id, full_name)
values
  ('00000000-0000-0000-0000-000000000001', 'Demo Admin'),
  ('00000000-0000-0000-0000-000000000002', 'Test User');

-- Insert sample items (lost/found posts)
insert into public.items (user_id, type, title, description, color, location, when_lost, status)
values
  ('00000000-0000-0000-0000-000000000001', 'lost', 'FSU Student ID', 'Lost near Strozier Library', 'Garnet', 'Strozier Library', now() - interval '1 day', 'open'),
  ('00000000-0000-0000-0000-000000000002', 'found', 'AirPods Case', 'Found by the fountain near Landis Green', 'White', 'Landis Green', now() - interval '2 days', 'open');

-- Optional notifications for testing
insert into public.notifications (user_id, message)
values
  ('00000000-0000-0000-0000-000000000001', 'Your item report has been viewed by another user.'),
  ('00000000-0000-0000-0000-000000000002', 'You have 1 potential match for a found item.');
