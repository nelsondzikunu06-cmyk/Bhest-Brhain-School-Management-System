
CREATE POLICY "admins manage student photos" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'student-photos' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'student-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "authenticated view student photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'student-photos');
