-- Migration: Add admin role and verified status to profiles table
-- This migration adds role-based access control for admins

-- Step 1: Create user_role enum type
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add role and verified columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'student',
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- Step 2: Create an index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Step 3: Create a function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Update RLS policies to allow admins to view all profiles
-- Drop existing policies if they exist (adjust based on your current setup)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    -- Users can view their own profile
    id = auth.uid()
    OR
    -- Admins can view all profiles
    is_admin(auth.uid())
  );

-- Step 5: Update RLS policies to allow admins to update any profile
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    -- Users can update their own profile (but not change role)
    (id = auth.uid() AND (role IS NULL OR role = 'student'))
    OR
    -- Admins can update any profile
    is_admin(auth.uid())
  )
  WITH CHECK (
    -- Users can only update their own profile (and not change role)
    (id = auth.uid() AND (role IS NULL OR role = 'student'))
    OR
    -- Admins can update any profile
    is_admin(auth.uid())
  );

-- Step 6: Update RLS policies for items table to allow admins to edit/delete any item
DROP POLICY IF EXISTS "Admins can update any item" ON items;
CREATE POLICY "Admins can update any item"
  ON items FOR UPDATE
  USING (
    -- Users can update their own items
    user_id = auth.uid()
    OR
    -- Admins can update any item
    is_admin(auth.uid())
  )
  WITH CHECK (
    -- Users can update their own items
    user_id = auth.uid()
    OR
    -- Admins can update any item
    is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can delete any item" ON items;
CREATE POLICY "Admins can delete any item"
  ON items FOR DELETE
  USING (
    -- Users can delete their own items
    user_id = auth.uid()
    OR
    -- Admins can delete any item
    is_admin(auth.uid())
  );

-- Step 7: Allow admins to view all items (if you have a SELECT policy)
-- Note: Adjust this based on your existing RLS policies
DROP POLICY IF EXISTS "Admins can view all items" ON items;
CREATE POLICY "Admins can view all items"
  ON items FOR SELECT
  USING (
    -- Existing conditions OR admin check
    -- This assumes you want admins to see everything
    -- You may need to adjust this based on your current policies
    true
  );

-- Step 8: Create a function to safely delete a user profile (admin only)
-- This will be called from the frontend with proper admin checks
CREATE OR REPLACE FUNCTION admin_delete_profile(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the caller is an admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can delete profiles';
  END IF;
  
  -- Delete the profile (cascade will handle related data if foreign keys are set)
  DELETE FROM profiles WHERE id = target_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create a function to verify a student (admin only)
CREATE OR REPLACE FUNCTION admin_verify_student(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the caller is an admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can verify students';
  END IF;
  
  -- Update the verified status
  UPDATE profiles
  SET verified = true
  WHERE id = target_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Create a function to unverify a student (admin only)
CREATE OR REPLACE FUNCTION admin_unverify_student(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the caller is an admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can unverify students';
  END IF;
  
  -- Update the verified status
  UPDATE profiles
  SET verified = false
  WHERE id = target_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_verify_student(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_unverify_student(UUID) TO authenticated;

-- Step 12: Add a comment for documentation
COMMENT ON COLUMN profiles.role IS 'User role: student or admin';
COMMENT ON COLUMN profiles.verified IS 'Whether the student profile has been verified by an admin';

