-- Migration: Update hub_name enum values
-- This migration updates the hub_name enum from old values to new values:
-- "Main Library Hub" -> "Strozier Library"
-- "Student Center Hub" -> "Student Union"
-- "Campus Services Hub" -> "Dirac Library"

-- Step 1: Create a new enum with the updated values
CREATE TYPE hub_name_new AS ENUM (
  'Strozier Library',
  'Student Union',
  'Dirac Library'
);

-- Step 2: Change the column type to text temporarily
ALTER TABLE items
  ALTER COLUMN hub TYPE text
  USING hub::text;

-- Step 3: Update existing data to map old values to new values
-- Map "Main Library Hub" -> "Strozier Library"
UPDATE items
SET hub = 'Strozier Library'
WHERE hub = 'Main Library Hub';

-- Map "Student Center Hub" -> "Student Union"
UPDATE items
SET hub = 'Student Union'
WHERE hub = 'Student Center Hub';

-- Map "Campus Services Hub" -> "Dirac Library"
UPDATE items
SET hub = 'Dirac Library'
WHERE hub = 'Campus Services Hub';

-- Step 4: Change the column type to use the new enum
ALTER TABLE items
  ALTER COLUMN hub TYPE hub_name_new
  USING hub::hub_name_new;

-- Step 5: Drop the old enum type
DROP TYPE hub_name;

-- Step 6: Rename the new enum to the original name
ALTER TYPE hub_name_new RENAME TO hub_name;

