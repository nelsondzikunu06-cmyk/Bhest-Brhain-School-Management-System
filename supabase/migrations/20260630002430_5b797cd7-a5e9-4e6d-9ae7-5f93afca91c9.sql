
-- 1) Restrict staff SELECT to admins only
DROP POLICY IF EXISTS "authenticated view staff" ON public.staff;
CREATE POLICY "admins view staff" ON public.staff
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 2) Restrict storage student-photos SELECT to admins only
DROP POLICY IF EXISTS "authenticated view student photos" ON storage.objects;
CREATE POLICY "admins view student photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'student-photos' AND has_role(auth.uid(), 'admin'));

-- 3) Harden handle_new_user: do not auto-grant parent role from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE user_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  -- All other signups receive NO role; an admin must grant it explicitly.
  RETURN NEW;
END;
$function$;

-- 4) Lock down admin_set_role EXECUTE perms (defense in depth; function self-checks admin)
REVOKE EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role, boolean) TO authenticated, service_role;
