
-- Create ramadan_day_videos table for multiple videos per day
CREATE TABLE public.ramadan_day_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_id integer NOT NULL REFERENCES public.ramadan_days(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  file_name text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ramadan_day_videos ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage day videos"
ON public.ramadan_day_videos
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Anyone can read
CREATE POLICY "Anyone can read day videos"
ON public.ramadan_day_videos
FOR SELECT
USING (true);
