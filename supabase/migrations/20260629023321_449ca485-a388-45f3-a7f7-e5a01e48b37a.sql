
-- Sequences
CREATE SEQUENCE IF NOT EXISTS public.bba_student_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.bba_staff_seq START 1;

-- Columns
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS student_code text;
ALTER TABLE public.staff    ADD COLUMN IF NOT EXISTS staff_code   text;

-- Trigger functions
CREATE OR REPLACE FUNCTION public.set_student_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.student_code IS NULL OR NEW.student_code = '' THEN
    NEW.student_code := 'BBA' || lpad(nextval('public.bba_student_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_staff_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.staff_code IS NULL OR NEW.staff_code = '' THEN
    NEW.staff_code := 'BBA-S' || lpad(nextval('public.bba_staff_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_student_code ON public.students;
CREATE TRIGGER trg_set_student_code BEFORE INSERT ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_student_code();

DROP TRIGGER IF EXISTS trg_set_staff_code ON public.staff;
CREATE TRIGGER trg_set_staff_code BEFORE INSERT ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.set_staff_code();

-- Back-fill existing rows in creation order
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.students WHERE student_code IS NULL ORDER BY created_at LOOP
    UPDATE public.students SET student_code = 'BBA' || lpad(nextval('public.bba_student_seq')::text, 4, '0') WHERE id = r.id;
  END LOOP;
  FOR r IN SELECT id FROM public.staff WHERE staff_code IS NULL ORDER BY created_at LOOP
    UPDATE public.staff SET staff_code = 'BBA-S' || lpad(nextval('public.bba_staff_seq')::text, 4, '0') WHERE id = r.id;
  END LOOP;
END $$;

-- Uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS students_student_code_key ON public.students(student_code);
CREATE UNIQUE INDEX IF NOT EXISTS staff_staff_code_key ON public.staff(staff_code);
