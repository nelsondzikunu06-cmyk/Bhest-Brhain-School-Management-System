DROP FUNCTION IF EXISTS public.link_my_children();

CREATE POLICY "Parents can self-link by matching email"
ON public.students
FOR UPDATE
TO authenticated
USING (
  parent_user_id IS NULL
  AND lower(parent_email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
)
WITH CHECK (
  parent_user_id = auth.uid()
  AND lower(parent_email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
);