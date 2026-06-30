CREATE OR REPLACE FUNCTION public.link_my_children()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL THEN RETURN 0; END IF;

  UPDATE public.students
  SET parent_user_id = auth.uid()
  WHERE parent_user_id IS NULL
    AND lower(parent_email) = lower(v_email);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.link_my_children() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_my_children() TO authenticated;