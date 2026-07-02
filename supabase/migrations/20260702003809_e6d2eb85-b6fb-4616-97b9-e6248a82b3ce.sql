
-- Drop the overly broad self-link UPDATE policy
DROP POLICY IF EXISTS "Parents can self-link by matching email" ON public.students;

-- Narrow SECURITY DEFINER function: only updates parent_user_id, only when the
-- caller's verified email matches parent_email and no parent is linked yet.
CREATE OR REPLACE FUNCTION public.claim_students_by_email()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL THEN
    RETURN 0;
  END IF;

  WITH updated AS (
    UPDATE public.students
       SET parent_user_id = v_uid
     WHERE parent_user_id IS NULL
       AND lower(parent_email) = v_email
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM updated;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_students_by_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_students_by_email() TO authenticated;
