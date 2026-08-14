UPDATE public.attendance SET status = lower(status) WHERE status <> lower(status);

ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_status_check;

ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_status_check
  CHECK (status = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text]));