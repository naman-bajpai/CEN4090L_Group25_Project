# Admin Role Setup Guide

This document explains how to set up and use the admin role system for the Lost and Found application.

## Database Setup (SQL)

### 1. Run the Migration

Execute the SQL migration file to add admin functionality:

```sql
-- Run this file in your Supabase SQL editor:
-- supabase/migrations/001_add_admin_role.sql
```

Or apply it directly in Supabase Dashboard → SQL Editor.

### 2. Create Your First Admin

After running the migration, you need to manually set a user as admin. Run this SQL:

```sql
-- Replace 'USER_ID_HERE' with the actual user ID from auth.users
UPDATE profiles
SET role = 'admin'
WHERE id = 'USER_ID_HERE';
```

To find a user's ID:
```sql
SELECT id, email FROM auth.users;
```

### 3. Verify the Setup

Check if admin functions are working:

```sql
-- Test if a user is admin (replace with actual user ID)
SELECT is_admin('USER_ID_HERE');

-- View all profiles (should work for admins)
SELECT * FROM profiles;
```

## Frontend API Functions

All admin functions are available in `lib/api.ts`. Here's how to use them:

### Check Admin Status

```typescript
import { checkIsAdmin } from '@/lib/api';

// Check if current user is admin
const isAdmin = await checkIsAdmin();
if (isAdmin) {
  // User is an admin
}
```

### View All Students

```typescript
import { getAllStudents } from '@/lib/api';

try {
  const students = await getAllStudents();
  // Returns array of all student profiles
  students.forEach(student => {
    console.log(student.full_name, student.verified, student.role);
  });
} catch (error) {
  // User is not an admin
  console.error(error.message);
}
```

### Edit Any Posting (Admin Override)

```typescript
import { adminUpdateItem } from '@/lib/api';

try {
  const updatedItem = await adminUpdateItem('item-id-here', {
    title: 'Updated Title',
    description: 'Updated description',
    status: 'closed',
    // ... any other item fields
  });
  console.log('Item updated:', updatedItem);
} catch (error) {
  console.error('Failed to update item:', error.message);
}
```

### Delete Any Posting

```typescript
import { adminDeleteItem } from '@/lib/api';

try {
  await adminDeleteItem('item-id-here');
  console.log('Item deleted successfully');
} catch (error) {
  console.error('Failed to delete item:', error.message);
}
```

### View All Items (Admin)

```typescript
import { adminGetAllItems } from '@/lib/api';

try {
  // Get all items
  const allItems = await adminGetAllItems();
  
  // Or with filters
  const lostItems = await adminGetAllItems({
    type: 'lost',
    status: 'open',
    limit: 50
  });
  
  console.log('All items:', allItems);
} catch (error) {
  console.error('Failed to get items:', error.message);
}
```

### Delete a Student

```typescript
import { adminDeleteStudent } from '@/lib/api';

try {
  await adminDeleteStudent('user-id-here');
  console.log('Student deleted successfully');
} catch (error) {
  console.error('Failed to delete student:', error.message);
}
```

### Verify a Student

```typescript
import { adminVerifyStudent } from '@/lib/api';

try {
  const updatedProfile = await adminVerifyStudent('user-id-here');
  console.log('Student verified:', updatedProfile);
} catch (error) {
  console.error('Failed to verify student:', error.message);
}
```

### Unverify a Student

```typescript
import { adminUnverifyStudent } from '@/lib/api';

try {
  const updatedProfile = await adminUnverifyStudent('user-id-here');
  console.log('Student unverified:', updatedProfile);
} catch (error) {
  console.error('Failed to unverify student:', error.message);
}
```

### Update Student Profile (Admin)

```typescript
import { adminUpdateStudent } from '@/lib/api';

try {
  const updatedProfile = await adminUpdateStudent('user-id-here', {
    full_name: 'New Name',
    verified: true,
    role: 'student', // Admins can change roles
    // ... other profile fields
  });
  console.log('Profile updated:', updatedProfile);
} catch (error) {
  console.error('Failed to update profile:', error.message);
}
```

## Example: Admin Dashboard Component

Here's an example React component that uses these functions:

```typescript
import { useState, useEffect } from 'react';
import { View, Text, Button, FlatList } from 'react-native';
import {
  checkIsAdmin,
  getAllStudents,
  adminVerifyStudent,
  adminDeleteStudent,
  adminGetAllItems,
  adminDeleteItem,
} from '@/lib/api';

export function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [students, setStudents] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    try {
      const adminStatus = await checkIsAdmin();
      setIsAdmin(adminStatus);
      
      if (adminStatus) {
        const [studentsData, itemsData] = await Promise.all([
          getAllStudents(),
          adminGetAllItems(),
        ]);
        setStudents(studentsData);
        setItems(itemsData);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyStudent(userId: string) {
    try {
      await adminVerifyStudent(userId);
      await loadAdminData(); // Refresh
    } catch (error) {
      alert('Failed to verify student: ' + error.message);
    }
  }

  async function handleDeleteStudent(userId: string) {
    try {
      await adminDeleteStudent(userId);
      await loadAdminData(); // Refresh
    } catch (error) {
      alert('Failed to delete student: ' + error.message);
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      await adminDeleteItem(itemId);
      await loadAdminData(); // Refresh
    } catch (error) {
      alert('Failed to delete item: ' + error.message);
    }
  }

  if (loading) {
    return <Text>Loading...</Text>;
  }

  if (!isAdmin) {
    return <Text>Access Denied: Admin privileges required</Text>;
  }

  return (
    <View>
      <Text>Admin Dashboard</Text>
      
      <Text>Students ({students.length})</Text>
      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View>
            <Text>{item.full_name || 'No name'}</Text>
            <Text>Verified: {item.verified ? 'Yes' : 'No'}</Text>
            <Button
              title={item.verified ? 'Unverify' : 'Verify'}
              onPress={() => handleVerifyStudent(item.id)}
            />
            <Button
              title="Delete"
              onPress={() => handleDeleteStudent(item.id)}
            />
          </View>
        )}
      />
      
      <Text>Items ({items.length})</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View>
            <Text>{item.title}</Text>
            <Text>Status: {item.status}</Text>
            <Button
              title="Delete"
              onPress={() => handleDeleteItem(item.id)}
            />
          </View>
        )}
      />
    </View>
  );
}
```

## Security Notes

1. **RLS Policies**: The SQL migration sets up Row Level Security (RLS) policies that ensure only admins can perform admin actions.

2. **Frontend Checks**: The frontend functions check admin status, but the real security is in the database RLS policies.

3. **Role Assignment**: Only manually assign admin roles through SQL. Never allow users to self-promote to admin.

4. **Verified Status**: The `verified` field is separate from `role`. A student can be verified without being an admin.

## Database Functions Available

The migration creates these SQL functions:

- `is_admin(user_id UUID)` - Check if a user is an admin
- `admin_delete_profile(target_user_id UUID)` - Delete a user profile (admin only)
- `admin_verify_student(target_user_id UUID)` - Verify a student (admin only)
- `admin_unverify_student(target_user_id UUID)` - Unverify a student (admin only)

These functions are called automatically by the frontend API functions.

