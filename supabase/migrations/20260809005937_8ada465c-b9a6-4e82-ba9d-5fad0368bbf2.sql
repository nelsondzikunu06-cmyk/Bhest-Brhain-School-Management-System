-- =========================
-- MESSAGES (parent <-> school)
-- =========================
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL DEFAULT 'admin',
  sender_name TEXT,
  body TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_student ON public.messages(student_id, created_at DESC);
CREATE INDEX idx_messages_parent ON public.messages(parent_user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage messages" ON public.messages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "parents read own child messages" ON public.messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = messages.student_id AND s.parent_user_id = auth.uid()));

CREATE POLICY "parents send messages for own child" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid()
    AND sender_role = 'parent'
    AND EXISTS (SELECT 1 FROM public.students s WHERE s.id = messages.student_id AND s.parent_user_id = auth.uid())
  );

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- BROADCASTS
-- =========================
CREATE TABLE public.broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  audience TEXT NOT NULL DEFAULT 'all_parents',
  target_class TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_broadcasts_created ON public.broadcasts(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcasts TO authenticated;
GRANT ALL ON public.broadcasts TO service_role;

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage broadcasts" ON public.broadcasts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "parents read broadcasts" ON public.broadcasts
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'parent')
    AND (
      target_class IS NULL
      OR EXISTS (SELECT 1 FROM public.students s WHERE s.parent_user_id = auth.uid() AND s.class = broadcasts.target_class)
    )
  );

CREATE TRIGGER update_broadcasts_updated_at BEFORE UPDATE ON public.broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- AI INSIGHTS
-- =========================
CREATE TABLE public.ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'student',
  risk_level TEXT NOT NULL DEFAULT 'low',
  risk_score NUMERIC NOT NULL DEFAULT 0,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_insights_student ON public.ai_insights(student_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_insights TO authenticated;
GRANT ALL ON public.ai_insights TO service_role;

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage ai insights" ON public.ai_insights
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ai_insights_updated_at BEFORE UPDATE ON public.ai_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- GATE LOGS (QR scans)
-- =========================
CREATE TABLE public.gate_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_type TEXT NOT NULL DEFAULT 'student',
  person_code TEXT NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  direction TEXT NOT NULL DEFAULT 'in',
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scanned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_gate_logs_scanned_at ON public.gate_logs(scanned_at DESC);
CREATE INDEX idx_gate_logs_student ON public.gate_logs(student_id, scanned_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gate_logs TO authenticated;
GRANT ALL ON public.gate_logs TO service_role;

ALTER TABLE public.gate_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage gate logs" ON public.gate_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_gate_logs_updated_at BEFORE UPDATE ON public.gate_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();