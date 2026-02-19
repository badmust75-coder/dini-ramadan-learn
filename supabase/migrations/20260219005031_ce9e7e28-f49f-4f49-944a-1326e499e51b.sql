
-- Create attendance_records table
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late')),
  recorded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins can manage attendance"
ON public.attendance_records
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own attendance
CREATE POLICY "Users can view their own attendance"
ON public.attendance_records
FOR SELECT
USING (auth.uid() = user_id);

-- Users can view all attendance (for class overview with status only)
CREATE POLICY "Users can view all attendance records"
ON public.attendance_records
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_attendance_records_updated_at
BEFORE UPDATE ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
