-- Only Supabase-managed Storage tables are touched. Business data remains in D1.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('courier-public','courier-public',true,512000,ARRAY['image/webp']),
 ('payment-proofs-private','payment-proofs-private',false,2097152,ARRAY['image/jpeg','image/png','image/webp']),
 ('private-documents','private-documents',false,2097152,ARRAY['image/jpeg','image/png','application/pdf'])
ON CONFLICT(id) DO UPDATE SET public=excluded.public,
 file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
DROP POLICY IF EXISTS menrut_public_avatar_read ON storage.objects;
CREATE POLICY menrut_public_avatar_read ON storage.objects FOR SELECT TO anon,authenticated
 USING(bucket_id='courier-public');
DROP POLICY IF EXISTS menrut_avatar_insert ON storage.objects;
CREATE POLICY menrut_avatar_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='courier-public'
 AND (storage.foldername(name))[1]=(SELECT auth.uid())::text
 AND (storage.foldername(name))[2]='avatar'
 AND array_length(storage.foldername(name),1)=2
 AND storage.extension(name)='webp');
DROP POLICY IF EXISTS menrut_avatar_delete ON storage.objects;
CREATE POLICY menrut_avatar_delete ON storage.objects FOR DELETE TO authenticated
 USING(bucket_id='courier-public' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
-- No UPDATE policy: uploads are immutable and use a new random filename.
-- Private buckets initially allow owners to read, but no client upload until
-- the payment/document authorization flow is implemented.
DROP POLICY IF EXISTS menrut_private_owner_read ON storage.objects;
CREATE POLICY menrut_private_owner_read ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id IN ('payment-proofs-private','private-documents')
 AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
