-- ============ GRADING SCALE ============
CREATE TABLE IF NOT EXISTS public.grading_scale (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_score numeric(5,2) NOT NULL CHECK (min_score >= 0 AND min_score <= 100),
  max_score numeric(5,2) NOT NULL CHECK (max_score >= 0 AND max_score <= 100),
  grade text NOT NULL,
  remark text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (max_score >= min_score)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grading_scale TO authenticated;
GRANT ALL ON public.grading_scale TO service_role;
ALTER TABLE public.grading_scale ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage grading scale" ON public.grading_scale;
CREATE POLICY "admins manage grading scale" ON public.grading_scale FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "authenticated read grading scale" ON public.grading_scale;
CREATE POLICY "authenticated read grading scale" ON public.grading_scale FOR SELECT TO authenticated USING (true);
DROP TRIGGER IF EXISTS update_grading_scale_updated_at ON public.grading_scale;
CREATE TRIGGER update_grading_scale_updated_at BEFORE UPDATE ON public.grading_scale
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.grading_scale (min_score, max_score, grade, remark)
SELECT * FROM (VALUES
  (80,100,'A','Excellent'),(70,79.99,'B','Very Good'),(60,69.99,'C','Good'),
  (50,59.99,'D','Satisfactory'),(40,49.99,'E','Needs Improvement'),(0,39.99,'F','Fail')
) AS v(a,b,c,d)
WHERE NOT EXISTS (SELECT 1 FROM public.grading_scale);

-- ============ GRADES UPGRADE ============
ALTER TABLE public.grades
  ADD COLUMN IF NOT EXISTS test_1 numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS group_work numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS test_2 numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS project_work numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exam_score numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS teacher_remark text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- backfill legacy single-score rows into the component model (final total unchanged)
UPDATE public.grades SET
  test_1 = LEAST(30, ROUND(score * 0.30, 2)),
  group_work = LEAST(20, ROUND(score * 0.20, 2)),
  test_2 = LEAST(30, ROUND(score * 0.30, 2)),
  project_work = LEAST(20, GREATEST(0, ROUND(score,2) - ROUND(score*0.30,2) - ROUND(score*0.20,2) - ROUND(score*0.30,2))),
  exam_score = LEAST(100, GREATEST(0, ROUND(score, 2))),
  teacher_remark = COALESCE(teacher_remark, teacher_comment)
WHERE exam_score = 0 AND test_1 = 0;

ALTER TABLE public.grades ALTER COLUMN score DROP NOT NULL;

ALTER TABLE public.grades
  ADD COLUMN IF NOT EXISTS class_score numeric(6,2)
    GENERATED ALWAYS AS (test_1 + group_work + test_2 + project_work) STORED,
  ADD COLUMN IF NOT EXISTS class_contribution numeric(6,2)
    GENERATED ALWAYS AS (ROUND((test_1 + group_work + test_2 + project_work) * 0.5, 2)) STORED,
  ADD COLUMN IF NOT EXISTS exam_contribution numeric(6,2)
    GENERATED ALWAYS AS (ROUND(exam_score * 0.5, 2)) STORED,
  ADD COLUMN IF NOT EXISTS total numeric(6,2)
    GENERATED ALWAYS AS (ROUND((test_1 + group_work + test_2 + project_work) * 0.5, 2) + ROUND(exam_score * 0.5, 2)) STORED;

ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_component_ranges_chk;
ALTER TABLE public.grades ADD CONSTRAINT grades_component_ranges_chk CHECK (
  test_1 >= 0 AND test_1 <= 30 AND
  group_work >= 0 AND group_work <= 20 AND
  test_2 >= 0 AND test_2 <= 30 AND
  project_work >= 0 AND project_work <= 20 AND
  exam_score >= 0 AND exam_score <= 100
);
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_status_chk;
ALTER TABLE public.grades ADD CONSTRAINT grades_status_chk
  CHECK (status IN ('draft','submitted','approved','published'));

-- collapse duplicates (same student/subject/term/year), keeping the newest row
DELETE FROM public.grades g USING public.grades g2
WHERE g.student_id = g2.student_id AND g.subject = g2.subject
  AND g.term = g2.term AND g.academic_year = g2.academic_year
  AND (g.created_at < g2.created_at OR (g.created_at = g2.created_at AND g.id < g2.id));

CREATE UNIQUE INDEX IF NOT EXISTS grades_unique_entry
  ON public.grades (student_id, subject, term, academic_year);

DROP TRIGGER IF EXISTS update_grades_updated_at ON public.grades;
CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON public.grades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- block edits to locked/published grades unless an admin unlocks first
CREATE OR REPLACE FUNCTION public.guard_locked_grades()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.locked AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'This result is published and locked.';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.locked AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'This result is published and locked.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.guard_locked_grades() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_guard_locked_grades ON public.grades;
CREATE TRIGGER trg_guard_locked_grades BEFORE UPDATE OR DELETE ON public.grades
  FOR EACH ROW EXECUTE FUNCTION public.guard_locked_grades();

-- ============ GRADE AUDIT LOG ============
CREATE TABLE IF NOT EXISTS public.grade_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id uuid,
  student_id uuid,
  subject text,
  term text,
  academic_year text,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.grade_audit TO authenticated;
GRANT ALL ON public.grade_audit TO service_role;
ALTER TABLE public.grade_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read grade audit" ON public.grade_audit;
CREATE POLICY "admins read grade audit" ON public.grade_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_grade_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.grade_audit (grade_id, student_id, subject, term, academic_year, action, new_values, changed_by)
    VALUES (NEW.id, NEW.student_id, NEW.subject, NEW.term, NEW.academic_year, 'insert', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.grade_audit (grade_id, student_id, subject, term, academic_year, action, old_values, new_values, changed_by)
    VALUES (NEW.id, NEW.student_id, NEW.subject, NEW.term, NEW.academic_year, 'update', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSE
    INSERT INTO public.grade_audit (grade_id, student_id, subject, term, academic_year, action, old_values, changed_by)
    VALUES (OLD.id, OLD.student_id, OLD.subject, OLD.term, OLD.academic_year, 'delete', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.log_grade_audit() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_log_grade_audit ON public.grades;
CREATE TRIGGER trg_log_grade_audit AFTER INSERT OR UPDATE OR DELETE ON public.grades
  FOR EACH ROW EXECUTE FUNCTION public.log_grade_audit();

-- ============ REPORT CARD SNAPSHOTS ============
CREATE TABLE IF NOT EXISTS public.report_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term text NOT NULL,
  academic_year text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  overall_position integer,
  class_size integer,
  average numeric(6,2),
  days_total integer NOT NULL DEFAULT 0,
  days_present integer NOT NULL DEFAULT 0,
  days_absent integer NOT NULL DEFAULT 0,
  days_late integer NOT NULL DEFAULT 0,
  promotion_status text,
  class_teacher_remark text,
  head_teacher_remark text,
  snapshot jsonb,
  published_at timestamptz,
  published_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, term, academic_year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_cards TO authenticated;
GRANT ALL ON public.report_cards TO service_role;
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage report cards" ON public.report_cards;
CREATE POLICY "admins manage report cards" ON public.report_cards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "parents read published report cards" ON public.report_cards;
CREATE POLICY "parents read published report cards" ON public.report_cards FOR SELECT TO authenticated
  USING (status = 'published' AND EXISTS (
    SELECT 1 FROM public.students s WHERE s.id = report_cards.student_id AND s.parent_user_id = auth.uid()
  ));
DROP TRIGGER IF EXISTS update_report_cards_updated_at ON public.report_cards;
CREATE TRIGGER update_report_cards_updated_at BEFORE UPDATE ON public.report_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.report_cards DROP CONSTRAINT IF EXISTS report_cards_status_chk;
ALTER TABLE public.report_cards ADD CONSTRAINT report_cards_status_chk
  CHECK (status IN ('draft','approved','published'));
ALTER TABLE public.report_cards DROP CONSTRAINT IF EXISTS report_cards_promotion_chk;
ALTER TABLE public.report_cards ADD CONSTRAINT report_cards_promotion_chk
  CHECK (promotion_status IS NULL OR promotion_status IN ('Promoted','Repeated','Graduated'));

-- ============ ATTENDANCE INTEGRITY ============
UPDATE public.attendance SET status = lower(status) WHERE status <> lower(status);
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_status_check;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_status_check
  CHECK (status IN ('present','absent','late'));

DELETE FROM public.attendance a USING public.attendance a2
WHERE a.student_id = a2.student_id AND a.date = a2.date
  AND (a.created_at < a2.created_at OR (a.created_at = a2.created_at AND a.id < a2.id));
CREATE UNIQUE INDEX IF NOT EXISTS attendance_student_date_unique
  ON public.attendance (student_id, date);

-- ============ FEE VALIDATION ============
ALTER TABLE public.fees DROP CONSTRAINT IF EXISTS fees_amount_positive_chk;
ALTER TABLE public.fees ADD CONSTRAINT fees_amount_positive_chk CHECK (amount_paid > 0);
ALTER TABLE public.fee_structures DROP CONSTRAINT IF EXISTS fee_structures_amount_chk;
ALTER TABLE public.fee_structures ADD CONSTRAINT fee_structures_amount_chk CHECK (amount >= 0);