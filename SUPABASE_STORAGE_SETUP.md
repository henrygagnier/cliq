# Supabase Storage Setup Guide

## Photo Upload Configuration

To enable photo uploads in the onboarding flow, you need to set up the Supabase storage bucket.

### Step 1: Run Database Migrations

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open and run the SQL in `lib/database-migrations.sql`
4. This will create/update the `user_profiles` table with the necessary columns:
   - `avatar_url` - stores the public URL of the uploaded photo
   - `socials` - stores social media handles as JSONB
   - `bio` - stores user bio text

### Step 2: Create the Avatars Bucket

1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. Set the following:
   - **Name**: `avatars`
   - **Public bucket**: ✅ Check this box (so photos are publicly accessible)
   - **File size limit**: 5MB (recommended)
   - **Allowed MIME types**: `image/jpeg,image/jpg,image/png` (optional)

### Step 3: Set Up Storage Policies

After creating the bucket, you need to add policies to control access:

1. Click on the `avatars` bucket
2. Go to **Policies** tab
3. Add the following policies:

#### Policy 1: Allow Authenticated Uploads (INSERT)

- **Policy name**: "Authenticated users can upload avatars"
- **Policy definition**: `INSERT`
- **Target roles**: `authenticated`
- **Policy expression**:
  ```sql
  (role() = 'authenticated')
  ```

#### Policy 2: Public Read Access (SELECT)

- **Policy name**: "Public can view avatars"
- **Policy definition**: `SELECT`
- **Target roles**: `public`
- **Policy expression**:
  ```sql
  true
  ```

#### Policy 3: User Can Update Their Own (UPDATE)

- **Policy name**: "Users can update their own avatars"
- **Policy definition**: `UPDATE`
- **Target roles**: `authenticated`
- **Policy expression**:
  ```sql
  (auth.uid()::text = (storage.foldername(name))[1])
  ```

#### Policy 4: User Can Delete Their Own (DELETE)

- **Policy name**: "Users can delete their own avatars"
- **Policy definition**: `DELETE`
- **Target roles**: `authenticated`
- **Policy expression**:
  ```sql
  (auth.uid()::text = (storage.foldername(name))[1])
  ```

### Step 4: Test the Upload

1. Run your app: `npx expo start`
2. Go through the onboarding flow
3. Select a photo in the Create Profile screen
4. Complete the onboarding
5. Check the Supabase Storage dashboard to verify the photo was uploaded

### Troubleshooting

If uploads are failing:

1. **Check bucket exists**: Verify the `avatars` bucket is created
2. **Check bucket is public**: Ensure "Public bucket" is enabled
3. **Check policies**: Verify all 4 policies are created correctly
4. **Check authentication**: Make sure the user is authenticated before uploading
5. **Check file format**: Ensure you're uploading a valid image (JPEG/PNG)
6. **Check console logs**: Look for error messages in the app logs

### What Was Fixed

The photo upload implementation had several issues that have been corrected:

1. ✅ **Data mapping mismatch** - Changed `profileImage` to `photoUri` for consistency
2. ✅ **Socials format** - Transformed socials from `{value, enabled}` to simple `{platform: username}` format
3. ✅ **Buffer issue** - Replaced `Buffer.from()` with `Uint8Array` for React Native compatibility
4. ✅ **Database schema** - Added `bio` and `socials` columns to the migrations

The photo upload should now work correctly once the Supabase storage bucket is properly configured!
