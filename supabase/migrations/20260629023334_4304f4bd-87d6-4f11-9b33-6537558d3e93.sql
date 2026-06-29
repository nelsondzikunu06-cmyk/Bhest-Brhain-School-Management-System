
ALTER FUNCTION public.set_student_code() SECURITY INVOKER;
ALTER FUNCTION public.set_staff_code()   SECURITY INVOKER;

-- Trigger runs as the inserting user; they need to advance the sequences.
GRANT USAGE ON SEQUENCE public.bba_student_seq TO authenticated, service_role;
GRANT USAGE ON SEQUENCE public.bba_staff_seq   TO authenticated, service_role;
