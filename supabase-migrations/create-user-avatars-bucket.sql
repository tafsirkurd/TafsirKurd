-- Create Storage Bucket for User Avatars
-- Run this in Supabase SQL Editor

-- Create the bucket for user avatars (public bucket)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'user-avatars',
    'user-avatars',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions to bucket
GRANT ALL ON storage.buckets TO authenticated;
GRANT SELECT ON storage.buckets TO anon;

-- Note: Storage policies must be created via Supabase Dashboard UI
-- Go to Storage → user-avatars → Policies → New Policy
-- Then add these 4 policies (copy-paste the policy code below):

/*
==================================================
POLICY 1: INSERT (Authenticated users can upload)
==================================================
Name: Users can upload avatars
Operation: INSERT
Roles: authenticated

WITH CHECK expression:
bucket_id = 'user-avatars'

==================================================
POLICY 2: UPDATE (Authenticated users can update)
==================================================
Name: Users can update avatars
Operation: UPDATE
Roles: authenticated

USING expression:
bucket_id = 'user-avatars'

WITH CHECK expression:
bucket_id = 'user-avatars'

==================================================
POLICY 3: DELETE (Authenticated users can delete)
==================================================
Name: Users can delete avatars
Operation: DELETE
Roles: authenticated

USING expression:
bucket_id = 'user-avatars'

==================================================
POLICY 4: SELECT (Public can view)
==================================================
Name: Public can view avatars
Operation: SELECT
Roles: public

USING expression:
bucket_id = 'user-avatars'

*/
