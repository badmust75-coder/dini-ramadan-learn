
-- Add is_unlocked column to ramadan_days
ALTER TABLE public.ramadan_days ADD COLUMN IF NOT EXISTS is_unlocked BOOLEAN DEFAULT false;

-- Create ramadan_day_exceptions table for per-student unlocks
CREATE TABLE IF NOT EXISTS public.ramadan_day_exceptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day_id INTEGER NOT NULL REFERENCES public.ramadan_days(id) ON DELETE CASCADE,
  is_unlocked BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, day_id)
);

-- Enable RLS
ALTER TABLE public.ramadan_day_exceptions ENABLE ROW LEVEL SECURITY;

-- Admin can manage all exceptions
CREATE POLICY "Admins can manage day exceptions"
ON public.ramadan_day_exceptions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Users can read their own exceptions
CREATE POLICY "Users can read their own day exceptions"
ON public.ramadan_day_exceptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
