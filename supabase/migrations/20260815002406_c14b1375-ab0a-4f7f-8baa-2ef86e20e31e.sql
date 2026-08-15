REVOKE ALL ON FUNCTION public.log_grade_audit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_locked_grades() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_student_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_staff_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_students_by_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_students_by_email() TO authenticated;