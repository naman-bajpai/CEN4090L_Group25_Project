-- ============================================
-- ADMIN SQL QUERIES - Quick Reference
-- ============================================
-- Use these queries in Supabase SQL Editor for admin operations

-- ============================================
-- USER MANAGEMENT
-- ============================================

-- View all students
SELECT 
  p.id,
  p.full_name,
  au.email,
  p.role,
  p.verified,
  p.created_at,
  p.avatar_path
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at DESC;

-- View all students with their auth email
SELECT 
  p.id,
  p.full_name,
  au.email,
  p.role,
  p.verified,
  p.created_at
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at DESC;

-- Make a user an admin (replace USER_ID_HERE)
UPDATE profiles
SET role = 'admin'
WHERE id = 'USER_ID_HERE';

-- Remove admin role from a user
UPDATE profiles
SET role = 'student'
WHERE id = 'USER_ID_HERE';

-- Verify a student
UPDATE profiles
SET verified = true
WHERE id = 'USER_ID_HERE';

-- Unverify a student
UPDATE profiles
SET verified = false
WHERE id = 'USER_ID_HERE';

-- Delete a student profile (admin function)
SELECT admin_delete_profile('USER_ID_HERE');

-- Find user by email
SELECT 
  p.id,
  p.full_name,
  au.email,
  p.role,
  p.verified
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.email = 'user@example.com';

-- ============================================
-- ITEM MANAGEMENT
-- ============================================

-- View all items (admin view)
SELECT 
  i.*,
  p.full_name as owner_name,
  p.verified as owner_verified
FROM items i
LEFT JOIN profiles p ON i.user_id = p.id
ORDER BY i.created_at DESC;

-- View items by status
SELECT 
  i.*,
  p.full_name as owner_name
FROM items i
LEFT JOIN profiles p ON i.user_id = p.id
WHERE i.status = 'open'  -- or 'claimed' or 'closed'
ORDER BY i.created_at DESC;

-- View items by type
SELECT 
  i.*,
  p.full_name as owner_name
FROM items i
LEFT JOIN profiles p ON i.user_id = p.id
WHERE i.type = 'lost'  -- or 'found'
ORDER BY i.created_at DESC;

-- Delete an item (admin)
DELETE FROM items
WHERE id = 'ITEM_ID_HERE';

-- Update an item (admin)
UPDATE items
SET 
  title = 'New Title',
  description = 'New Description',
  status = 'closed'
WHERE id = 'ITEM_ID_HERE';

-- ============================================
-- ADMIN UTILITIES
-- ============================================

-- Check if a user is admin
SELECT is_admin('USER_ID_HERE');

-- Count total users
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE role = 'admin') as admin_count,
  COUNT(*) FILTER (WHERE role = 'student') as student_count,
  COUNT(*) FILTER (WHERE verified = true) as verified_count
FROM profiles;

-- Count total items
SELECT 
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE type = 'lost') as lost_count,
  COUNT(*) FILTER (WHERE type = 'found') as found_count,
  COUNT(*) FILTER (WHERE status = 'open') as open_count,
  COUNT(*) FILTER (WHERE status = 'claimed') as claimed_count,
  COUNT(*) FILTER (WHERE status = 'closed') as closed_count
FROM items;

-- View recent registrations
SELECT 
  p.id,
  p.full_name,
  au.email,
  p.role,
  p.verified,
  p.created_at
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at DESC
LIMIT 20;

-- View users with most items
SELECT 
  p.id,
  p.full_name,
  COUNT(i.id) as item_count
FROM profiles p
LEFT JOIN items i ON p.id = i.user_id
GROUP BY p.id, p.full_name
ORDER BY item_count DESC;

-- ============================================
-- VERIFICATION MANAGEMENT
-- ============================================

-- View unverified students
SELECT 
  p.id,
  p.full_name,
  au.email,
  p.created_at
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE p.verified = false
  AND p.role = 'student'
ORDER BY p.created_at DESC;

-- Verify all students (use with caution!)
UPDATE profiles
SET verified = true
WHERE role = 'student' AND verified = false;

-- ============================================
-- CLEANUP QUERIES
-- ============================================

-- Find orphaned items (items without valid user)
SELECT i.*
FROM items i
LEFT JOIN profiles p ON i.user_id = p.id
WHERE p.id IS NULL;

-- Find items from deleted users
SELECT i.*
FROM items i
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = i.user_id
);

-- ============================================
-- SECURITY CHECKS
-- ============================================

-- List all admins
SELECT 
  p.id,
  p.full_name,
  au.email,
  p.created_at
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE p.role = 'admin'
ORDER BY p.created_at;

-- Check RLS policies are enabled
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

