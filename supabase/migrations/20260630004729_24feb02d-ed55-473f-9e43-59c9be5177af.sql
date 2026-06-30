
-- 1. has_role: keep as STABLE, switch to SECURITY INVOKER so it isn't a definer bypass.
--    The user_roles SELECT policy already lets a signed-in user read their own rows,
--    which is all has_role(auth.uid(), ...) needs.
ALTER FUNCTION public.has_role(uuid, public.app_role) SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2. Drop the admin_set_role RPC; admins will mutate roles via a server function
--    using the service-role key after verifying admin status.
DROP FUNCTION IF EXISTS public.admin_set_role(uuid, public.app_role, boolean);

-- 3. Trigger helper functions never need direct EXECUTE from clients.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_student_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_staff_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 4. Let parents read storage objects in student-photos for their own children only.
--    students.photo_url stores a signed URL containing the object path; match by name suffix.
DROP POLICY IF EXISTS "Parents view their child's photo" ON storage.objects;
CREATE POLICY "Parents view their child's photo"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-photos'
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.parent_user_id = auth.uid()
      AND s.photo_url LIKE '%' || storage.objects.name || '%'
  )
);
